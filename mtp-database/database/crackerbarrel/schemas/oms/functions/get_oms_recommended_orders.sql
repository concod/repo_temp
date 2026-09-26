--liquibase formatted sql
--changeset mssprakash.yashwanth@impactanalytics.co:oms_recommended_orders_cb_38 runOnChange:true stripComments:false splitStatements:false context:MTP-104790 labels:MTP-104790
--comment: removed case statement for order_type
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
  size_sort                 jsonb := '{}';
  size_search               jsonb := '{}';
  v_size_search_cls         text := '';
  v_size_sort_cls           text := '';
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
 if $5 <> '{}' and  $5 -> 'limit' is not null then
  	-- Extract the 'limit' object
    limit_json := $5 -> 'limit';
   	search_json := search_json - 'limit';
  	v_limit_cls := global.form_table_query(jsonb_build_object('limit', limit_json)) ;
  end if;

  -- Remove and process 'sort'
  IF search_json <> '{}' AND search_json -> 'sort' IS NOT NULL THEN
    sort_array := search_json -> 'sort';
    raise notice 'sorted array %', sort_array;

    -- Iterate through sort array elements
    FOR i IN 0 .. jsonb_array_length(sort_array) - 1 LOOP
      sort_item := sort_array -> i;
      IF sort_item ->> 'column' = 'size' THEN
        size_sort_array := size_sort_array || sort_item;
      ELSE
        new_sort_array := new_sort_array || sort_item;
      END IF;
    END LOOP;

    -- Update sort_json with the new filtered sort array
    sort_json := jsonb_set(sort_json, '{sort}', new_sort_array);

    -- If any size sort conditions exist, create a separate JSON object
    IF jsonb_array_length(size_sort_array) > 0 THEN
      size_sort := jsonb_build_object('sort', size_sort_array);
    END IF;
    search_json := search_json - 'sort';
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

  IF size_sort IS NOT NULL AND size_sort <> '{}' THEN
    raise notice ' in size sort %', size_sort;
    v_size_sort_cls := global.form_table_query(size_sort);
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
        oor.pack_id,
        oor.order_quantity_eaches,
        oor.order_quantity,
        oor.unit_cost,
        oor.order_status_id,
        oor.expected_receipt_date,
        oor.editable_expected_receipt_date,
        oor.order_placement_date,
        oor.order_gen_type,
        oor.order_multiple,
        oor.min_order_quantity_sku,
        oor.max_order_quantity_sku,
        oor.id,
        oor.order_type,
        paf.product_code,
        paf.product_description,
        paf.primary_trait_desc,
        paf.l2_name,
        paf.l3_name,
        paf.l4_name,
        paf.l5_name,
        paf.product_attribute_8,
        paf.primary_vendor_name,
        paf.size,
        dc.is_deleted,
        oor.unit_cost as landing_unit_cost,
        oor.unit_cost * oor.order_quantity_eaches AS order_cost,
        oor.order_quantity_eaches * paf.price as order_retail, 
        oor.order_batch_name as order_batch_name,
        COALESCE(oor.elt_projected_store_inv, 0) + COALESCE(oor.elt_projected_bop, 0) AS system_inv,
        COALESCE(oor.elt_projected_bop, 0) AS dc_inv,
        COALESCE(oor.elt_projected_store_inv, 0) AS store_inv,
        COALESCE(COALESCE(opm.oo, 0) + COALESCE(opm.it, 0), 0) AS open_receipt_units,
        COALESCE(oor.safety_stock, 0) AS safety_stock,
        COALESCE(oor.min_order_quantity_style, 0) AS min_order_quantity_style,
        COALESCE(oor.max_order_quantity_style, 0) AS max_order_quantity_style,
        COALESCE(oor.min_order_quantity_shipment, 0) AS min_order_quantity_shipment,
        COALESCE(oor.pack_config, 1) AS pack_config,
        COALESCE(oclt.lead_time, 0) AS lead_time,
        COALESCE(oor.elt_projected_store_inv, 0) + COALESCE(oor.elt_projected_bop, 0) AS total_inventory,
        COALESCE(oclt.manufacturing_lead_time, 0) AS manufacturing_lead_time,
        COALESCE(otb.otb, 0) AS otb
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
    LEFT JOIN 
        inventory_smart.oms_constraints_lead_time oclt
    ON
        oor.article = oclt.article AND oor.loc_code = oclt.loc_code
    LEFT JOIN 
        inventory_smart.oms_po_master opm
    ON
        oor.product_code = opm.product_code AND oor.loc_code = opm.loc_code AND oor.fiscal_year_week = opm.fiscal_year_week
    LEFT JOIN 
        inventory_smart.oms_otb otb
    ON
        oor.product_code = otb.product_code AND oor.loc_code = otb.loc_code AND oor.channel = otb.channel AND oor.fiscal_year_week = otb.fiscal_year_week
    JOIN valid_groups vg ON oor.order_group_id = vg.order_group_id AND oor.loc_code = vg.loc_code
    WHERE 
        oor.order_status_id = ANY(''' || CONCAT($4) || '''::INTEGER[])
        ' || v_curr_cycle_order || '
        ' || v_include_custom_order || '
        ' || v_date_filter || '
),
sorted_data AS (
    SELECT * FROM pre_filtered_data
    ' || v_size_search_cls || '
    ' || v_size_sort_cls || '
),
ranked_data AS (
    SELECT 
        *, 
        ROW_NUMBER() OVER () AS row_num  -- Add row number after sorting
    FROM sorted_data
),
categorized_data AS (
    SELECT 
        *,
        order_gen_type AS order_gen_type_category
    FROM ranked_data
),
categorized_with_grouping_key AS (
    SELECT
        *,
        CASE
            WHEN COUNT(pack_id) FILTER (WHERE pack_id IS NOT NULL AND pack_id <> ''WP'') OVER (
                PARTITION BY article, loc_code, order_placement_date, expected_receipt_date, editable_expected_receipt_date, order_gen_type_category
            ) > 0 THEN TRUE
            ELSE FALSE
        END AS is_pack_enabled,
        CASE
            WHEN COUNT(pack_id) FILTER (WHERE pack_id IS NOT NULL AND pack_id <> ''WP'') OVER (
                PARTITION BY article, loc_code, order_placement_date, expected_receipt_date, editable_expected_receipt_date, order_gen_type_category
            ) > 0 THEN pack_id
            ELSE size
        END AS pack_grouping_key
    FROM categorized_data
)
select * from (
    SELECT
        article,
        loc_code,
        COALESCE(ROUND((MAX(lead_time)::numeric / 7)::numeric, 2), 0) AS lead_time,
		    COALESCE(ROUND((MAX(manufacturing_lead_time)::numeric / 7)::numeric, 2), 0) AS manufacturing_lead_time,
        max(product_description) as product_description,
        max(primary_trait_desc) as primary_trait_desc,
        max(l2_name) as l2_name,
        max(l3_name) as l3_name,
        max(l4_name) as l4_name,
        max(l5_name) as l5_name,
        max(product_attribute_8) as product_attribute_8,
        max(primary_vendor_name) as primary_vendor_name,
        max(order_batch_name) as order_batch_name,
        SUM(DISTINCT order_quantity) as order_quantity,
        SUM(order_quantity_eaches) as order_quantity_eaches,
        CONCAT(article, loc_code, order_placement_date, expected_receipt_date, editable_expected_receipt_date, order_gen_type_category) AS order_id,
        SUM(order_cost) AS order_cost,
        SUM(order_retail) AS order_retail,
        MAX(landing_unit_cost) AS landing_unit_cost,
        MAX(order_status_id) AS order_status_id,
		    AVG(order_multiple) AS order_multiple,
        MAX(expected_receipt_date) AS expected_receipt_date,
        MAX(editable_expected_receipt_date) AS editable_expected_receipt_date,
        MAX(order_placement_date) AS order_placement_date,
        SUM(system_inv) AS system_inv,
		    SUM(store_inv) AS store_inv,
		    SUM(dc_inv) AS dc_inv,
        SUM(safety_stock) AS safety_stock,
        MAX(order_gen_type_category) AS order_gen_type_category,
        MAX(order_type) AS order_type,
        MAX(min_order_quantity_style) AS min_order_quantity_style,
        MAX(max_order_quantity_style) AS max_order_quantity_style,
        SUM(open_receipt_units) AS open_receipt_units,
        SUM(COALESCE(otb, 0)) AS otb,
        CASE 
            WHEN BOOL_OR(is_pack_enabled) THEN ''View Pack Details''
            ELSE ''''  
        END AS size_column,
        (
            SELECT jsonb_agg(
                jsonb_build_object(
                    ''product_code'', pd.product_code,
                    ''order_quantity'', pd.order_quantity,
                    ''order_quantity_eaches'', pd.order_quantity_eaches,
                    ''unit_cost'', pd.unit_cost,
                    ''landing_unit_cost'', pd.landing_unit_cost,
                    ''order_cost'', pd.order_cost,
                    ''order_status_id'', pd.order_status_id,
                    ''min_order_quantity'', pd.min_order_quantity_sku,
                    ''max_order_quantity'', pd.max_order_quantity_sku,
                    ''expected_receipt_date'', pd.expected_receipt_date,
                    ''editable_expected_receipt_date'', pd.editable_expected_receipt_date,
                    ''order_gen_type_category'', pd.order_gen_type_category,
                    ''id'', pd.ids,
                    ''otb'', pd.otb,
                    ''order_placement_date'', pd.order_placement_date,
                    ''system_inv'', pd.system_inv,
                    ''store_inv'', pd.store_inv,
                    ''dc_inv'', pd.dc_inv,
                    ''open_receipt_units'', pd.open_receipt_units,
                    ''safety_stock'', pd.safety_stock,
                    ''min_order_quantity_style'', pd.min_order_quantity_style,
                    ''max_order_quantity_style'', pd.max_order_quantity_style,
                    ''min_order_quantity_shipment'', pd.min_order_quantity_shipment,
                    ''order_batch_name'', pd.order_batch_name,
                    ''size_column'', 
                        CASE 
                            WHEN pd.pack_id IS NOT NULL AND pd.pack_id <> ''WP'' THEN pd.pack_id
                            ELSE pd.size
                        END,
                    ''pack_config'', pd.pack_config
                )
            )
            FROM (
                SELECT
                    pack_grouping_key as pack_id,
                    MIN(product_code) AS product_code,
                    SUM(DISTINCT order_quantity) as order_quantity,
                    SUM(order_quantity_eaches) AS order_quantity_eaches,
                    MIN(unit_cost) AS unit_cost,
                    MIN(landing_unit_cost) AS landing_unit_cost,
                    SUM(order_cost) AS order_cost,
                    SUM(order_retail) AS order_retail,
                    MAX(order_status_id) AS order_status_id,
                    MIN(min_order_quantity_sku) AS min_order_quantity_sku,
                    MAX(max_order_quantity_sku) AS max_order_quantity_sku,
                    MAX(expected_receipt_date) AS expected_receipt_date,
                    MAX(editable_expected_receipt_date) AS editable_expected_receipt_date,
                    MAX(order_gen_type_category) AS order_gen_type_category,
					          AVG(order_multiple) AS order_multiple,
                    ARRAY_AGG(DISTINCT id) AS ids,
                    MAX(order_placement_date) AS order_placement_date,
                    SUM(system_inv) AS system_inv,
					          SUM(dc_inv) AS dc_inv,
					          SUM(store_inv) AS store_inv,
                    SUM(open_receipt_units) AS open_receipt_units,
                    SUM(safety_stock) AS safety_stock,
                    MAX(min_order_quantity_style) AS min_order_quantity_style,
                    MAX(max_order_quantity_style) AS max_order_quantity_style,
                    MAX(min_order_quantity_shipment) AS min_order_quantity_shipment,
                    MIN(size) AS size,
                    MAX(order_batch_name) AS order_batch_name,
                    SUM(pack_config) AS pack_config,
                    MAX(COALESCE(otb, 0)) AS otb
                FROM categorized_with_grouping_key cd2
                WHERE cd2.article = categorized_with_grouping_key.article
                  AND cd2.loc_code = categorized_with_grouping_key.loc_code
                  AND cd2.order_placement_date = categorized_with_grouping_key.order_placement_date
                  AND cd2.expected_receipt_date = categorized_with_grouping_key.expected_receipt_date
                  AND cd2.editable_expected_receipt_date = categorized_with_grouping_key.editable_expected_receipt_date
                  AND cd2.order_gen_type_category = categorized_with_grouping_key.order_gen_type_category
                GROUP BY pack_grouping_key
            ) pd
        ) AS product_details
    FROM categorized_with_grouping_key
    GROUP BY 
        article, loc_code, order_placement_date, expected_receipt_date, order_gen_type_category, editable_expected_receipt_date
) X
' || v_search_cls || '
' || v_sort_cls || '
' || v_limit_cls;

   raise notice 'v_recommended_orders_sql %',v_recommended_orders_sql;
   open $1 for execute v_recommended_orders_sql;
   RETURN v_recommended_orders_sql;
 end
 $function$
;