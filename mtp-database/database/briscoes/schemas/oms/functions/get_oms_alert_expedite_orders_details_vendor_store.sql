--liquibase formatted sql
--changeset nikhil.madhusudan@impactanalytics.co:get_oms_alert_expedite_orders_details_vendor_store_5 runOnChange:true stripComments:false splitStatements:false context:optimising labels:MTP-114969
--comment: MTP-114969 Expedite query shape: filtered_alerts, filtered_oors (oor+fa.*, PA on oor), filtered_oors_min, paf_kpi_oor, distinct_pos_counts
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.get_oms_alert_expedite_orders_details_vendor_store(input refcursor, jsonb, jsonb);

CREATE OR REPLACE FUNCTION inventory_smart.get_oms_alert_expedite_orders_details_vendor_store(input refcursor, jsonb, jsonb, filter_reviewed_orders boolean)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_pa_sql              TEXT := '';
    v_pa_and              TEXT := '';
    v_expedite_orders_sql TEXT := '';
    v_filter_reviewed_orders boolean := false;
BEGIN
    v_pa_sql := inventory_smart.form_main_table_filters(
        'oors',
        $2
    );
    v_pa_and := COALESCE(
        NULLIF(
            regexp_replace(COALESCE(trim(v_pa_sql), ''), '^\s*where\s+', ' AND ', 'i'),
            ''
        ),
        ''
    );
    v_filter_reviewed_orders := $4;
    v_expedite_orders_sql := '
        WITH filtered_alerts AS (
            SELECT oas.* FROM inventory_smart.oms_alerts_store oas
            WHERE oas.expedite_order
            ' || CASE WHEN v_filter_reviewed_orders THEN ' AND NOT oas.is_expedite_order_resolved = TRUE' ELSE '' END || '
        ),
        filtered_oors AS (
            SELECT
            oor.rop,
            oor.order_status_id,
            oor.roq_unconstrained,
            oor.order_quantity,
            oor.raw_roq,
            oor.roq_constrained,
            oor.order_placement_recom_date,
            oor.recom_receipt_date AS oor_recom_receipt_date,
            oor.expected_receipt_date,
            oor.order_type,
            oor.lead_time,
            oor.elt_projected_store_inv,
            oor.elt_projected_safety_stock,
            oor.elt_projected_bop,
            GREATEST(oor.elt_projected_safety_stock - oor.elt_projected_bop, 0) AS safety_stock_deficit,
            CASE
            WHEN oor.order_type = ''Immediate'' THEN
                MIN(CASE WHEN oor.order_type = ''Immediate'' THEN oor.rop END)
                OVER (PARTITION BY oor.article, oor.store_code)
            ELSE NULL
            END AS min_rop,

            -- Earliest receipt date for "Immediate" orders
            MIN(CASE WHEN oor.order_type = ''Immediate'' THEN oor.expected_receipt_date END)
                OVER (PARTITION BY oor.article, oor.store_code) AS earliest_receipt_date,

            -- First "Order Cycle" expected receipt date (corresposnding to min rop)
            MIN(CASE WHEN oor.order_type = ''Order Cycle'' THEN oor.expected_receipt_date END)
                OVER (PARTITION BY oor.article, oor.store_code) AS order_cycle_receipt_date,
            fa.*
            FROM inventory_smart.oms_orders_recommended_store oor
            INNER JOIN filtered_alerts fa ON fa.product_code = oor.product_code AND fa.store_code = oor.store_code
            WHERE oor.order_gen_type != ''Manual'' AND oor.order_status_id != 3
            AND oor.ordering = ''Y''
' || v_pa_and || '
        ),
        filtered_oors_min AS (
            SELECT * FROM filtered_oors WHERE min_rop IS NOT NULL AND rop = min_rop
        ),
        paf_kpi_oor AS (
            SELECT
                oks.store_inv,
                oor.*
            FROM filtered_oors_min oor
            LEFT JOIN inventory_smart.oms_kpi_store oks ON oor.product_code = oks.product_code AND oor.store_code = oks.store_code
        ),
        distinct_pos_counts AS (
            SELECT
            pos.store_code,
            pos.product_code,
            SUM(pos.oo) + SUM(pos.it) AS oo_it,
            COALESCE(COUNT(DISTINCT pos.po_id), 0) AS po_count
            FROM filtered_oors_min oor
            INNER JOIN inventory_smart.oms_po_master_store pos ON pos.product_code = oor.product_code AND pos.store_code = oor.store_code
            WHERE pos.projected_delivery_date BETWEEN (COALESCE(oor.oor_recom_receipt_date, NOW()) - INTERVAL ''12 weeks'')
                AND COALESCE(oor.earliest_receipt_date, oor.order_cycle_receipt_date)
            GROUP BY pos.store_code, pos.product_code
        )
        SELECT * FROM (
            SELECT
            oors.article,
            oors.store_code,
            MAX(COALESCE(oors.is_expedite_order_resolved, FALSE)::INT)::BOOLEAN AS is_resolved,
            SUM(COALESCE(pko.store_inv, 0)) AS store_inv,
            CONCAT(oors.article, oors.store_code) AS unique_row_id,
            CONCAT(oors.article, oors.store_code) AS id,
            SUM(COALESCE(oors.historic_sales_unit, 0)) AS historic_sales_unit,
            SUM(COALESCE(oors.historic_sales_value, 0)) AS historic_sales_value,
            SUM(COALESCE(pos.oo_it, 0)) AS oo_it,
            MAX(pko.order_placement_recom_date) AS order_placement_recom_date,
            MAX(pko.expected_receipt_date) AS expected_receipt_date,
            MAX(COALESCE(pos.po_count, 0)) AS po_count,
            SUM(COALESCE(oors.potential_sales_unit, 0)) AS potential_sales_unit,
            SUM(COALESCE(oors.potential_sales_value, 0)) AS potential_sales_value,
            MAX(oors.receipt_date_earliest) AS receipt_date_earliest,
            MAX(oors.order_placement_date_earliest) AS order_placement_date_earliest,
            SUM(oors.raw_roq_earliest) AS raw_roq_earliest,
            SUM(oors.roq_unconstrained_earliest) AS roq_unconstrained_earliest,
            MAX(oors.date_diff) AS date_diff,
            SUM(oors.lost_sales_aggregated_unit) AS lost_sales_aggregated_unit,
            SUM(oors.lost_sales_aggregated_value) AS lost_sales_aggregated_value,
            SUM(COALESCE(pko.order_quantity, 0)) AS order_quantity,
            SUM(COALESCE(pko.raw_roq, 0)) AS raw_roq,
            SUM(COALESCE(pko.lead_time, 0)) AS lead_time,
            SUM(COALESCE(pko.roq_unconstrained, 0)) AS roq_unconstrained,
            SUM(COALESCE(pko.roq_constrained, 0)) AS roq_constrained,
            MAX(pko.recom_receipt_date) AS recom_receipt_date,
            SUM(COALESCE(pko.safety_stock_deficit, 0)) AS safety_stock_deficit,
            SUM(COALESCE(pko.elt_projected_safety_stock, 0)) AS elt_projected_safety_stock,
            SUM(COALESCE(pko.elt_projected_store_inv, 0)) AS elt_projected_store_inv,
            ''action'' AS action,
            ARRAY_AGG(
            jsonb_build_object(
                ''size'', oors.size,
                ''historic_sales_unit'', oors.historic_sales_unit,
                ''historic_sales_value'', oors.historic_sales_value,
                ''raw_roq_earliest'', oors.raw_roq_earliest,
                ''roq_unconstrained_earliest'', oors.roq_unconstrained_earliest,
                ''date_diff'', oors.date_diff,
                ''lost_sales_aggregated_unit'', oors.lost_sales_aggregated_unit,
                ''lost_sales_aggregated_value'', oors.lost_sales_aggregated_value,
                ''store_inv'', pko.store_inv,
                ''order_quantity'', pko.order_quantity,
                ''raw_roq'', pko.raw_roq,
                ''lead_time'', pko.lead_time,
                ''roq_unconstrained'', pko.roq_unconstrained,
                ''roq_constrained'', pko.roq_constrained,
                ''recom_receipt_date'', pko.recom_receipt_date,
                ''safety_stock_deficit'', pko.safety_stock_deficit,
                ''elt_projected_safety_stock'', pko.elt_projected_safety_stock,
                ''elt_projected_store_inv'', pko.elt_projected_store_inv,
                ''oo_it'', pos.oo_it,
                ''po_count'', pos.po_count,
                ''potential_sales_unit'', oors.potential_sales_unit,
                ''potential_sales_value'', oors.potential_sales_value
            )
            ) AS product_details
            FROM filtered_oors_min oors
            INNER JOIN paf_kpi_oor pko ON oors.article = pko.article AND oors.store_code = pko.store_code AND pko.product_code = oors.product_code
            LEFT JOIN distinct_pos_counts pos ON pko.product_code = pos.product_code AND pko.store_code = pos.store_code
            GROUP BY oors.article, oors.store_code
        ) X
    ' || global.form_table_query($3);
     
    RAISE NOTICE 'v_expedite_orders_sql: %', v_expedite_orders_sql;

    OPEN $1 FOR EXECUTE v_expedite_orders_sql;
    RETURN $1;
END;
$function$
;
