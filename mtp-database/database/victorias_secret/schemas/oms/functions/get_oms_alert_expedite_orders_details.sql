--liquibase formatted sql
--changeset chaitanyakrishna.vb@impactanalytics.co:get_oms_alert_expedite_orders_details_vs_6 runOnChange:true stripComments:false splitStatements:false context:MTP-124214 labels:MTP-124214
--comment: Added missing product attributes, order cycle, and PO columns for tc_code 3024
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.get_oms_alert_expedite_orders_details(input refcursor, jsonb, jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.get_oms_alert_expedite_orders_details(input refcursor, jsonb, jsonb, filter_reviewed_orders boolean)
RETURNS refcursor
LANGUAGE plpgsql
AS $function$
DECLARE
    v_pa_sql              TEXT := '';
    v_expedite_orders_sql TEXT := '';
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
  add_default_sort       boolean := true;
  v_filter_reviewed_orders boolean := false;
BEGIN
    -- Generate additional SQL filters
    v_pa_sql := global.form_main_table_filters(
        'product_attributes_filter',
        $2
    );
    v_pa_sql := REPLACE(v_pa_sql, ' product_code ', ' paf.product_code ');

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
        if sort_item ->> 'column' = 'recom_receipt_date' then
          add_default_sort := false;
        end if;
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

  if add_default_sort then
    new_sort_array := new_sort_array || jsonb_build_object('column', 'recom_receipt_date', 'order', 'asc');
    sort_json := jsonb_set(sort_json, '{sort}', new_sort_array);
  end if;

  if search_json <> '{}' then
    v_search_cls := global.form_table_query(search_json);
  end if;

  if sort_json <> '{}' then
    v_sort_cls := global.form_table_query(sort_json);
  end if;

    -- Construct the main SQL query
    v_expedite_orders_sql := '
        WITH min_rop_helper AS (
            SELECT 
            oor.article,
            oor.loc_code,
            oor.size,
            oor.product_code,
            oor.rop,
            oor.order_status_id, 
            oor.created_at,
            oor.inventory_deficit_agg,
            oor.lost_sales_agg,
            oor.unit_cost,
            oor.ia_shipment_order_quantity,
            oor.roq_unconstrained,
            oor.order_quantity,
            oor.order_placement_date,
			oor.order_quantity * oor.unit_cost as order_cost,
            oor.raw_roq,
            oor.roq_constrained,
            oor.order_placement_recom_date,
            oor.recom_receipt_date,
            oor.expected_receipt_date,
            oor.order_type,
            oor.elt_projected_safety_stock,
            oor.elt_projected_bop,
            ast."order" as size_order,
            GREATEST(oor.elt_projected_safety_stock - oor.elt_projected_bop, 0) as safety_stock_deficit,
            oor.lost_sales_agg * oor.unit_cost as lost_sales_agg_cost,
            CASE 
            WHEN oor.order_type = ''Immediate'' THEN 
                MIN(CASE WHEN oor.order_type = ''Immediate'' THEN oor.rop END) 
                OVER (PARTITION BY oor.article, oor.loc_code)
            ELSE NULL 
        END AS min_rop,

        -- Earliest receipt date for "Immediate" orders
        MIN(CASE WHEN oor.order_type = ''Immediate'' THEN oor.expected_receipt_date END) 
            OVER (PARTITION BY oor.article, oor.loc_code) AS earliest_receipt_date,

        -- First "Order Cycle" expected receipt date (corresponding to min rop)
        MIN(CASE WHEN oor.order_type = ''Order Cycle'' THEN oor.expected_receipt_date END) 
            OVER (PARTITION BY oor.article, oor.loc_code ORDER BY oor.rop ASC) 
            AS order_cycle_receipt_date
        FROM 
            inventory_smart.oms_orders_recommended oor
        LEFT JOIN (
        SELECT 
            product_code, size, MIN("order") AS "order"
        FROM 
            inventory_smart.article_status_tag
        GROUP BY product_code, size
        ) ast
        ON 
            ast.size = oor.size AND ast.product_code = oor.product_code
        WHERE 
            oor.order_gen_type != ''Manual'' and oor.order_status_id != 3
    )
    --select * from min_rop_helper where rop = min_rop;

    ,recommended_min_rop as(
    select * from min_rop_helper where min_rop is not null and rop = min_rop
    )
    --select * from recommended_min_rop;

    ,sorted_data AS (
    SELECT * FROM recommended_min_rop
    ' || v_size_search_cls || '
    ' || v_size_sort_cls || '
    )

    ,paf_kpi_oor AS (
            SELECT 

                paf.l1_name,
                paf.l0_name,
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
                ok.store_inv,
                ok.dc_inv,
                ok.system_inv,
                ok.safety_stock,
                ok.open_receipt_units,
                oor.*
            from
                sorted_data oor
            inner join 
                global.product_attributes_filter paf
                on oor.product_code = paf.product_code 
            LEFT JOIN
                inventory_smart.oms_kpi ok
            ON 
                paf.product_code = ok.product_code AND oor.loc_code = ok.loc_code 
            join (select * from global.distribution_centres where is_active and not is_deleted) dc 
            on dc.linked_store_code = oor.loc_code
                        ' || v_pa_sql || '
        )
    --select * from paf_kpi_oor;
        
    ,distinct_po_counts AS (
        SELECT 
        po.loc_code,
        po.product_code,
        SUM(po.oo) + SUM(po.it) AS commited_receipt_units,
        coalesce(COUNT(DISTINCT po.po_id), 0) AS distinct_po_count,
        coalesce(COUNT(DISTINCT po.po_id), 0) AS po_count,
        SUM(COALESCE(po.oo, 0)) + SUM(COALESCE(po.it, 0)) AS po_units,
        MIN(po.projected_delivery_date) AS first_projected_delivery_date
    FROM 
        inventory_smart.oms_po_master po  
    WHERE EXISTS (
        SELECT 1
        FROM recommended_min_rop mrh
        JOIN inventory_smart.oms_alerts oa
          ON mrh.loc_code = oa.loc_code AND mrh.product_code = oa.product_code
        WHERE 
            mrh.loc_code = po.loc_code AND
            mrh.product_code = po.product_code AND
            oa.expedite_order = TRUE AND
            po.projected_delivery_date BETWEEN 
                mrh.recom_receipt_date AND
                COALESCE(mrh.earliest_receipt_date, mrh.order_cycle_receipt_date)
    )
    GROUP BY 
        po.loc_code, po.product_code
    )
    --select * from distinct_po_counts

    ,shipment_mode_agg AS (
      SELECT
        article,
        loc_code,
        ARRAY_AGG(
          jsonb_build_object(
            ''shipment_mode'', mode_shipment,
            ''lead_time'', lead_time,
            ''default_mode'', default_mode
          )
        ) AS shipment_modes,
        MAX(
          CASE WHEN default_mode = 1 THEN lead_time END
        ) AS lead_time,
        MAX(
          CASE WHEN default_mode = 1 THEN mode_shipment END
        ) AS shipment_mode
      FROM inventory_smart.oms_constraints_lead_time
      GROUP BY article, loc_code
    )

    ,order_cycle_agg AS (
        SELECT
            article,
            loc_code,
            SUM(COALESCE(order_quantity, 0)) AS raw_roq_order_cycle
        FROM min_rop_helper
        WHERE order_type = ''Order Cycle''
        GROUP BY article, loc_code
    )

    select * from (

        SELECT 
        
            alerts.article, -- 1
            alerts.loc_code, -- 2 
            
            MAX(COALESCE(alerts.is_expedite_order_resolved, FALSE)::INT)::BOOLEAN AS is_resolved,
            sum(coalesce(pko.store_inv, 0)) as store_inv, --6
            sum(coalesce(pko.dc_inv, 0)) as dc_inv, --7
            concat(alerts.article, alerts.loc_code) as unique_row_id,
            concat(alerts.article, alerts.loc_code) as id,
            sum(coalesce(historic_sales_unit, 0)) as historic_sales_unit, --4
            sum(coalesce(historic_sales_value, 0)) as historic_sales_value, --5
            sum(coalesce(po.commited_receipt_units, 0)) as commited_receipt_units, -- 8
            sum(coalesce(pko.system_inv, 0)) as total_inv, -- 9
            max(pko.order_placement_recom_date) as order_placement_recom_date, --10
            max(pko.expected_receipt_date) as expected_receipt_date, --11  
            max(coalesce(po.distinct_po_count, 0)) as distinct_po_count, --12
            sum(coalesce(alerts.lost_sales_aggregated_unit, 0)) as lost_sales_agg, --13
            sum(coalesce(alerts.lost_sales_aggregated_value, 0)) as lost_sales_agg_cost, --14
            avg(coalesce(alerts.dc_wos_oh_oo_it, 0)) as dc_wos_oh_oo_it, --15
            avg(alerts.dc_store_wos_oh_oo_it) as dc_store_wos_oh_oo_it, --16
            sum(coalesce(alerts.potential_sales_unit, 0)) as potential_sales_unit,  --18
            sum(coalesce(alerts.potential_sales_value, 0)) as potential_sales_value,  --18

            max(alerts.receipt_date_earliest) as receipt_date_earliest,
            max(alerts.order_placement_date_earliest) as order_placement_date_earliest,
            sum(coalesce(alerts.raw_roq_earliest, 0)) as raw_roq_earliest,
            sum(coalesce(alerts.order_quantity_earliest, 0)) as roq_unconstrained_earliest,
            avg(coalesce(alerts.date_diff, 0)) as date_diff,

            sum(coalesce(pko.order_quantity, 0)) as order_quantity,
            sum(coalesce(pko.order_cost, 0)) as order_cost,
            sum(coalesce(pko.raw_roq, 0)) as raw_roq,
            sum(coalesce(pko.ia_shipment_order_quantity, 0)) as ia_shipment_order_quantity,
            sum(coalesce(pko.roq_unconstrained, 0)) as roq_unconstrained,
            sum(coalesce(pko.roq_constrained, 0)) as roq_constrained,
            max(pko.recom_receipt_date) as recom_receipt_date,
            sum(coalesce(pko.safety_stock_deficit, 0)) as safety_stock_deficit,
            max(sm.shipment_mode) as shipment_mode,
            max(sm.lead_time) as lead_time,
            max(sm.shipment_modes) as shipment_modes,
            max(pko.l0_name) as l0_name,
            max(pko.l1_name) as l1_name,
            max(pko.l2_name) as l2_name,
            max(pko.l3_name) as l3_name,
            max(pko.l4_name) as l4_name,
            max(pko.l5_name) as l5_name,
            max(pko.l6_name) as l6_name,
            max(pko.masterstyle_descr) as masterstyle_descr,
            max(pko.subbrand_description) as subbrand_description,
            max(pko.product_lifecycle) as product_lifecycle,
            max(pko.collection) as collection,
            max(pko.masterstyle_descr) as master_style,
            max(pko.color) as color,
            max(pko.subbrand_code_desc) as subbrand_code_desc,
            max(pko.current_assortment_group) as current_assortment_group,
            max(pko.flex_style) as flex_style,
            max(pko.generic) as generic,
            max(pko.sizes_mat) as sizes_mat,
            max(pko.form) as form,
            max(pko.user_defined_1) as user_defined_1,
            max(pko.user_defined_2) as user_defined_2,
            max(pko.user_defined_3) as user_defined_3,
            max(pko.user_defined_4) as user_defined_4,
            max(pko.user_defined_5) as user_defined_5,
            max(pko.user_defined_6) as user_defined_6,
            COALESCE(MAX(oca.raw_roq_order_cycle), 0) as raw_roq_order_cycle,
            MAX(pko.order_cycle_receipt_date) as receipt_date_order_cycle,
            (MAX(pko.order_cycle_receipt_date) - MIN(pko.earliest_receipt_date)) as days_between_cycles,
            COALESCE(MAX(po.po_count), 0) as po_count,
            COALESCE(MAX(po.po_units), 0) as po_units,
            MIN(po.first_projected_delivery_date) as first_projected_delivery_date,
            MIN(pko.earliest_receipt_date) as receipt_date_immediate,
            ARRAY_AGG(
            jsonb_build_object(
                ''size'', alerts.size,
                ''historic_sales_unit'', historic_sales_unit,
                ''historic_sales_value'', historic_sales_value,
                ''loc_code'', alerts.loc_code,
                ''article'', alerts.article,
                ''store_inv'', pko.store_inv,
                ''dc_inv'', pko.dc_inv,
                ''total_inv'', pko.system_inv,
                ''order_quantity'', pko.order_quantity,
                ''order_cost'', pko.order_cost,
                ''raw_roq'', pko.raw_roq,
                ''ia_shipment_order_quantity'', pko.ia_shipment_order_quantity,
                ''roq_unconstrained'', pko.roq_unconstrained,
                ''roq_constrained'', pko.roq_constrained,
                ''recom_receipt_date'', pko.recom_receipt_date,
                ''safety_stock_deficit'', pko.safety_stock_deficit,
                ''commited_receipt_units'', po.commited_receipt_units,
                ''order_placement_recom_date'', pko.order_placement_recom_date,
                ''expected_receipt_date'', pko.expected_receipt_date,
                ''distinct_po_count'', po.distinct_po_count,
                ''lost_sales_agg'', alerts.lost_sales_aggregated_unit,
                ''lost_sales_agg_cost'', alerts.lost_sales_aggregated_value,
                ''potential_sales_unit'', alerts.potential_sales_unit,
                ''potential_sales_value'', alerts.potential_sales_value,
                ''receipt_date_earliest'', alerts.receipt_date_earliest,
                ''order_placement_date_earliest'', alerts.order_placement_date_earliest,
                ''raw_roq_earliest'', alerts.raw_roq_earliest,
                ''roq_unconstrained_earliest'', alerts.order_quantity_earliest,
                ''date_diff'', alerts.date_diff
            ) || jsonb_build_object(
                ''l0_name'', pko.l0_name,
                ''l1_name'', pko.l1_name,
                ''l2_name'', pko.l2_name,
                ''l3_name'', pko.l3_name,
                ''l4_name'', pko.l4_name,
                ''l5_name'', pko.l5_name,
                ''l6_name'', pko.l6_name,
                ''masterstyle_descr'', pko.masterstyle_descr,
                ''subbrand_description'', pko.subbrand_description,
                ''product_lifecycle'', pko.product_lifecycle,
                ''collection'', pko.collection,
                ''master_style'', pko.masterstyle_descr,
                ''color'', pko.color,
                ''subbrand_code_desc'', pko.subbrand_code_desc,
                ''current_assortment_group'', pko.current_assortment_group,
                ''flex_style'', pko.flex_style,
                ''generic'', pko.generic,
                ''sizes_mat'', pko.sizes_mat,
                ''form'', pko.form,
                ''user_defined_1'', pko.user_defined_1,
                ''user_defined_2'', pko.user_defined_2,
                ''user_defined_3'', pko.user_defined_3,
                ''user_defined_4'', pko.user_defined_4,
                ''user_defined_5'', pko.user_defined_5,
                ''user_defined_6'', pko.user_defined_6
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
        on pko.product_code = po.product_code  and pko.loc_code = po.loc_code
        left join 
            shipment_mode_agg sm
        on pko.article = sm.article and pko.loc_code = sm.loc_code
        left join
            order_cycle_agg oca
        on alerts.article = oca.article and alerts.loc_code = oca.loc_code
        WHERE    alerts.expedite_order' || 
        CASE WHEN v_filter_reviewed_orders THEN ' and not alerts.is_expedite_order_resolved = true' ELSE '' END || '
        group by alerts.article, alerts.loc_code ) X
    ' || v_search_cls || '
    ' || v_sort_cls || '
    ' || v_limit_cls;
     

    -- Debugging SQL
    RAISE NOTICE 'v_expedite_orders_sql: %', v_expedite_orders_sql;

    -- Open the cursor and execute the query
    OPEN $1 FOR EXECUTE v_expedite_orders_sql;
    RETURN $1;
END;
$function$;