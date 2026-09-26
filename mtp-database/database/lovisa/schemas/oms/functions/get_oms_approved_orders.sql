--liquibase formatted sql
--changeset aman.pareek@impactanalytics.co:get_oms_approved_orders_v8 runOnChange:true stripComments:false splitStatements:false context:MTP-123504_1 labels:MTP-132085_1
--comment: DC filter on ooa.loc_code in WHERE (linked_store_codes stripped from PAF)

DROP FUNCTION IF EXISTS inventory_smart.get_oms_approved_orders(input refcursor, jsonb, date, date, jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.get_oms_approved_orders(input refcursor, jsonb, date, date, jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$

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
  v_loc_filter          text := '';
  v_product_filter_for_pa jsonb;
  product_filter        jsonb;
begin
  product_filter := COALESCE($2, '{}'::jsonb);
  IF jsonb_array_length((product_filter->'linked_store_codes')->0->'values') > 0 THEN
    SELECT ' AND dc.linked_store_code = ANY(ARRAY[' || string_agg(quote_literal(elem::text), ',') || ']::text[])'
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
WITH paf_data AS (
    SELECT distinct l4_name,style_name,vendor,vendor_id FROM global.product_attributes_filter ' || v_pa_sql || '
),
 pre_filtered_data AS MATERIALIZED (
    SELECT
 
        ooa.article,
        ooa.loc_code,
        ooa.order_quantity,
		
        
        ooa.order_status_id,
        ooa.expected_receipt_date,
        ooa.editable_expected_receipt_date AS editable_expected_receipt_date,
        
        ooa.order_placement_date,
        ooa.order_placement_recom_date,
        ooa.order_gen_type,
       
        ooa.id,
        ooa.order_reason,
		ooa.lead_time,
		ooa.order_type,
        
        paf.l4_name,
        paf.style_name,
     	paf.vendor,
		paf.vendor_id,
		dc.linked_store_code as dc_name,
		dc.name as dc_code,
		(ooa.editable_expected_receipt_date - COALESCE(clt.lead_time, 0))::date AS ex_factory_date,
		
        ooa.unit_cost * ooa.order_quantity AS order_cost,
		ooa.unit_cost,
        ooa.order_batch_name as order_batch_name,

		COALESCE(opm.oo + opm.it, 0) AS on_order,
		COALESCE(kpi.store_inv, 0) AS store_inv,
		COALESCE(kpi.dc_inv, 0) AS dc_inv,
		COALESCE(kpi.store_inv + kpi.dc_inv, 0) AS total_inv,		
		COALESCE(kpi.safety_stock, 0) AS safety_stock,
		COALESCE(kpi.min_order_quantity_sku, 0) AS min_order_quantity_sku,
		COALESCE(ooa.max_order_quantity_sku, 0) AS max_order_quantity_sku

    FROM 
        inventory_smart.oms_orders_approved ooa
    INNER JOIN 
        paf_data paf
    ON 
        ooa.product_code::varchar = paf.l4_name
    INNER JOIN 
        global.distribution_centres dc
    ON 
        ooa.loc_code = dc.linked_store_code AND NOT dc.is_deleted
	LEFT JOIN 
        inventory_smart.oms_kpi kpi
    ON 
        paf.l4_name = kpi.product_code AND ooa.loc_code = kpi.loc_code
	INNER JOIN 
        "global".fiscal_date_mapping fdm
    ON 
        ooa.order_placement_date = fdm.calendar_date
	LEFT JOIN 
        inventory_smart.oms_po_master opm
    ON 
        paf.l4_name = opm.product_code AND ooa.loc_code = opm.loc_code and fdm.fiscal_year_week = opm.fiscal_year_week
	LEFT JOIN 
        inventory_smart.oms_constraints_lead_time clt
    ON 
        ooa.article = clt.article AND ooa.loc_code = clt.loc_code AND clt.default_mode = 1
    WHERE 
        ooa.order_placement_date >= (CURRENT_DATE - interval ''28 day'')::date
        AND NOT ooa.is_deleted
        AND ooa.order_quantity IS NOT NULL
        AND ooa.unit_cost IS NOT NULL
        AND ooa.order_quantity > 0
        AND ooa.unit_cost > 0
        ' || v_loc_filter || '
),
--searched_data AS MATERIALIZED (
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
    FROM  pre_filtered_data
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
    MAX(order_gen_type_category) as order_gen_type_category,

	MAX(order_type) as order_type,
    MAX(lead_time) AS lead_time,
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
	MAX(vendor_id) AS vendor_code,
	MAX(dc_code) AS dc_code,
	MAX(ex_factory_date) AS ex_factory_date,
    MAX(min_order_quantity_sku) AS min_order_quantity_sku,
    MAX(max_order_quantity_sku) AS max_order_quantity_sku,

    ARRAY_AGG(
        jsonb_build_object(
            ''product_code'', l4_name,
			''article'',l4_name,
            --''size'', size,
            ''order_quantity'', order_quantity,
            ''unit_cost'',unit_cost,

            ''order_cost'', order_cost,
            ''order_status_id'',order_status_id,
			''unit_cost'',unit_cost,
            ''min_order_quantity_sku'', min_order_quantity_sku,
            ''max_order_quantity_sku'', max_order_quantity_sku,
            ''expected_receipt_date'', expected_receipt_date,
            ''editable_expected_receipt_date'', editable_expected_receipt_date,
            
            ''order_gen_type_category'', order_gen_type_category,
			''order_type'',order_type,
            ''id'', id,
            ''order_placement_date'', order_placement_date,

            ''on_order'',on_order,
            ''store_inv'', store_inv,
            ''dc_inv'', dc_inv,
			''total_inv'', total_inv,
			''lead_time'', lead_time,
            ''safety_stock'', safety_stock,
            ''order_batch_name'', order_batch_name,
            ''vendor'', vendor,
            ''vendor_code'', vendor_id,
            ''dc_code'', dc_code,
            ''ex_factory_date'', ex_factory_date

        ) 
	--ORDER BY size_order ' || v_order_direction || '
    ) AS product_details
    FROM categorized_data
GROUP BY 
    article, loc_code, dc_name, order_placement_date, expected_receipt_date, order_gen_type_category
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
