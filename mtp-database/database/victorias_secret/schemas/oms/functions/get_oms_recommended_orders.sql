--liquibase formatted sql
--changeset mssprakash.yashwanth@impactanalytics.co:get_oms_recommended_orders_vs_2 runOnChange:true stripComments:false splitStatements:false context:MTP-108671 labels:MTP-108671
--comment: Updated to use global.form_main_table_filters to fix product_codes column error

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
  --  v_recom_filter            text:='';
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
   v_pa_sql :=global.form_main_table_filters(
    'product_attributes_filter',
    $2
  );
  --  if $6  = 'R' 
  --  then
  --    v_recom_filter :='and oor.order_quantity > 0';
  --  end if;
  search_json  = $5;
raise notice '%', $5;
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
    SELECT oor.order_group_id, oor.loc_code
    FROM inventory_smart.oms_orders_recommended oor
    WHERE oor.order_status_id = ANY(''' || CONCAT($4) || '''::INTEGER[])
    GROUP BY oor.order_group_id, oor.loc_code
    HAVING SUM(oor.order_quantity) > 0
),
pre_filtered_data AS (
    SELECT
        oor.article,
        oor.loc_code,
        oor.order_quantity,
        oor.unit_cost,
        oor.order_status_id,
        oor.expected_receipt_date,
        oor.editable_expected_receipt_date,
        oor.order_placement_date,
        oor.order_placement_recom_date,
        oor.order_gen_type,
        oor.min_order_quantity_sku,
        oor.max_order_quantity_sku,
        oor.id,
        paf.product_code,
        paf.size,
        paf.l0_name,
        paf.l1_name,
        paf.l2_name,
        paf.l3_name,
        paf.l4_name,
        paf.l5_name,
        paf.l6_name,
        paf.masterstyle_descr,
        paf.subbrand_description,
        paf.product_lifecycle,
        paf.collection,
        paf.color,
        paf.subbrand_code_desc,
        paf.current_assortment_group,
        paf.flex_style,
        paf.generic,
        paf.sizes_mat,
        paf.form,
        paf.user_defined_1,
        paf.user_defined_2,
        paf.user_defined_3,
        paf.user_defined_4,
        paf.user_defined_5,
        paf.user_defined_6,
        dc.is_deleted,
        oor.order_quantity * oor.unit_cost AS order_cost,
        oor.order_batch_name as order_batch_name,
		COALESCE(kpi.system_inv, 0) AS system_inv,
		COALESCE(kpi.open_receipt_units, 0) AS open_receipt_units,
		COALESCE(kpi.safety_stock, 0) AS safety_stock,
		COALESCE(oor.min_order_quantity_style, 0) AS min_order_quantity_style,
		COALESCE(oor.max_order_quantity_style, 0) AS max_order_quantity_style,
		COALESCE(oor.min_order_quantity_shipment, 0) AS min_order_quantity_shipment,
        COALESCE(ast."order", 999999) AS size_order,
        COALESCE(ootb.otb, 0) AS otb
    FROM 
        inventory_smart.oms_orders_recommended oor
    INNER JOIN 
        (SELECT * FROM global.product_attributes_filter ' || v_pa_sql || ') paf
    ON 
        oor.product_code = paf.product_code
    INNER JOIN 
        global.distribution_centres dc
    ON 
        oor.loc_code = dc.linked_store_code AND NOT dc.is_deleted
    LEFT JOIN 
        inventory_smart.oms_kpi kpi
    ON 
        paf.product_code = kpi.product_code AND oor.loc_code = kpi.loc_code
    LEFT JOIN 
        inventory_smart.oms_constraints_safety_stock ocss
    ON 
        oor.article = ocss.article AND oor.loc_code = ocss.loc_code
    LEFT JOIN (
        SELECT product_code, size, MIN("order") AS "order"
        FROM inventory_smart.article_status_tag
        GROUP BY product_code, size
    ) ast
    ON ast.size = paf.size AND ast.product_code = paf.product_code
    LEFT JOIN
        inventory_smart.oms_otb ootb
    ON
        oor.product_code = ootb.product_code
        AND oor.loc_code = ootb.loc_code
        AND oor.channel = ootb.channel
        AND oor.fiscal_year_week = ootb.fiscal_year_week
    JOIN valid_groups vg ON oor.order_group_id = vg.order_group_id AND oor.loc_code = vg.loc_code
    WHERE 
        oor.order_status_id = ANY(''' || CONCAT($4) || '''::INTEGER[])
        ' || v_curr_cycle_order || '
        ' || v_include_custom_order || '
        ' || v_date_filter || '
),
searched_data AS (
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
    FROM searched_data
)
select * from (
SELECT
    article,
    loc_code,
    max(order_batch_name) as order_batch_name,
    SUM(order_quantity) AS order_quantity,
    CONCAT(article, loc_code, order_placement_date, expected_receipt_date, editable_expected_receipt_date, order_gen_type_category) AS order_id,
    SUM(order_cost) AS order_cost,
    MAX(order_status_id) AS order_status_id,
    MAX(expected_receipt_date) AS expected_receipt_date,
    MAX(editable_expected_receipt_date) AS editable_expected_receipt_date,
    MAX(order_placement_date) AS order_placement_date,
    MAX(order_placement_recom_date) AS order_placement_recom_date,
    SUM(system_inv) AS system_inv,
    SUM(safety_stock) AS safety_stock,
    SUM(open_receipt_units) AS open_receipt_units,
    MAX(l0_name) AS l0_name,
    MAX(l1_name) AS l1_name,
    MAX(l2_name) AS l2_name,
    MAX(l3_name) AS l3_name,
    MAX(l4_name) AS l4_name,
    MAX(l5_name) AS l5_name,
    MAX(l6_name) AS l6_name,
    MAX(masterstyle_descr) AS masterstyle_descr,
    MAX(subbrand_description) AS subbrand_description,
    MAX(product_lifecycle) AS product_lifecycle,
    MAX(collection) AS collection,
    MAX(color) AS color,
    MAX(subbrand_code_desc) AS subbrand_code_desc,
    MAX(current_assortment_group) AS current_assortment_group,
    MAX(flex_style) AS flex_style,
    MAX(generic) AS generic,
    MAX(sizes_mat) AS sizes_mat,
    MAX(form) AS form,
    MAX(user_defined_1) AS user_defined_1,
    MAX(user_defined_2) AS user_defined_2,
    MAX(user_defined_3) AS user_defined_3,
    MAX(user_defined_4) AS user_defined_4,
    MAX(user_defined_5) AS user_defined_5,
    MAX(user_defined_6) AS user_defined_6,
    sum(coalesce(otb, 0)) as otb,
    ARRAY_AGG(
        jsonb_build_object(
            ''product_code'', product_code,
            ''size'', size,
            ''order_quantity'', order_quantity,
            ''unit_cost'', unit_cost,
            ''order_cost'', order_cost,
            ''order_status_id'', order_status_id,
            ''min_order_quantity'', min_order_quantity_sku,
            ''max_order_quantity'', max_order_quantity_sku,
            ''expected_receipt_date'', expected_receipt_date,
            ''editable_expected_receipt_date'', editable_expected_receipt_date,
            ''order_gen_type_category'', order_gen_type_category,
            ''id'', id,
            ''order_placement_date'', order_placement_date,
            ''order_placement_recom_date'', order_placement_recom_date,
            ''system_inv'', system_inv,
            ''open_receipt_units'', open_receipt_units,
            ''safety_stock'', safety_stock,
            ''min_order_quantity_style'', min_order_quantity_style,
            ''max_order_quantity_style'', max_order_quantity_style,
            ''min_order_quantity_shipment'', min_order_quantity_shipment,
            ''l0_name'', l0_name,
            ''l1_name'', l1_name,
            ''l2_name'', l2_name,
            ''l3_name'', l3_name,
            ''l4_name'', l4_name,
            ''l5_name'', l5_name,
            ''l6_name'', l6_name,
            ''masterstyle_descr'', masterstyle_descr,
            ''subbrand_description'', subbrand_description,
            ''product_lifecycle'', product_lifecycle,
            ''collection'', collection,
            ''color'', color,
            ''subbrand_code_desc'', subbrand_code_desc,
            ''current_assortment_group'', current_assortment_group,
            ''flex_style'', flex_style,
            ''generic'', generic,
            ''sizes_mat'', sizes_mat,
            ''form'', form,
            ''user_defined_1'', user_defined_1,
            ''user_defined_2'', user_defined_2,
            ''user_defined_3'', user_defined_3,
            ''user_defined_4'', user_defined_4,
            ''user_defined_5'', user_defined_5,
            ''user_defined_6'', user_defined_6,
            ''order_batch_name'', order_batch_name,
            ''otb'', otb
        ) ORDER BY size_order ' || v_order_direction || '
    ) AS product_details
    FROM categorized_data
GROUP BY 
    article, loc_code, order_placement_date, expected_receipt_date, order_gen_type_category, editable_expected_receipt_date) X
' || v_search_cls || '
' || v_sort_cls || '
' || v_limit_cls;

   raise notice 'v_recommended_orders_sql %',v_recommended_orders_sql;
   open $1 for execute v_recommended_orders_sql;
   RETURN v_recommended_orders_sql;
 end
 $function$
;