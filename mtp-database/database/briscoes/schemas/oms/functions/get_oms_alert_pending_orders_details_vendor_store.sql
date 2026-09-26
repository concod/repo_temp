--liquibase formatted sql
--changeset kailash.kangne@impactanalytics.co:get_oms_alert_pending_orders_details_vendor_store_2 runOnChange:true stripComments:false splitStatements:false context:optimising labels:MTP-114969
--comment: MTP-114969
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.get_oms_alert_pending_orders_details_vendor_store(input refcursor, jsonb, jsonb);

CREATE OR REPLACE FUNCTION inventory_smart.get_oms_alert_pending_orders_details_vendor_store(input refcursor, jsonb, jsonb, filter_reviewed_orders boolean)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_pa_sql              TEXT := '';
    v_pending_orders_sql TEXT := '';
    v_filter_reviewed_orders boolean := false;
BEGIN
    -- Generate additional SQL filters
    v_pa_sql := inventory_smart.form_main_table_filters(
        'ph_master',
        $2
    );
    v_filter_reviewed_orders := $4;
    -- Construct the main SQL query
    v_pending_orders_sql := '
        WITH alerts_store as (
            select * from inventory_smart.oms_alerts_store WHERE  pending_order 
        )
        
        ,min_rop_helper AS (
            SELECT 
            oor.article,
            oor.store_code,
            oor.size,
            oor.product_code,
            oor.rop,
            oor.order_status_id, 
            oor.roq_unconstrained,
            oor.order_quantity,
            oor.raw_roq,
            oor.roq_constrained,
            oor.order_placement_recom_date,
            oor.recom_receipt_date,
            oor.expected_receipt_date,
            oor.order_type,
			oor.lead_time,
			oor.elt_projected_store_inv,
            oor.elt_projected_safety_stock,
            oor.elt_projected_bop,
            GREATEST(oor.elt_projected_safety_stock - oor.elt_projected_bop, 0) as safety_stock_deficit,
            CASE 
            WHEN oor.order_type = ''Immediate'' THEN 
                MIN(CASE WHEN oor.order_type = ''Immediate'' THEN oor.rop END) 
                OVER (PARTITION BY oor.article, oor.store_code)
            ELSE NULL 
        END AS min_rop,

        -- Earliest receipt date for "Immediate" orders
        MIN(CASE WHEN oor.order_type = ''Immediate'' THEN oor.expected_receipt_date END) 
            OVER (PARTITION BY oor.article, oor.store_code) AS earliest_receipt_date,

        -- First "Order Cycle" expected receipt date (corresponding to min rop)
        MIN(CASE WHEN oor.order_type = ''Order Cycle'' THEN oor.expected_receipt_date END) 
            OVER (PARTITION BY oor.article, oor.store_code ORDER BY oor.rop ASC) 
            AS order_cycle_receipt_date
        FROM 
            inventory_smart.oms_orders_recommended_store oor
        INNER JOIN
            alerts_store
        ON
            oor.product_code = alerts_store.product_code
            AND oor.store_code = alerts_store.store_code
        WHERE 
            oor.order_gen_type != ''Manual'' and oor.order_status_id != 3
    )
    --select * from min_rop_helper where rop = min_rop;

    ,recommended_min_rop as(
    select * from min_rop_helper where min_rop is not null and rop = min_rop
    )
    --select * from recommended_min_rop;

    ,paf_kpi_oor AS (
            SELECT 
                oks.store_inv,
                oor.*
            from
                recommended_min_rop oor
            inner join 
                global.product_attributes_filter paf
                on oor.product_code = paf.product_code 
            LEFT JOIN
                inventory_smart.oms_kpi_store oks
            ON 
                paf.product_code = oks.product_code AND oor.store_code = oks.store_code 
            -- join (select * from global.distribution_centres where is_active and not is_deleted) dc 
            -- on dc.linked_store_code = oor.store_code
                        ' || v_pa_sql || '
        )
    --select * from paf_kpi_oor;
        
    ,distinct_po_counts AS (
        SELECT 
		    pos.store_code,
		    pos.product_code,
		    SUM(pos.oo) + SUM(pos.it) AS oo_it, --7
		    coalesce(COUNT(DISTINCT pos.po_id), 0) AS po_count --14
    FROM 
        inventory_smart.oms_po_master_store pos
    INNER JOIN 
        recommended_min_rop mrh 
    ON 
        pos.store_code = mrh.store_code 
        AND pos.product_code = mrh.product_code
    INNER JOIN 
        alerts_store oa
    ON 
        pos.store_code = oa.store_code 
        AND pos.product_code = oa.product_code
    WHERE 
        pos.projected_delivery_date BETWEEN (COALESCE(mrh.recom_receipt_date, NOW()) - INTERVAL ''12 weeks'')
                                           AND COALESCE(mrh.earliest_receipt_date, mrh.order_cycle_receipt_date)
        
    GROUP BY 
        pos.store_code, pos.product_code
    )
    --select * from distinct_po_counts

    select * from (

        SELECT 
        
            alerts_store.article, -- 1
            alerts_store.store_code, -- 2 
            
            MAX(COALESCE(alerts_store.is_pending_order_resolved, FALSE)::INT)::BOOLEAN AS is_resolved,
            sum(coalesce(pko.store_inv, 0)) as store_inv, --4
            concat(alerts_store.article, alerts_store.store_code) as unique_row_id,
            concat(alerts_store.article, alerts_store.store_code) as id,
            sum(coalesce(historic_sales_unit, 0)) as historic_sales_unit, -- 27
            sum(coalesce(historic_sales_value, 0)) as historic_sales_value, -- 28
            sum(coalesce(pos.oo_it, 0)) as oo_it, -- 7
            max(pko.order_placement_recom_date) as order_placement_recom_date, -- 5
            max(pko.expected_receipt_date) as expected_receipt_date, --21 
            max(coalesce(pos.po_count, 0)) as po_count, -- 14
            sum(coalesce(alerts_store.potential_sales_unit, 0)) as potential_sales_unit,  -- 17
            sum(coalesce(alerts_store.potential_sales_value, 0)) as potential_sales_value,  -- 18
			max(alerts_store.receipt_date_earliest) as receipt_date_earliest, --8
			max(alerts_store.order_placement_date_earliest) as order_placement_date_earliest, --9
			sum(alerts_store.raw_roq_earliest) as raw_roq_earliest, --10
			sum(alerts_store.roq_unconstrained_earliest) as roq_unconstrained_earliest, --11
			max(alerts_store.date_diff) as date_diff, --13
			sum(alerts_store.lost_sales_aggregated_unit) as lost_sales_aggregated_unit, --15
			sum(alerts_store.lost_sales_aggregated_value) as lost_sales_aggregated_value, --16
            sum(coalesce(pko.order_quantity, 0)) as order_quantity, --6
            sum(coalesce(pko.raw_roq, 0)) as raw_roq, --22
			sum(coalesce(pko.lead_time, 0)) as lead_time, --19
            sum(coalesce(pko.roq_unconstrained, 0)) as roq_unconstrained, --23
            sum(coalesce(pko.roq_constrained, 0)) as roq_constrained, --26
            max(pko.recom_receipt_date) as recom_receipt_date, --`12
            sum(coalesce(pko.safety_stock_deficit, 0)) as safety_stock_deficit, --25
			sum(coalesce(pko.elt_projected_safety_stock, 0)) as elt_projected_safety_stock, --24
			sum(coalesce(pko.elt_projected_store_inv, 0)) as elt_projected_store_inv, --20
			''action'' as action, --30
            ARRAY_AGG(
            jsonb_build_object(
                ''size'', alerts_store.size, -- 3
                ''historic_sales_unit'', alerts_store.historic_sales_unit, -- 27
                ''historic_sales_value'', alerts_store.historic_sales_value, -- 28
                ''raw_roq_earliest'',alerts_store.raw_roq_earliest, --10
                ''roq_unconstrained_earliest'',alerts_store.roq_unconstrained_earliest,--11
				''date_diff'',alerts_store.date_diff, --13
				''lost_sales_aggregated_unit'',alerts_store.lost_sales_aggregated_unit,--15
				''lost_sales_aggregated_value'',alerts_store.lost_sales_aggregated_value, --16
                ''store_inv'', pko.store_inv, --4
                ''order_quantity'', pko.order_quantity, --6
                ''raw_roq'', pko.raw_roq, --22
				''lead_time'',pko.lead_time, --19
                ''roq_unconstrained'', pko.roq_unconstrained, --23
                ''roq_constrained'', pko.roq_constrained, --26
                ''recom_receipt_date'', pko.recom_receipt_date, --12
                ''safety_stock_deficit'', pko.safety_stock_deficit, --25
				''elt_projected_safety_stock'', pko.elt_projected_safety_stock, --24
				''elt_projected_store_inv'', pko.elt_projected_store_inv, --20
                ''oo_it'', pos.oo_it, -- 7
                ''po_count'', pos.po_count, -- 14 
                ''potential_sales_unit'', alerts_store.potential_sales_unit, -- 17
                ''potential_sales_value'', alerts_store.potential_sales_value -- 18
            )
        ) AS product_details
        FROM 
            alerts_store
        INNER JOIN
            paf_kpi_oor pko
        ON 
            alerts_store.article = pko.article AND alerts_store.store_code = pko.store_code and pko.product_code = alerts_store.product_code
        left join 
            distinct_po_counts pos
        on pko.product_code = pos.product_code  and pko.store_code = pos.store_code
        
        ' || CASE WHEN v_filter_reviewed_orders THEN ' WHERE not alerts_store.is_pending_order_resolved = true' ELSE '' END || ' 
        group by alerts_store.article, alerts_store.store_code ) X
    ' || global.form_table_query($3);
     

    -- Debugging SQL
    RAISE NOTICE 'v_pending_orders_sql: %', v_pending_orders_sql;

    -- Open the cursor and execute the query
    OPEN $1 FOR EXECUTE v_pending_orders_sql;
    RETURN $1;
END;
$function$
;
