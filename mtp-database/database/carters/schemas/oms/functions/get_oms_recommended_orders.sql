--liquibase formatted sql
--changeset mssprakash.yashwanth@impactanalytics.co:oms_recommended_orders_carters_28 runOnChange:true stripComments:false splitStatements:false context:MTP-101413 labels:oms_recommended_orders_carters_28
--comment: Added order_quantity > 0 filter in pre_filtered_data CTE to exclude records with zero or negative order quantities
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.get_oms_recommended_orders(input refcursor, jsonb, jsonb, integer[], jsonb, text, boolean, boolean);
CREATE OR REPLACE FUNCTION inventory_smart.get_oms_recommended_orders(input refcursor, jsonb, jsonb, integer[], jsonb, text, boolean, boolean)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
 /*
   Get orders from the inventory_smart.oms_orders_recommended as per product, ROP and order status and type filters 
   Parameres :
               $1: Refcursor
               $2: Product Filter
               $3: Date filter
               $4: Order Status ID (source table: invebtory_smart.oms_order_status_master)
               $5: Meta JSON for pagination
               $6: Recommended(R)/All(A)
               $7: Include_custom_orders
               $8: Include only current cycle orders or all orders
   
  Usage:
  select
      *
   from
       inventory_smart.get_oms_recommended_orders(
       'my_cur',
       '{
           "l0_name": [{"type": "list","operator": "in", "values": ["101_BRIDAL"]}],
           "l1_name" : [],
           "l2_name" : [],
           "product_description" : [],
           "planning_ownership" : [],
           "merchandise_category" :[],
           "merchandise_brand": []
        }',
        '[{"attribute_name": "ROP", "start_date": "0001-01-01", "end_date": "9999-12-31"}, {"attribute_name": "recom_receipt_date", "start_date": "0001-01-01", "end_date": "9999-12-31"}]',
         0,
         '{
           "search": [],
           "sort": [],
           "range": [],
           "limit": {
                      "limit": 10,
                       "page": 2
                    }
       }',
       'R',
       0
      );
  fetch all in "my_cur";
 */
  declare
   v_pa_sql                  text:='';
   v_recommended_orders_sql  text:='';
   -- v_recom_filter            text:='';
   v_meta_cls                text:='';
   v_rop_filter              text:='';
   v_include_custom_order  	 text:='';
   v_date_filter             text:='';
   v_flow_filter             text:='';
   v_date_rec                record;
   v_curr_cycle_order        text:='';
   v_limit_cls              text := '';
   v_search_cls         	 text := '';
   v_sort_cls                 text := '';
   limit_json                jsonb := '{}';
   search_json          jsonb:= '{}'; 
  sort_json                  jsonb := '{}';
  _limit_exists              bool := false;
    new_sort_array            jsonb := '[]'::jsonb;
  size_sort_array           jsonb := '[]'::jsonb;
  new_search_array          jsonb := '[]'::jsonb;
  sort_array                jsonb := '[]'::jsonb;
  size_search_array         jsonb := '[]'::jsonb;
  search_array              jsonb := '[]'::jsonb;
  sort_item                 jsonb := '{}';
  search_item               jsonb := '{}';
  size_search               jsonb := '{}';
  v_size_search_cls         text := '';
  v_size_sort               jsonb := NULL;
  v_order_direction         text := '';
 begin
   v_pa_sql :=inventory_smart.form_main_table_filters(
    'ph_master',
    $2
  );
--    if $6  = 'R' 
--    then
--      v_recom_filter :='and oor.order_quantity > 0';
--    end if;
  search_json  = $5;
