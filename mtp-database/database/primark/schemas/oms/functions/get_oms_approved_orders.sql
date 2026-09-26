--liquibase formatted sql
--changeset nikhil.madhusudan@impactanalytics.co:oms_approved_summary_cb_33 runOnChange:true stripComments:false splitStatements:false context:MTP-129662_1 labels:MTP-132416_2
--comment: removed reconciliation_id
--rollback: SELECT 1
DROP FUNCTION IF EXISTS oms.get_oms_approved_orders(input refcursor, jsonb, date, date, jsonb);
DROP FUNCTION IF EXISTS oms.get_oms_approved_orders(input refcursor, jsonb,jsonb, date, date, jsonb);
CREATE OR REPLACE FUNCTION oms.get_oms_approved_orders(input refcursor, jsonb, jsonb, date, date, jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
/*
  Get orders from the inventory_smart.oms_orders_approved as per product, ROP 
  Parameres :
              $1: Refcursor
              $2: Product Filter
              $3: Store Filter
              $4: ROP From Date
              $5: ROP To Date
              $6: Meta JSON for pagination

  
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
      '{
          "store_name" : [],
          "store_city" : []
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
  v_sa_sql                   text:='';
  v_approved_orders_sql      text:='';
  v_date_filter              text:='';
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
  size_sort             jsonb := '{}';
  size_search           jsonb := '{}';
  v_size_search_cls     text := '';
  v_size_sort_cls       text := '';
begin
	
   v_pa_sql :=oms.form_main_table_filters(
    'ph_master',
    $2
  );
  v_sa_sql := oms.form_main_table_filters(
    'store_attributes_filter',
    $3
  );
search_json  = $6;
raise notice '%', $6;
 if $6 <> '{}' and  $6 -> 'limit' is not null then
  	-- Extract the 'limit' object
    limit_json := $6 -> 'limit';
   	search_json := search_json - 'limit';
  	v_limit_cls := global.form_table_query(jsonb_build_object('limit', limit_json)) ;
  end if;

  -- Remove and process 'sort'
  if search_json <> '{}' and search_json -> 'sort' is not null then
    sort_array := search_json -> 'sort';
    raise notice 'sorted array %', sort_array;

    -- Iterate through sort array elements
    for i in 0 .. jsonb_array_length(sort_array) - 1 loop
      sort_item := sort_array -> i;
      if sort_item ->> 'column' = 'size' then
        size_sort_array := size_sort_array || sort_item;
      else
        new_sort_array := new_sort_array || sort_item;
      end if;
    end loop;

    -- Update sort_json with the new filtered sort array
    sort_json := jsonb_set(sort_json, '{sort}', new_sort_array);

    -- If any size sort conditions exist, create a separate JSON object
    if jsonb_array_length(size_sort_array) > 0 then
      size_sort := jsonb_build_object('sort', size_sort_array);
    end if;
    search_json := search_json - 'sort';
  end if;

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

  if size_sort is not null and size_sort <> '{}' then
    raise notice ' in size sort %', size_sort;
    v_size_sort_cls := global.form_table_query(size_sort);
  end if;

  if search_json <> '{}' then
      raise notice ' in final search %', search_json;
    v_search_cls := global.form_table_query(search_json);
  end if;

  if sort_json <> '{}' then
        raise notice ' in final sort %', sort_json;
    v_sort_cls := global.form_table_query(sort_json);
  end if;

  if $4 is not null and $5 is not null then
    v_date_filter := ' and ooa.order_placement_date between ''' || $4 || ''' and ''' || $5 || '''';
  elsif $4 is not null then
    v_date_filter := ' and ooa.order_placement_date >= ''' || $4 || '''';
  elsif $5 is not null then
    v_date_filter := ' and ooa.order_placement_date <= ''' || $5 || '''';
  end if;

v_approved_orders_sql := '
WITH oor_dedup AS (
    SELECT
        product_code,
        loc_code,
        channel,
        expected_receipt_date,
        order_placement_date,
        MAX(unit_cost) AS unit_cost,
        MAX(elt_projected_store_inv) AS elt_projected_store_inv,
        MAX(elt_projected_bop) AS elt_projected_bop,
        MAX(safety_stock) AS safety_stock
    FROM
        oms.oms_orders_recommended
    GROUP BY
        product_code, loc_code, channel, expected_receipt_date, order_placement_date
),
opm_dedup AS (
    SELECT
        product_code,
        loc_code,
        channel,
        fiscal_year_week,
        SUM(COALESCE(oo, 0)) AS oo,
        SUM(COALESCE(it, 0)) AS it
    FROM
        oms.oms_po_master
    GROUP BY
        product_code, loc_code, channel, fiscal_year_week
),
otb_dedup AS (
    SELECT
        product_code,
        loc_code,
        channel,
        fiscal_year_week,
        SUM(COALESCE(otb, 0)) AS otb
    FROM
        oms.oms_otb
    GROUP BY
        product_code, loc_code, channel, fiscal_year_week
),
oclt_dedup AS (
    SELECT
        article,
        loc_code,
        MAX(lead_time) AS lead_time,
        MAX(manufacturing_lead_time) AS manufacturing_lead_time
    FROM
        oms.oms_constraints_lead_time
    GROUP BY
        article, loc_code
),
pre_filtered_data AS (
    SELECT 
        ooa.article,
        ooa.loc_code,
        ooa.pack_id,
        ooa.order_quantity_eaches,
        ooa.order_quantity,
        ooa.unit_cost,
        ooa.order_status_id,
        ooa.order_multiple,
        ooa.expected_receipt_date,
        ooa.editable_expected_receipt_date,
        ooa.order_placement_date,
        ooa.order_gen_type,
        ooa.min_order_quantity_sku,
        ooa.max_order_quantity_sku,
        ooa.id,
        paf.product_code,
        paf.product_description,
        paf.l0_name,
        paf.l1_name,
        paf.l2_name,
        paf.l3_name,
        paf.primary_vendor_name,
        paf.size,
        dc.is_deleted,
        oor.unit_cost as landing_unit_cost,
        oor.unit_cost * ooa.order_quantity_eaches AS order_cost,
        ooa.order_quantity_eaches * paf.price as order_retail, 
        ooa.order_type,
        ooa.order_batch_name,
		COALESCE(oor.elt_projected_store_inv, 0) + COALESCE(oor.elt_projected_bop, 0) AS system_inv,
		COALESCE(oor.elt_projected_store_inv, 0) AS store_inv,
		COALESCE(oor.elt_projected_bop, 0) AS dc_inv,
		COALESCE(oor.elt_projected_store_inv, 0) + COALESCE(oor.elt_projected_bop, 0) AS total_inventory,
		COALESCE(COALESCE(opm.oo, 0) + COALESCE(opm.it, 0), 0) AS open_receipt_units,
		COALESCE(oor.safety_stock, 0) AS safety_stock,
		COALESCE(ooa.min_order_quantity_style, 0) AS min_order_quantity_style,
		COALESCE(ooa.max_order_quantity_style, 0) AS max_order_quantity_style,
		COALESCE(ooa.min_order_quantity_shipment, 0) AS min_order_quantity_shipment,
		COALESCE(oclt.lead_time, 0) AS lead_time,
		COALESCE(oclt.manufacturing_lead_time, 0) AS manufacturing_lead_time,
		COALESCE(otb.otb, 0) AS otb
    FROM 
        oms.oms_orders_approved ooa
    INNER JOIN 
        (SELECT * FROM global.product_attributes_filter ' || v_pa_sql || ') paf
    ON 
        ooa.product_code::varchar = paf.product_code
    INNER JOIN 
        global.distribution_centres dc
    ON 
        ooa.loc_code = dc.linked_store_code AND NOT dc.is_deleted
    INNER JOIN
        (SELECT dc_code FROM global.store_attributes_filter ' || v_sa_sql || ') saf
    ON
        ooa.loc_code = saf.dc_code::text
    LEFT JOIN 
        oclt_dedup oclt
    ON
        ooa.article = oclt.article AND ooa.loc_code = oclt.loc_code
    LEFT JOIN 
        oor_dedup oor
    ON 
        ooa.product_code = oor.product_code 
        AND ooa.loc_code = oor.loc_code 
        AND ooa.channel = oor.channel
        AND ooa.expected_receipt_date = oor.expected_receipt_date
        AND ooa.order_placement_date = oor.order_placement_date
    INNER JOIN
        "global".fiscal_date_mapping fdm
    ON
        ooa.order_placement_date = fdm.calendar_date
    LEFT JOIN 
        otb_dedup otb
    ON
        ooa.product_code = otb.product_code AND ooa.loc_code = otb.loc_code AND ooa.channel = otb.channel AND fdm.fiscal_year_week = otb.fiscal_year_week
    LEFT JOIN 
        opm_dedup opm
    ON
        ooa.product_code = opm.product_code 
        AND ooa.loc_code = opm.loc_code 
        AND ooa.channel = opm.channel
        AND fdm.fiscal_year_week = opm.fiscal_year_week
    WHERE 
        NOT ooa.is_deleted
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
        CASE 
            WHEN order_gen_type = ''Manual'' THEN ''Manual''  
            ELSE ''Other''
        END AS order_gen_type_category
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
            WHEN COUNT(pack_id) FILTER (WHERE pack_id IS NOT NULL AND pack_id <> ''WP'' ) OVER (
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
        SUM(order_quantity) AS order_quantity,
        max(product_description) as product_description,
        max(l0_name) as l0_name,
        max(l1_name) as l1_name,
        max(l2_name) as l2_name,
        max(l3_name) as l3_name,
        max(primary_vendor_name) as primary_vendor_name,
        SUM(order_quantity_eaches) as order_quantity_eaches,
        CONCAT(article, loc_code, order_placement_date, expected_receipt_date, editable_expected_receipt_date, order_gen_type_category) AS order_id,
        SUM(order_cost) AS order_cost,
        SUM(order_retail) AS order_retail,
        MAX(order_status_id) AS order_status_id,
        MAX(order_multiple) AS order_multiple,
        MAX(expected_receipt_date) AS expected_receipt_date,
        MAX(editable_expected_receipt_date) AS editable_expected_receipt_date,
        MAX(order_placement_date) AS order_placement_date,
        SUM(system_inv) AS system_inv,
        SUM(store_inv) AS store_inv,
        SUM(dc_inv) AS dc_inv,
        MAX(order_type) AS order_type,
        MAX(order_gen_type_category) AS order_gen_type_category,
        MAX(min_order_quantity_style) AS min_order_quantity_style,
        MAX(max_order_quantity_style) AS max_order_quantity_style,
        SUM(safety_stock) AS safety_stock,
        SUM(open_receipt_units) AS open_receipt_units,
        MAX(order_batch_name) AS order_batch_name,
        COALESCE(ROUND((MAX(lead_time)::numeric / 7)::numeric, 2), 0) AS lead_time,
		    COALESCE(ROUND((MAX(manufacturing_lead_time)::numeric / 7)::numeric, 2), 0) AS manufacturing_lead_time,
        SUM(COALESCE(otb, 0)) AS otb,
        CASE 
            WHEN BOOL_OR(is_pack_enabled) THEN ''View Pack Details''
            ELSE ''-''
        END AS size_column,
        (
            SELECT jsonb_agg(
                jsonb_build_object(
                    ''product_code'', pd.product_code,
                    ''order_quantity'', pd.order_quantity,
                    ''order_quantity_eaches'', pd.order_quantity_eaches,
                    ''unit_cost'', pd.unit_cost,
                    ''order_cost'', pd.order_cost,
                    ''order_retail'', pd.order_retail,
                    ''order_status_id'', pd.order_status_id,
                    ''min_order_quantity'', pd.min_order_quantity_sku,
                    ''max_order_quantity'', pd.max_order_quantity_sku,
                    ''expected_receipt_date'', pd.expected_receipt_date,
                    ''editable_expected_receipt_date'', pd.editable_expected_receipt_date,
                    ''order_gen_type_category'', pd.order_gen_type_category,
                    ''ids'', pd.ids,
                    ''order_placement_date'', pd.order_placement_date,
                    ''system_inv'', pd.system_inv,
                    ''open_receipt_units'', pd.open_receipt_units,
                    ''safety_stock'', pd.safety_stock,
                    ''min_order_quantity_style'', pd.min_order_quantity_style,
                    ''max_order_quantity_style'', pd.max_order_quantity_style,
                    ''min_order_quantity_shipment'', pd.min_order_quantity_shipment,
                    ''order_batch_name'', pd.order_batch_name,
                    ''otb'', pd.otb,
                    ''size_column'', 
                        CASE 
                            WHEN BOOL_OR(is_pack_enabled) THEN pd.pack_id
                            ELSE pd.size
                        END
                )
            )
            FROM (
                SELECT
                    pack_grouping_key as pack_id,
                    MIN(product_code) AS product_code,
                    CASE 
                        WHEN BOOL_OR(is_pack_enabled) THEN SUM(DISTINCT order_quantity)
                        ELSE SUM(order_quantity)
                    END AS order_quantity,
                    SUM(order_quantity_eaches) AS order_quantity_eaches,
                    MIN(unit_cost) AS unit_cost,
                    SUM(order_cost) AS order_cost,
                    SUM(order_retail) AS order_retail,
                    MAX(order_status_id) AS order_status_id,
                    MAX(order_multiple) AS order_multiple,
                    MIN(min_order_quantity_sku) AS min_order_quantity_sku,
                    MAX(max_order_quantity_sku) AS max_order_quantity_sku,
                    MAX(expected_receipt_date) AS expected_receipt_date,
                    MAX(editable_expected_receipt_date) AS editable_expected_receipt_date,
                    MAX(order_gen_type_category) AS order_gen_type_category,
                    ARRAY_AGG(DISTINCT id) AS ids,
                    MAX(order_placement_date) AS order_placement_date,
                    SUM(system_inv) AS system_inv,
                    SUM(store_inv) AS store_inv,
                    SUM(dc_inv) AS dc_inv,
                    SUM(open_receipt_units) AS open_receipt_units,
                    SUM(safety_stock) AS safety_stock,
                    MAX(min_order_quantity_style) AS min_order_quantity_style,
                    MAX(max_order_quantity_style) AS max_order_quantity_style,
                    MAX(min_order_quantity_shipment) AS min_order_quantity_shipment,
                    MIN(size) AS size,
                    MAX(order_batch_name) AS order_batch_name,
                    MAX(lead_time) AS lead_time,
                    MAX(manufacturing_lead_time) AS manufacturing_lead_time,
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

  
  raise notice 'v_approved_orders_sql %',v_approved_orders_sql;
  open $1 for execute v_approved_orders_sql;
  RETURN $1;
end
$function$
;