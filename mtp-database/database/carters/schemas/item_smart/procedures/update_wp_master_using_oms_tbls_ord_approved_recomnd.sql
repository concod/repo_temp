--liquibase formatted sql
--changeset hari.krishna@impactanalytics.co:oms_tables_update runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:item_smart_initial_commit_ph-new-sku-1
--comment: initial changeset for ph-new-sku-1
--rollback: SELECT 1

Drop PROCEDURE IF exists item_smart.update_wp_master_using_oms_tbls_ord_approved_recomnd();

CREATE OR REPLACE PROCEDURE item_smart.update_wp_master_using_oms_tbls_ord_approved_recomnd()
 LANGUAGE plpgsql
AS $procedure$
DECLARE
    v_sql text;
BEGIN
    -- Step 1: Create temp table with aggregated OMS data
    v_sql := '
    CREATE TEMP TABLE temp_oms_data AS 
    WITH ok AS (
        SELECT product_code,
               COALESCE(editable_expected_receipt_date, expected_receipt_date) AS editable_expected_receipt_date,
               order_status_id,
               SUM(order_quantity) AS order_quantity,
               sum(raw_roq) AS raw_roq
        FROM item_smart.oms_orders_approved
        WHERE is_deleted = false AND order_status_id = 3
        GROUP BY 1,2,3
        UNION ALL 
        SELECT product_code,
               COALESCE(editable_expected_receipt_date, expected_receipt_date) AS editable_expected_receipt_date,
               order_status_id,
               SUM(order_quantity) AS order_quantity,
               SUM(raw_roq) AS raw_roq
        FROM item_smart.oms_orders_recommended
        WHERE order_status_id IN (1, -1, 0)
        GROUP BY 1,2,3
    ),
    style_ok AS (
        SELECT l0_name AS country,
               l1_name AS channel,
               l2_name, l3_name, l4_name, l5_name,
               pm.style,
               fdm.fiscal_year_week,
               SUM(order_quantity) AS order_quantity,
               SUM(raw_roq) AS raw_roq
        FROM ok
        JOIN global.product_attributes_filter pm USING(product_code)
        LEFT JOIN global.fiscal_date_mapping fdm ON fdm.calendar_date = ok.editable_expected_receipt_date
        GROUP BY l0_name, l1_name, l2_name, l3_name, l4_name, l5_name, pm.style, fdm.fiscal_year_week
    )
    SELECT phffi.hierarchy_code,
           style_ok.channel,
           style_ok.fiscal_year_week AS current_week,
           style_ok.order_quantity AS ia_vendor_adj_roq,
           style_ok.raw_roq AS base_roq
    FROM style_ok
    JOIN item_smart.product_hierarchies_filter_flattened_item phffi
         USING(country, channel, l2_name, l3_name, l4_name, l5_name, style);
    ';
    EXECUTE v_sql;

  -- Step 2: Update wp_master with all nulls first
 v_sql := '
    UPDATE item_smart.wp_master wpm
    SET base_roq = null,
        ia_vendor_adj_roq = null';
    EXECUTE v_sql;


    -- Step 3: Update wp_master with data from temp_oms_data
    v_sql := '
    UPDATE item_smart.wp_master wpm
    SET base_roq = t.base_roq,
        ia_vendor_adj_roq = t.ia_vendor_adj_roq
    FROM temp_oms_data t
    WHERE wpm.hierarchy_code = t.hierarchy_code
      AND wpm.current_week = t.current_week
      AND wpm.channel = t.channel;
    ';
    EXECUTE v_sql;
END;
$procedure$
;
