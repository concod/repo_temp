--liquibase formatted sql
--changeset chandranil.ghosh@imapactanalytics.co:get_oms_alert_pending_orders_details_updated_distinct_po_count_4 runOnChange:true stripComments:false splitStatements:false context:MTP-86853. labels:get_oms_alert_pending_orders_details_carters_14
--comment: Added SP for OMS pending orders alert details
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.get_oms_alert_pending_orders_details(input refcursor, jsonb, jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.get_oms_alert_pending_orders_details(input refcursor, jsonb, jsonb, filter_reviewed_orders boolean)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
declare
  v_pa_sql              text:='';
  v_pending_orders_sql  text:='';
  v_week_start_date     date:= date_trunc('week', current_date)::date;
    v_limit_cls           text := '';
  v_search_cls          text := '';
  v_sort_cls            text := '';
  limit_json            jsonb := '{}';
  search_json           jsonb := '{}';
  sort_json             jsonb := '{}';
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
  v_filter_reviewed_orders boolean := false;
begin

  v_pa_sql :=inventory_smart.form_main_table_filters(
    'ph_master',
    $2
  );
  search_json := $3;
  v_filter_reviewed_orders := $4;
    if $3 <> '{}' and $3 -> 'limit' is not null then
    -- Extract the 'limit' object
    limit_json := $3 -> 'limit';
    search_json := search_json - 'limit';
    v_limit_cls := global.form_table_query(jsonb_build_object('limit', limit_json));
  end if;

  -- Remove and process 'sort'
  if search_json <> '{}' and search_json -> 'sort' is not null then
    sort_array := search_json -> 'sort';
    raise notice 'sorted array %', sort_array;

    -- Iterate through sort array elements
    for i in 0 .. jsonb_array_length(sort_array) - 1 loop
      sort_item := sort_array -> i;
      if sort_item ->> 'column' = 'size' then
        sort_item := jsonb_set(sort_item, '{column}', '"size_order"');
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
  else
    v_size_sort_cls := 'ORDER BY size_order ASC NULLS LAST';
  end if;

  if search_json <> '{}' then
    v_search_cls := global.form_table_query(search_json);
  end if;

  if sort_json <> '{}' then
    v_sort_cls := global.form_table_query(sort_json);
  end if;

 v_pending_orders_sql := '
	WITH 


min_rop_helper AS (
    SELECT 
        oor.loc_code,
        oor.size,
        oor.product_code,
        oor.rop,
        oor.created_at,
        oor.inventory_deficit_agg,
        oor.recom_receipt_date,
		oor.order_placement_recom_date,
		oor.order_placement_date,
		oor.order_quantity,
		oor.order_quantity_eaches,
		oor.pack_id,
		oor.order_quantity * oor.unit_cost as order_cost,
		oor.raw_roq,
		oor.ia_shipment_order_quantity,
		oor.roq_unconstrained,
		oor.roq_constrained,
		oor.expected_receipt_date,
		oor.lost_sales_agg,
		oor.lost_sales_agg * oor.unit_cost as lost_sales_agg_cost,
      	ast."order" as size_order,
        MIN(oor.rop) OVER (PARTITION BY oor.style, oor.loc_code) AS min_rop --order placement date
    FROM 
        inventory_smart.oms_orders_recommended oor
    LEFT JOIN 
        inventory_smart.article_status_tag ast
    ON 
        oor.product_code = ast.product_code AND oor.size = ast.size
    WHERE 
        oor.order_status_id IN (1) AND oor.order_quantity > 0
),




recommended_min_rop as(
select * from min_rop_helper 
where rop = min_rop
),




sorted_data AS (
    SELECT * FROM recommended_min_rop
    ' || v_size_search_cls || '
    ' || v_size_sort_cls || '
),

paf_kpi_oor AS (
    SELECT 
        paf.article,
		paf.l0_name,
        paf.l1_name,
        paf.l2_name,
        paf.l3_name,
        paf.l4_name,
        paf.l5_name,
        paf.product_description,
		paf.primary_vendor_id AS vendor_code,
        paf.primary_vendor_name AS vendor_name,
        ok.store_inv,
        ok.dc_inv,
        ok.system_inv,
        ok.safety_stock,
        ok.open_receipt_units,
        oor.*
    from
    	sorted_data oor
    inner join 
        (SELECT * FROM global.product_attributes_filter
            ' || v_pa_sql || '
        ) paf
    on oor.product_code = paf.product_code 
    LEFT JOIN
        inventory_smart.oms_kpi ok
    
    ON 
        paf.product_code = ok.product_code
    )

    ,distinct_po_counts AS (
	SELECT 
	    po.loc_code,
	    po.product_code,
	    COUNT(DISTINCT po.po_id) AS distinct_po_count, --12
	    SUM(po.oo) + SUM(po.it) as commited_receipt_units -- 8
	FROM inventory_smart.oms_po_master po
	GROUP BY po.loc_code, po.product_code
	)


    select * from (

	SELECT 
        alerts.style, 
	    alerts.loc_code,
	    MAX(COALESCE(alerts.is_pending_order_resolved, FALSE)::INT)::BOOLEAN AS is_resolved,
	    sum(coalesce(pko.store_inv, 0)) as store_inv, --6
	    sum(coalesce(pko.dc_inv, 0)) as dc_inv, --7
		concat(alerts.style, alerts.loc_code) as unique_row_id,
		concat(alerts.style, alerts.loc_code) as id,
		avg(coalesce(oclt.lead_time, 0)) as lead_time,
		sum(coalesce(historic_sales_unit, 0)) as historic_sales_unit, --4
		sum(coalesce(historic_sales_value, 0)) as historic_sales_value, --5
		sum(coalesce(pko.system_inv, 0)) as total_inv, -- 9
		max(pko.order_placement_recom_date) as order_placement_recom_date, --10
		max(pko.expected_receipt_date) as expected_receipt_date, --11  
		max(pko.article) as article,
		sum(coalesce(pko.lost_sales_agg, 0)) as lost_sales_agg, --13
		sum(coalesce(pko.lost_sales_agg_cost, 0)) as lost_sales_agg_cost, --14
		avg(coalesce(alerts.dc_wos_oh_oo_it, 0)) as dc_wos_oh_oo_it, --15
		avg(coalesce(alerts.dc_store_wos_oh_oo_it,0)) as dc_store_wos_oh_oo_it, --16
		max(oclt.mode_shipment) as mode_shipment, --17
		sum(coalesce(alerts.potential_sales_unit, 0)) as potential_sales_unit,  --18
		sum(coalesce(alerts.potential_sales_value, 0)) as potential_sales_value,  --18
	  avg(coalesce(pko.order_quantity, 0)) as order_quantity,
		sum(coalesce(pko.order_quantity_eaches, 0)) as order_quantity_eaches,
		CASE 
        WHEN MAX(opc.article) IS NOT NULL THEN ''View Pack Config''
        ELSE ''-''
    END AS pack_id,
		round(sum(coalesce(pko.order_cost, 0))::numeric, 2) as order_cost,
		sum(coalesce(pko.raw_roq, 0)) as raw_roq,
		sum(coalesce(pko.ia_shipment_order_quantity, 0)) as ia_shipment_order_quantity,
		sum(coalesce(pko.roq_unconstrained, 0)) as roq_unconstrained,
		sum(coalesce(pko.roq_constrained, 0)) as roq_constrained,
		max(pko.recom_receipt_date) as recom_receipt_date,
	    sum(coalesce(pko.safety_stock, 0)) as safety_stock,
        string_agg(DISTINCT pko.l0_name, '', '') as l0_name,
		string_agg(DISTINCT pko.l1_name, '', '') as l1_name,
        string_agg(DISTINCT pko.l2_name, '', '') as l2_name,
        string_agg(DISTINCT pko.l3_name, '', '') as l3_name,
        string_agg(DISTINCT pko.l4_name, '', '') as l4_name,
        string_agg(DISTINCT pko.l5_name, '', '') as l5_name,
		max(product_description) as product_description,
        sum(coalesce(po.commited_receipt_units, 0)) as commited_receipt_units, -- 8
        sum(coalesce(po.distinct_po_count, 0)) as distinct_po_count, -- 12
		ARRAY_AGG(
        jsonb_build_object(
            ''size'', alerts.size, -- 3
            ''historic_sales_unit'', historic_sales_unit, --4
            ''historic_sales_value'', historic_sales_value, --5
			''l1_name'', alerts.loc_code,
            ''style'', alerts.style,
             ''store_inv'', pko.store_inv, --6
             ''dc_inv'', pko.dc_inv, --7,
             ''total_inv'', pko.system_inv, -- 9
            ''order_quantity'', pko.order_quantity,
			''order_quantity_eaches'', pko.order_quantity_eaches,
             ''order_cost'', round(coalesce(pko.order_cost, 0)::numeric, 2),
             ''raw_roq'', pko.raw_roq,
             ''ia_shipment_order_quantity'', pko.ia_shipment_order_quantity,
             ''roq_unconstrained'', pko.roq_unconstrained,
             ''roq_constrained'', pko.roq_constrained,
             ''lead_time'', oclt.lead_time,
             ''recom_receipt_date'', pko.recom_receipt_date,
             ''commited_receipt_units'', po.commited_receipt_units, -- 8
             ''distinct_po_count'', po.distinct_po_count, -- 12
             ''order_placement_recom_date'', pko.order_placement_recom_date, --10
             ''expected_receipt_date'', pko.expected_receipt_date, --11
             ''lost_sales_agg'', pko.lost_sales_agg, --13
             ''lost_sales_agg_cost'', pko.lost_sales_agg_cost, --14
             ''potential_sales_unit'', alerts.potential_sales_unit, --18
             ''potential_sales_value'', alerts.potential_sales_value, --19
             ''safety_stock'', pko.safety_stock, --20
             ''l0_name'', pko.l0_name,
			 ''l1_name'', pko.l1_name,
             ''l2_name'', pko.l2_name,
             ''l3_name'', pko.l3_name,
             ''l4_name'', pko.l4_name,
             ''l5_name'', pko.l5_name
        ) ' || v_size_sort_cls || '
    ) AS product_details
		FROM 
		    inventory_smart.oms_alerts alerts
		INNER JOIN
			 paf_kpi_oor pko
		ON 
			alerts.loc_code = pko.loc_code and pko.product_code = alerts.product_code
		left join
			distinct_po_counts po
		on pko.product_code = po.product_code  and pko.loc_code = po.loc_code
		left join
			inventory_smart.oms_constraints_lead_time oclt
		on alerts.article = oclt.article and alerts.loc_code = oclt.loc_code
    LEFT JOIN (
        SELECT DISTINCT article
        FROM inventory_smart.oms_pack_config
    ) opc
    ON opc.article = pko.article
    WHERE    alerts.pending_order ' || CASE WHEN v_filter_reviewed_orders THEN ' and not alerts.is_pending_order_resolved = true' ELSE '' END || ' group by alerts.style, alerts.loc_code
		 ) X
    ' || v_search_cls || '
    ' || v_sort_cls || '
    ' || v_limit_cls;
  raise notice 'v_pending_orders_sql %',v_pending_orders_sql;
  open $1 for execute v_pending_orders_sql;
  RETURN $1;
end
$function$
;