raise notice '%', $5;
SELECT ($5 ->> 'limit') IS NOT NULL INTO _limit_exists;
 if $5 <> '{}' and  $5 -> 'limit' is not null then
  	-- Extract the 'limit' object
    limit_json := $5 -> 'limit';
   	search_json := search_json - 'limit';
  	v_limit_cls := global.form_table_query(jsonb_build_object('limit', limit_json)) ;
  end if;

  IF search_json IS NOT NULL AND jsonb_typeof(search_json) = 'object' AND search_json <> '{}'::jsonb THEN
        -- Check if size is in sort array and remove it
        IF search_json->'sort' IS NOT NULL AND jsonb_array_length(search_json->'sort') > 0 THEN
            FOR i IN 0..jsonb_array_length(search_json->'sort')-1 LOOP
                IF (search_json->'sort'->i->>'column') = 'size' THEN
                    v_size_sort := search_json->'sort'->i;
                    -- Remove size from sort array
                    search_json := jsonb_set(
                        search_json,
                        '{sort}',
                        (search_json->'sort') - i
                    );
                    EXIT;
                END IF;
            END LOOP;
        END IF;
    END IF;

    -- Handle size sorting
  IF v_size_sort IS NOT NULL AND v_size_sort->>'order' = 'desc' THEN
      v_order_direction := 'DESC';
  ELSE
      v_order_direction := 'ASC';
  END IF;

  -- Process 'search' array
  IF search_json <> '{}' AND search_json -> 'search' IS NOT NULL THEN
    search_array := search_json -> 'search';
    raise notice 'searched %', search_array;

    -- Iterate through search array elements
    FOR i IN 0 .. jsonb_array_length(search_array) - 1 LOOP
      search_item := search_array -> i;
      IF search_item ->> 'column' = 'size' THEN
        size_search_array := size_search_array || search_item;
      ELSE
        new_search_array := new_search_array || search_item;
      END IF;
    END LOOP;

    -- Update search_json with the new filtered search array
    search_json := jsonb_set(search_json, '{search}', new_search_array);
    raise notice 'size search array %', size_search_array;

    -- If any size search conditions exist, create a separate JSON object
    IF jsonb_array_length(size_search_array) > 0 THEN
      size_search := jsonb_build_object('search', size_search_array);
    END IF;
  END IF;

  IF size_search IS NOT NULL AND size_search <> '{}' THEN
    raise notice ' in size search %', size_search;
    v_size_search_cls := global.form_table_query(size_search);
  END IF;

  if search_json <> '{}' then
    v_search_cls := global.form_table_query(search_json);
  end if;

  if sort_json <> '{}' then
    v_sort_cls := global.form_table_query(sort_json);
  end if;

  if not $7
  then 
   v_include_custom_order := 'and oor.order_gen_type in (''Recommended'',''Edited'',''Scenario'')';
  end if;

  if $8
  then
    v_curr_cycle_order := 'and oor.created_at >= (select max(created_at)::date from inventory_smart.oms_orders_recommended where order_gen_type=''Recommended'')';
  end if;
 
  for v_date_rec in select * from jsonb_to_recordset($3) as x(attribute_name text, "start_date" date, "end_date" date)
 	loop
 		v_date_filter := v_date_filter||' and oor.'||v_date_rec.attribute_name||' between ''' ||v_date_rec.start_date||''' and '''||v_date_rec.end_date||'''';
 	end loop;
   
  
   -- raise notice 'v_recom_filter %',v_recom_filter;

-- Updated Query
v_recommended_orders_sql := '
 WITH valid_groups AS materialized(
        SELECT oor.order_group_id, oor.channel
        FROM inventory_smart.oms_orders_recommended oor
        WHERE oor.order_status_id = ANY(''' || CONCAT($4) || '''::INTEGER[])
        GROUP BY oor.order_group_id, oor.channel
        HAVING SUM(oor.order_quantity) > 0
    ),
pre_filtered_data AS (
    SELECT
        oor.article,
		oor.style,
		oor.channel,
        oor.order_quantity,
        oor.unit_cost,
        oor.order_status_id,
        oor.expected_receipt_date,
        oor.editable_expected_receipt_date,
        oor.vendor_name,
        oor.order_placement_date,
		oor.order_placement_recom_date,
        oor.order_gen_type,
        oor.min_order_quantity_sku,
        oor.max_order_quantity_sku,
        oor.id,
        paf.product_code,
        paf.size,
        oor.order_batch_name as order_batch_name,
        oor.order_quantity * oor.unit_cost AS order_cost,
		COALESCE(kpi.system_inv, 0) AS system_inv,
		COALESCE(kpi.open_receipt_units, 0) AS open_receipt_units,
		COALESCE(kpi.safety_stock, 0) AS safety_stock,
		COALESCE(oor.min_order_quantity_style, 0) AS min_order_quantity_style,
		COALESCE(oor.max_order_quantity_style, 0) AS max_order_quantity_style,
		COALESCE(oor.min_order_quantity_shipment, 0) AS min_order_quantity_shipment,
        COALESCE(ast."order", 999999) AS size_order,
        oor.order_type,
        paf.style_description,
        paf.l0_name,
        paf.l2_name,
        paf.l3_name,
        paf.l4_name,
        paf.l5_name,
        paf.collection,
        paf.class,
        paf.season,
        oclt.lead_time,
        oclt.po_to_order_processing,
        coalesce(kpi.dc_inv, 0) as dc_inv,
        coalesce(kpi.store_inv, 0) as store_inv,
        COALESCE(oor.raw_roq, 0) as raw_roq,
        COALESCE(oor.ia_shipment_order_quantity, 0) as ia_shipment_order_quantity,
        COALESCE(oor.roq_unconstrained, 0) as roq_unconstrained,
        COALESCE(oor.roq_constrained, 0) as roq_constrained,
        COALESCE(ootb.otb, 0) AS otb
    FROM 
        inventory_smart.oms_orders_recommended oor
    INNER JOIN 
        (SELECT * FROM global.product_attributes_filter ' || v_pa_sql || ') paf
    ON
        oor.product_code = paf.product_code
    LEFT JOIN 
        inventory_smart.oms_kpi kpi
    ON 
        paf.product_code = kpi.product_code
    LEFT JOIN 
        inventory_smart.oms_constraints_safety_stock ocss
    ON 
        oor.article = ocss.article
    LEFT JOIN
        inventory_smart.oms_constraints_lead_time oclt
    ON
        oor.article = oclt.article
    LEFT JOIN
        inventory_smart.article_status_tag ast
    ON
        ast.size = paf.size AND ast.product_code = paf.product_code
    LEFT JOIN
        inventory_smart.oms_otb ootb
    ON
        oor.product_code = ootb.product_code
        AND oor.loc_code = ootb.loc_code
        AND oor.channel = ootb.channel
        AND oor.fiscal_year_week = ootb.fiscal_year_week
    JOIN valid_groups vg ON oor.order_group_id = vg.order_group_id AND oor.channel = vg.channel
    WHERE 
        oor.order_status_id = ANY(''' || CONCAT($4) || '''::INTEGER[])
        and oor.order_quantity > 0
        ' || v_curr_cycle_order || '
        ' || v_include_custom_order || '
        ' || v_date_filter || '
),
search_data AS (
    SELECT * FROM pre_filtered_data
    ' || v_size_search_cls || '
),

categorized_data AS (
    SELECT 
        *,
        CASE 
            WHEN order_gen_type = ''Manual'' THEN ''Manual''  
            ELSE ''Other''
        END AS order_gen_type_category
    FROM search_data
)
select * from (
SELECT
    article,
    SUM(raw_roq) AS raw_roq,
    max(order_batch_name) as order_batch_name,
    SUM(order_quantity) AS order_quantity,
    CONCAT(article, order_placement_date, order_placement_recom_date, expected_receipt_date, order_gen_type_category) AS order_id,
    round(SUM(coalesce(order_cost, 0))::numeric, 2) AS order_cost,
    MAX(order_status_id) AS order_status_id,
    MAX(expected_receipt_date) AS expected_receipt_date,
    MAX(editable_expected_receipt_date) AS editable_expected_receipt_date,
    MAX(vendor_name) AS vendor_name,
    MAX(order_placement_date) AS order_placement_date,
	SUM(system_inv) AS system_inv,
    SUM(safety_stock) AS safety_stock,
    SUM(open_receipt_units) AS open_receipt_units,
    MAX(style) AS style,
    MAX(channel) AS channel,
    MAX(order_type) AS order_type,
    MAX(l0_name) AS l0_name,
    MAX(l2_name) AS l2_name,
    STRING_AGG(DISTINCT l3_name, '', '') AS l3_name,
    STRING_AGG(DISTINCT l4_name, '', '') AS l4_name,
    STRING_AGG(DISTINCT l5_name, '', '') AS l5_name,
    STRING_AGG(DISTINCT collection, '', '') AS collection,
    STRING_AGG(DISTINCT class, '', '') AS class,
    STRING_AGG(DISTINCT season, '', '') AS season,
    MAX(style_description) AS style_description,
    MAX(lead_time) AS lead_time,
    MAX(po_to_order_processing) AS po_to_order_processing,
    max(coalesce(min_order_quantity_style, 0)) as min_order_quantity_style,
    sum(coalesce(dc_inv, 0)) as dc_inv,
    sum(coalesce(store_inv, 0)) as store_inv,
    sum(ia_shipment_order_quantity) as ia_shipment_order_quantity,
    sum(roq_unconstrained) as roq_unconstrained,
    sum(roq_constrained) as roq_constrained,
    sum(otb) as otb,
    ARRAY_AGG(
        jsonb_build_object(
            ''product_code'', product_code,
            ''size'', CASE 
                         WHEN NOT ' ||_limit_exists || ' THEN  concat('''''''',  size  , '''''''')'
                         'ELSE size
                     END,
            ''order_quantity'', order_quantity,
            ''unit_cost'', unit_cost,
            ''order_cost'', round(coalesce(order_cost::numeric, 0), 2),
            ''order_status_id'', order_status_id,
            ''min_order_quantity'', min_order_quantity_sku,
            ''max_order_quantity'', max_order_quantity_sku,
            ''expected_receipt_date'', expected_receipt_date,
            ''editable_expected_receipt_date'', editable_expected_receipt_date,
            ''order_gen_type_category'', order_gen_type_category,
            ''id'', id,
            ''vendor_name'', vendor_name,
            ''order_placement_date'', order_placement_date,
            ''system_inv'', system_inv,
            ''open_receipt_units'', open_receipt_units,
            ''safety_stock'', safety_stock,
            ''max_order_quantity_style'', max_order_quantity_style,
            ''min_order_quantity_shipment'', min_order_quantity_shipment,
            ''style'', style,
            ''style_description'', style_description,
            ''l0_name'', l0_name,
            ''l2_name'', l2_name,
            ''l3_name'', l3_name,
            ''l4_name'', l4_name,
            ''l5_name'', l5_name,
            ''collection'', collection,
            ''class'', class,
            ''season'', season,
            ''order_type'', order_type,
            ''lead_time'', lead_time,
            ''po_to_order_processing'', po_to_order_processing,
            ''store_inv'', store_inv,
            ''dc_inv'', dc_inv,
            ''raw_roq'', raw_roq,
            ''ia_shipment_order_quantity'', ia_shipment_order_quantity,
            ''roq_unconstrained'', roq_unconstrained,
            ''roq_constrained'', roq_constrained,
            ''otb'', otb,
            ''order_batch_name'', order_batch_name
        ) ORDER BY size_order ' || v_order_direction || '
    ) AS product_details
FROM categorized_data
GROUP BY 
    article, order_placement_date, expected_receipt_date, order_placement_recom_date ,order_gen_type_category, editable_expected_receipt_date ) X
' || v_search_cls || '
' || v_sort_cls || '
' || v_limit_cls;
   
   raise notice 'v_recommended_orders_sql %',v_recommended_orders_sql;
   open $1 for execute v_recommended_orders_sql;
   RETURN v_recommended_orders_sql;
 end
 $function$
;