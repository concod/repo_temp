--liquibase formatted sql
--changeset piyush.raj:get_oms_alert_recommended_orders_details_cb_added_roq_fields_1 runOnChange:true stripComments:false splitStatements:false context:MTP-86853 labels:get_oms_alert_recommended_orders_details_vs_8.
--comment: Added SP for OMS recommended orders alert details.
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.get_oms_alert_recommended_orders_details(input refcursor, jsonb, jsonb);
DROP FUNCTION IF EXISTS inventory_smart.get_oms_alert_recommended_orders_details(jsonb, jsonb, boolean);
CREATE OR REPLACE FUNCTION inventory_smart.get_oms_alert_recommended_orders_details(jsonb, jsonb, boolean, filter_reviewed_orders boolean)
 RETURNS TABLE(result jsonb)
 LANGUAGE plpgsql
AS $function$
declare
  v_pa_sql              text:='';
  v_recommended_orders_sql  text:='';
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
    $1
  );

  search_json := $2;
  v_filter_reviewed_orders := $4;
    if $2 <> '{}' and $2 -> 'limit' is not null then
    -- Extract the 'limit' object
    limit_json := $2 -> 'limit';
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
  
 v_recommended_orders_sql := '
  WITH min_rop_helper AS (
            SELECT 
                oor.article, --choice
                oor.loc_code, --dc
                oor.size, --size
                oor.recom_receipt_date, --Target Inventory Breach Date
                oor.product_code,
                oor.rop,
                oor.order_status_id, 
                oor.created_at,
                oor.inventory_deficit_agg,
                oor.lost_sales_agg,
                oor.unit_cost,
                oor.ia_shipment_order_quantity,
                oor.roq_unconstrained,
                oor.order_quantity, --order Quantity
                oor.order_quantity_eaches,
                oor.pack_id,
                oor.order_placement_date,
			          oor.order_quantity * oor.unit_cost as order_cost,
                oor.raw_roq,
                oor.roq_constrained,
                oor.order_placement_recom_date, --order Placement Recommended date
                oor.expected_receipt_date,
                oor.order_type,
                oor.elt_projected_safety_stock,
                oor.elt_projected_bop,
                oor.lost_sales_agg * oor.unit_cost as lost_sales_agg_cost,
                ast."order" as size_order,
                MIN(oor.rop) OVER (PARTITION BY oor.article, oor.loc_code) AS min_rop --order placement date
            FROM 
                inventory_smart.oms_orders_recommended oor
            LEFT JOIN
                inventory_smart.article_status_tag ast
            ON 
                oor.product_code = ast.product_code AND oor.size = ast.size
            WHERE 
oor.order_status_id IN (0) AND oor.order_gen_type!=''Manual'' AND oor.raw_roq > 0 and oor.order_type IN (''Order Cycle'', ''Reorder Point'') AND oor.order_placement_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL ''28 days''
        )

        ,recommended_min_rop as(
        select * from min_rop_helper where rop = min_rop
        )

        ,sorted_data AS (
    SELECT * FROM recommended_min_rop
    ' || v_size_search_cls || '
    ' || v_size_sort_cls || '
    )
        
        ,distinct_po_counts AS (
            SELECT 
                po.loc_code,
                po.product_code,
                SUM(po.oo) + SUM(po.it) as commited_receipt_units, -- PO receipts
                COUNT(DISTINCT po.po_id) AS distinct_po_count
            FROM inventory_smart.oms_po_master po  
            GROUP BY po.loc_code, po.product_code  
        )

        ,paf_kpi_oor AS (
                SELECT   
                    paf.l1_name,
                    paf.l0_name,
                    paf.l2_name,
                    ok.store_inv,
                    ok.dc_inv,
                    ok.system_inv,
                    ok.safety_stock,
                    ok.open_receipt_units,
                    oor.*
                from
                    sorted_data oor
                inner join 
                    (SELECT l1_name, l0_name, l2_name, product_code FROM global.product_attributes_filter
                    ' || v_pa_sql || '
                    ) paf
                    on oor.product_code = paf.product_code 
                LEFT JOIN
                    inventory_smart.oms_kpi ok
                ON 
                    paf.product_code = ok.product_code AND oor.loc_code = ok.loc_code 
                join (select * from global.distribution_centres where is_active and not is_deleted) dc 
                on dc.linked_store_code = oor.loc_code
            )
            select * from(
            SELECT
                alerts.article, -- 1
                alerts.loc_code, -- 2 
                
                MAX(COALESCE(alerts.is_recom_order_resolved, FALSE)::INT)::BOOLEAN AS is_resolved,
                sum(coalesce(pko.store_inv, 0)) as store_inv, --6 Store Inventory
                sum(coalesce(pko.dc_inv, 0)) as dc_inv, --7 --DC Inventory
                concat(alerts.article, alerts.loc_code) as unique_row_id,
                concat(alerts.article, alerts.loc_code) as id,
                sum(coalesce(pko.system_inv, 0)) as total_inv, -- 9 Total INventory
                max(pko.order_placement_recom_date) as order_placement_recom_date, --10
                sum(coalesce(po.commited_receipt_units, 0)) as commited_receipt_units,
                avg(coalesce(pko.order_quantity, 0)) as order_quantity,
                sum(coalesce(pko.order_quantity_eaches, 0)) as order_quantity_eaches,
                CASE 
                    WHEN MAX(opc.article) IS NOT NULL THEN ''View Pack Config''
                    ELSE ''-''
                END AS pack_id,
                max(pko.recom_receipt_date) as recom_receipt_date,
                ARRAY_AGG(
                jsonb_build_object(
                    ''size'', alerts.size, -- 3
                    ''loc_code'', alerts.loc_code,
                    ''article'', alerts.article,
                    ''store_inv'', coalesce(pko.store_inv, 0), --6
                    ''dc_inv'', coalesce(pko.dc_inv, 0), --7,
                    ''total_inv'', coalesce(pko.system_inv, 0), -- 9
                    ''order_quantity'', coalesce(pko.order_quantity, 0),
					          ''order_quantity_eaches'', coalesce(pko.order_quantity_eaches,0),
                    ''commited_receipt_units'', coalesce(po.commited_receipt_units, 0), -- 8
                    ''order_placement_recom_date'', pko.order_placement_recom_date, --10
                    ''recom_receipt_date'', pko.recom_receipt_date
                ) ' || v_size_sort_cls || '
            ) AS product_details
            FROM 
                inventory_smart.oms_alerts alerts
            INNER JOIN
                paf_kpi_oor pko
            ON 
                alerts.article = pko.article AND alerts.loc_code = pko.loc_code and pko.product_code = alerts.product_code
            left join
            distinct_po_counts po
            on alerts.product_code = po.product_code  and alerts.loc_code = po.loc_code
            LEFT JOIN (
                SELECT DISTINCT article
                FROM inventory_smart.oms_pack_config
            ) opc
            ON opc.article = pko.article
            WHERE    alerts.recom_order
            ' || CASE WHEN v_filter_reviewed_orders THEN ' and not alerts.is_recom_order_resolved = true' ELSE '' END || ' 
            group by alerts.article, alerts.loc_code) X
    ' || v_search_cls || '
    ' || v_sort_cls || '
    ' || v_limit_cls;

  if $3 is false then
    v_recommended_orders_sql := 'select row_to_json(Y)::jsonb as result from (' || v_recommended_orders_sql || ') Y ';
  else 
    v_recommended_orders_sql := 'select jsonb_build_object(''count'', count(*)) as result from (' || v_recommended_orders_sql || ') Y ';
  end if;

  raise notice 'v_recommended_orders_sql %',v_recommended_orders_sql;
  return query execute v_recommended_orders_sql;
end
$function$
;
