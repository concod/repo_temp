--liquibase formatted sql
--changeset nikhil.dhoot:get_oms_recommended_orders_v5 runOnChange:true stripComments:false splitStatements:false context:MTP-134734 labels:oms_recommended_orders_vs_3
--comment: DC filter via linked_store_codes on product filter ($2), same pattern as expedite / CNO

DROP FUNCTION IF EXISTS inventory_smart.get_oms_recommended_orders(input refcursor, jsonb, jsonb, integer[], jsonb, text, boolean, boolean);
CREATE OR REPLACE FUNCTION inventory_smart.get_oms_recommended_orders(input refcursor, jsonb, jsonb, integer[], jsonb, text, boolean, boolean)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$

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
  v_loc_filter              text := '';
  v_product_filter_for_pa   jsonb;
  product_filter            jsonb;
 begin
  product_filter := COALESCE($2, '{}'::jsonb);
  IF jsonb_array_length((product_filter->'linked_store_codes')->0->'values') > 0 THEN
    SELECT ' AND linked_store_code = ANY(ARRAY[' || string_agg(quote_literal(elem::text), ',') || ']::text[])'
      INTO v_loc_filter
      FROM jsonb_array_elements_text((product_filter->'linked_store_codes')->0->'values') AS elem;
  END IF;
  IF v_loc_filter IS NULL THEN
    v_loc_filter := '';
  END IF;
  v_product_filter_for_pa := product_filter - 'linked_store_codes';

   v_pa_sql :=inventory_smart.form_main_table_filters(
    'ph_master',
    v_product_filter_for_pa
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
--    IF v_size_sort IS NOT NULL AND v_size_sort->>'order' = 'desc' THEN
--        v_order_direction := 'DESC';
--    ELSE
--        v_order_direction := 'ASC';
--    END IF;

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
WITH base_oor_status AS MATERIALIZED (
    SELECT
        oor.order_group_id,
        oor.loc_code,
        oor.product_code,
        oor.article,
        oor.order_quantity,
        oor.unit_cost,
        oor.lead_time,
        oor.order_batch_name,
        oor.order_placement_date,
        oor.expected_receipt_date,
        oor.editable_expected_receipt_date,
        oor.order_type,
        oor.order_gen_type,
        oor.id,
        oor.order_status_id,
        oor.min_order_quantity_sku,
        oor.max_order_quantity_sku,
        oor.fiscal_year_week,
        oor.created_at
    FROM inventory_smart.oms_orders_recommended oor
    WHERE oor.order_status_id = ANY(''' || CONCAT($4) || '''::INTEGER[])
),
valid_groups AS MATERIALIZED (
    SELECT order_group_id, loc_code
    FROM base_oor_status
    GROUP BY order_group_id, loc_code
    HAVING SUM(order_quantity) > 0
),
filtered_oor AS MATERIALIZED (
    SELECT *
    FROM base_oor_status oor
    WHERE 1=1
        ' || v_curr_cycle_order || '
        ' || v_include_custom_order || '
        ' || v_date_filter || '
),
oor_keys AS MATERIALIZED (
    SELECT DISTINCT product_code, loc_code, fiscal_year_week
    FROM filtered_oor
),
filtered_paf AS MATERIALIZED (
    SELECT DISTINCT ON (paf.l4_name)
        paf.l4_name,
        paf.style_name,
        paf.vendor
    FROM global.product_attributes_filter paf ' || v_pa_sql || '
    AND EXISTS (
        SELECT 1
        FROM oor_keys ok
        WHERE ok.product_code = paf.l4_name
    )
    ORDER BY paf.l4_name, paf.style_name, paf.vendor
),
active_dc AS MATERIALIZED (
    SELECT DISTINCT
		dc.name as dc_name,
        dc.linked_store_code,
        dc.dc_code
    FROM global.distribution_centres dc
    WHERE NOT is_deleted
    ' || v_loc_filter || '
    ORDER BY linked_store_code, name
),
filtered_kpi AS MATERIALIZED (
    SELECT DISTINCT ON (kpi.product_code, kpi.loc_code)
        kpi.product_code,
        kpi.loc_code,
        kpi.store_inv,
        kpi.dc_inv,
        kpi.safety_stock
    FROM inventory_smart.oms_kpi kpi
    WHERE EXISTS (
        SELECT 1
        FROM oor_keys ok
        WHERE ok.product_code = kpi.product_code
          AND ok.loc_code = kpi.loc_code
    )
    ORDER BY kpi.product_code, kpi.loc_code, kpi.store_inv, kpi.dc_inv, kpi.safety_stock
),
filtered_opm AS MATERIALIZED (
    SELECT DISTINCT ON (opm.product_code, opm.loc_code, opm.fiscal_year_week)
        opm.product_code,
        opm.loc_code,
        opm.fiscal_year_week,
        opm.oo,
        opm.it
    FROM inventory_smart.oms_po_master opm
    WHERE EXISTS (
        SELECT 1
        FROM oor_keys ok
        WHERE ok.product_code = opm.product_code
          AND ok.loc_code = opm.loc_code
          AND ok.fiscal_year_week = opm.fiscal_year_week
    )
    ORDER BY opm.product_code, opm.loc_code, opm.fiscal_year_week, opm.oo, opm.it
),
pre_filtered_data AS (
    SELECT
        oor.article,
        oor.loc_code,
        oor.order_quantity,
		oor.order_quantity * oor.unit_cost AS order_cost,
        oor.lead_time,
        oor.order_batch_name,
        oor.order_placement_date,
        oor.expected_receipt_date,
        oor.editable_expected_receipt_date AS editable_expected_receipt_date,
        oor.expected_receipt_date AS dc_delivery_date,
		oor.order_type,
		oor.order_gen_type,
		oor.id,
		oor.order_status_id,
		oor.unit_cost,
		paf.style_name,
		paf.vendor,
        paf.l4_name,
		--paf.size,
		dc_name,
		COALESCE(opm.oo + opm.it, 0) AS on_order,
		COALESCE(kpi.store_inv, 0) AS store_inv,
		COALESCE(kpi.dc_inv, 0) AS dc_inv,
		COALESCE(kpi.store_inv + kpi.dc_inv, 0) AS total_inv,		
		COALESCE(kpi.safety_stock, 0) AS safety_stock,
		COALESCE(oor.min_order_quantity_sku, 0) AS min_order_quantity_sku,
		COALESCE(oor.max_order_quantity_sku, 0) AS max_order_quantity_sku
        --COALESCE(ast."order", 999999) AS size_order
    FROM 
        filtered_oor oor
    JOIN valid_groups vg
        ON oor.order_group_id = vg.order_group_id
       AND oor.loc_code = vg.loc_code
    INNER JOIN filtered_paf paf
        ON oor.product_code = paf.l4_name
    INNER JOIN active_dc dc
        ON oor.loc_code = dc.linked_store_code
    LEFT JOIN 
        filtered_kpi kpi
    ON 
        paf.l4_name = kpi.product_code AND oor.loc_code = kpi.loc_code
	LEFT JOIN 
        filtered_opm opm
    ON 
        paf.l4_name = opm.product_code AND oor.loc_code = opm.loc_code and oor.fiscal_year_week = opm.fiscal_year_week

--    LEFT JOIN (
--        SELECT l4_name, size, MIN("order") AS "order"
--        FROM inventory_smart.article_status_tag
--        GROUP BY l4_name, size
--    ) ast
--    ON ast.size = paf.size AND ast.l4_name = paf.l4_name

    WHERE 1=1
),
--searched_data AS (
--    SELECT * FROM pre_filtered_data
--    ' || v_size_search_cls || '
--),
categorized_data AS (
    SELECT 
        *,
        CASE 
            WHEN order_gen_type = ''Manual'' THEN ''Manual''  
            ELSE ''Other''
        END AS order_gen_type_category
    FROM pre_filtered_data
)
select * from (
SELECT
    article,
    loc_code,
	dc_name,
    max(order_batch_name) as order_batch_name,
	MAX(order_placement_date) AS order_placement_date,
	MAX(expected_receipt_date) AS expected_receipt_date,
    MAX(editable_expected_receipt_date) AS editable_expected_receipt_date,
    MAX(dc_delivery_date) AS dc_delivery_date,
    MAX(order_gen_type_category) as order_gen_type_category,
	MAX(order_type) as order_type,
    SUM(order_quantity) AS order_quantity,
    CONCAT(article, loc_code, order_placement_date, expected_receipt_date,  order_gen_type_category) AS order_id,
    SUM(order_cost) AS order_cost,
    MAX(order_status_id) AS order_status_id,
    MAX(unit_cost) as unit_cost,
	SUM(on_order) AS on_order,
    SUM(store_inv) AS store_inv,
	SUM(dc_inv) AS dc_inv,
	SUM(total_inv) AS total_inv,
    SUM(safety_stock) AS safety_stock,
    
    MAX(l4_name) AS l4_name,
	MAX(style_name) AS style_name,
	MAX(vendor) AS vendor,
	MAX(min_order_quantity_sku) as min_order_quantity_sku,
	MAX(max_order_quantity_sku) as max_order_quantity_sku,
    MAX(lead_time) as lead_time,
    ARRAY_AGG(
        jsonb_build_object(
            ''product_code'', l4_name,
			''article'',l4_name,
            --''size'', size,
            ''order_quantity'', order_quantity,
            
            ''order_cost'', order_cost,
            ''order_status_id'',order_status_id,
			''unit_cost'',unit_cost,
            ''min_order_quantity_sku'', min_order_quantity_sku,
            ''max_order_quantity_sku'', max_order_quantity_sku,
            ''expected_receipt_date'', expected_receipt_date,
            ''editable_expected_receipt_date'', editable_expected_receipt_date,
            ''dc_delivery_date'', dc_delivery_date,
            ''order_gen_type_category'', order_gen_type_category,
			''order_type'',order_type,
            ''id'', id,
            ''order_placement_date'', order_placement_date,

            ''on_order'',on_order,
            ''store_inv'', store_inv,
            ''dc_inv'', dc_inv,
			''total_inv'', total_inv,

            ''safety_stock'', safety_stock,
			''lead_time'', COALESCE(lead_time, 0),
            ''order_batch_name'', order_batch_name

        ) 
	--ORDER BY size_order ' || v_order_direction || '
    ) AS product_details
    FROM categorized_data
GROUP BY 
    article, loc_code, dc_name, order_placement_date, expected_receipt_date, order_gen_type_category) X
' || v_search_cls || '
' || v_sort_cls || '
' || v_limit_cls;

   raise notice 'v_recommended_orders_sql %',v_recommended_orders_sql;
   open $1 for execute v_recommended_orders_sql;
   RETURN v_recommended_orders_sql;
 end
 $function$
;
