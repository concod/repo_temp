--liquibase formatted sql
--changeset chandranil.ghosh@impactanalytics.co:get_oms_approved_orders_figs_3 runOnChange:true stripComments:false splitStatements:false context:MTP-93834 labels:MTP-80452_2
--comment: removed reconciliation_id 
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.get_oms_approved_orders(input refcursor, jsonb, date, date, jsonb);

CREATE OR REPLACE FUNCTION inventory_smart.get_oms_approved_orders(input refcursor, jsonb, date, date, jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
/*
  Get orders from the inventory_smart.oms_orders_approved as per product, ROP 
  Parameres :
              $1: Refcursor
              $2: Product Filter
              $3: ROP From Date
              $4: ROP To Date
              $5: Meta JSON for pagination

  
 Usage:
  select
     *
  from
      inventory_smart.get_oms_approved_orders(
      'my_cur',
      '{
          "l0_name": [{"type": "list","operator": "in", "values": ["101_BRIDAL"]}],
          "l1_name" : [],
          "l2_name" : [],
          "product_description" : [],
          "planning_ownership" : [],
          "merchandise_category" :[],
          "merchandise_brand": [],
          "vendor_code": [],
          "vendor_name": []
       }',
       '2023-1-07',
       '2023-1-25',
        '{
          "search": [],
          "sort": [],
          "range": [],
          "limit": {
                     "limit": 10,
                      "page": 2
                   }
      }'
     );
 fetch all in "my_cur";
 */
declare
  v_pa_sql                   text:='';
  v_approved_orders_sql      text:='';
    v_limit_cls              text := '';
   v_search_cls         	 text := '';
  v_sort_cls                 text := '';
   limit_json                jsonb := '{}';
   search_json          jsonb:= '{}'; 
  sort_json                  jsonb := '{}';
    new_sort_array        jsonb := '[]'::jsonb;
  size_sort_array       jsonb := '[]'::jsonb;
  new_search_array      jsonb := '[]'::jsonb;
  sort_array            jsonb := '[]'::jsonb;
  size_search_array     jsonb := '[]'::jsonb;
  search_array          jsonb := '[]'::jsonb;
  sort_item             jsonb := '{}';
  search_item           jsonb := '{}';
  size_search           jsonb := '{}';
  v_size_search_cls     text := '';
  v_size_sort           jsonb := NULL;
  v_order_direction     text := '';
begin
	
   v_pa_sql :=inventory_smart.form_main_table_filters(
    'ph_master',
    $2
  );
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
  if search_json <> '{}' and search_json -> 'search' is not null then
    search_array := search_json -> 'search';
    raise notice 'searched %', search_array;

    -- Iterate through search array elements
    for i in 0 .. jsonb_array_length(search_array) - 1 loop
      search_item := search_array -> i;
      if search_item ->> 'column' = 'size' then
        size_search_array := size_search_array || search_item;
      else
        new_search_array := new_search_array || search_item;
      end if;
    end loop;

    -- Update search_json with the new filtered search array
    search_json := jsonb_set(search_json, '{search}', new_search_array);
    raise notice 'size search array %', size_search_array;

    -- If any size search conditions exist, create a separate JSON object
    if jsonb_array_length(size_search_array) > 0 then
      size_search := jsonb_build_object('search', size_search_array);
    end if;
  end if;

  if size_search is not null and size_search <> '{}' then
    raise notice ' in size search %', size_search;
    v_size_search_cls := global.form_table_query(size_search);
  end if;

  if search_json <> '{}' then
      raise notice ' in final search %', search_json;
    v_search_cls := global.form_table_query(search_json);
  end if;

  if sort_json <> '{}' then
        raise notice ' in final sort %', sort_json;
    v_sort_cls := global.form_table_query(sort_json);
  end if;

v_approved_orders_sql := '
WITH pre_filtered_data AS MATERIALIZED (
    SELECT 
        ooa.article,
        ooa.loc_code,
        ooa.order_quantity,
        ooa.unit_cost,
        ooa.order_status_id,
        ooa.expected_receipt_date,
        ooa.editable_expected_receipt_date,
        ooa.order_placement_date,
        ooa.order_placement_recom_date,
        ooa.order_gen_type,
        COALESCE(ooa.min_order_quantity_sku, 0) AS min_order_quantity_sku,
        ooa.max_order_quantity_sku,
        ooa.id,
        ooa.order_reason,
        paf.product_code,
        paf.size,
        paf.l0_name,
        paf.l1_name,
        paf.l2_name,
        paf.l3_name,
        paf.l4_name,
        paf.vendor_desc,
		    paf.style_name,
        dc.is_deleted,
        ooa.unit_cost * ooa.order_quantity AS order_cost,
        ooa.order_batch_name as order_batch_name,
		COALESCE(kpi.system_inv, 0) AS system_inv,
		COALESCE(kpi.open_receipt_units, 0) AS open_receipt_units,
		COALESCE(kpi.safety_stock, 0) AS safety_stock,
    COALESCE(kpi.dc_inv, 0) AS dc_inv,
    COALESCE(kpi.store_inv, 0) AS store_inv,
		COALESCE(ooa.min_order_quantity_style, 0) AS min_order_quantity_style,
		COALESCE(ooa.max_order_quantity_style, 0) AS max_order_quantity_style,
		COALESCE(ooa.min_order_quantity_shipment, 0) AS min_order_quantity_shipment,
    COALESCE(ast."order", 999999) AS size_order,
    oor.order_to_po_processing_time AS order_to_po_processing_time,
    oor.editable_expected_receipt_date AS recommended_editable_expected_receipt_date,
    oor.order_multiple AS recommended_order_multiple,
    COALESCE(ootb.otb, 0) AS otb
    FROM 
        inventory_smart.oms_orders_approved ooa
    INNER JOIN 
        (SELECT * FROM global.product_attributes_filter ' || v_pa_sql || ') paf
    ON 
        ooa.product_code::varchar = paf.product_code
    INNER JOIN 
        global.distribution_centres dc
    ON 
        ooa.loc_code = dc.linked_store_code AND NOT dc.is_deleted
	LEFT JOIN 
        inventory_smart.oms_kpi kpi
    ON 
        paf.product_code = kpi.product_code AND ooa.loc_code = kpi.loc_code
    LEFT JOIN (
        SELECT product_code, size, MIN("order") AS "order"
        FROM inventory_smart.article_status_tag
        GROUP BY product_code, size
    ) ast
    ON ast.size = paf.size AND ast.product_code = paf.product_code
    LEFT JOIN
        inventory_smart.oms_orders_recommended oor
    ON 
        ooa.product_code = oor.product_code 
        AND ooa.loc_code = oor.loc_code
        AND ooa.order_placement_date = oor.order_placement_date
    INNER JOIN
        "global".fiscal_date_mapping fdm
    ON
        ooa.order_placement_date = fdm.calendar_date
    LEFT JOIN
        inventory_smart.oms_otb ootb ON oor.product_code = ootb.product_code AND oor.loc_code = ootb.loc_code AND oor.channel = ootb.channel AND fdm.fiscal_year_week = ootb.fiscal_year_week
    WHERE 
        ooa.order_placement_date >= (CURRENT_DATE - interval ''28 day'')::date
        AND NOT ooa.is_deleted
),
searched_data AS MATERIALIZED (
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
    FROM  searched_data
),
deduplicated_data AS (
  SELECT DISTINCT ON (article, loc_code, size, editable_expected_receipt_date, order_placement_date)
    *
  FROM categorized_data
  ORDER BY article, loc_code, size, editable_expected_receipt_date, order_placement_date, size_order  -- retain best version per size
)
select * from (
SELECT
    article,
    loc_code,
    MAX(order_batch_name) AS order_batch_name,
    SUM(order_quantity) AS order_quantity,
    CONCAT(article, loc_code, order_placement_date, expected_receipt_date, editable_expected_receipt_date, order_gen_type_category) AS order_id,
    SUM(order_cost) AS order_cost,
    MAX(order_status_id) AS order_status_id,
    MAX(expected_receipt_date) AS expected_receipt_date,
    MAX(editable_expected_receipt_date) AS editable_expected_receipt_date,
    MAX(order_placement_date) AS order_placement_date,
    MAX(order_placement_recom_date) AS order_placement_recom_date,
    SUM(system_inv) AS system_inv,
    SUM(dc_inv) AS dc_inv,
    SUM(store_inv) AS store_inv,
    SUM(safety_stock) AS safety_stock,
    SUM(open_receipt_units) AS open_receipt_units,
    MAX(l0_name) AS l0_name,
    MAX(l1_name) AS l1_name,
    MAX(l2_name) AS l2_name,
    MAX(l3_name) AS l3_name,
    MAX(l4_name) AS l4_name,
    MAX(vendor_desc) AS vendor_desc,
	  MAX(style_name) AS style_name,
    SUM(otb) as otb,
    ARRAY_AGG(
        jsonb_build_object(
            ''product_code'', product_code,
            ''size'', size,
            ''dc_inv'',dc_inv,
            ''store_inv'',store_inv,
            ''order_quantity'', order_quantity,
            ''unit_cost'', unit_cost,
            ''recommended_order_multiple'', recommended_order_multiple,
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
            ''order_to_po_processing_time'', order_to_po_processing_time,
            ''recommended_editable_expected_receipt_date'',recommended_editable_expected_receipt_date,
            ''order_batch_name'', order_batch_name,
            ''otb'', otb
      ) ORDER BY size_order ' || v_order_direction || '
    ) AS product_details
FROM deduplicated_data
GROUP BY 
    article, loc_code, order_placement_date, expected_receipt_date, order_gen_type_category, editable_expected_receipt_date ) X
' || v_search_cls || '
' || v_sort_cls || '
' || v_limit_cls;

  
  raise notice 'v_approved_orders_sql %',v_approved_orders_sql;
  open $1 for execute v_approved_orders_sql;
  RETURN $1;
end
$function$
;
