--liquibase formatted sql
--changeset liquibase:keerthana.reddy@impactanalytics.com: pc_act_insert_ssd_temp_04062025 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_act_insert_ssd_temp

DROP PROCEDURE IF EXISTS price_markdown_opt.pc_act_insert_ssd_temp(IN _start_date date, IN _end_date date);

CREATE OR REPLACE PROCEDURE price_markdown_opt.pc_act_insert_ssd_temp(IN _start_date date, IN _end_date date)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
DECLARE
    _sid INTEGER[];
   _truncate_and_insert_query text;
BEGIN
    -- Get strategy_ids from price_markdown_opt.actualization_tracker where actualization_flag = 0
    SELECT ARRAY_AGG(strategy_id)::INTEGER[] INTO _sid
    FROM price_markdown_opt.actualization_tracker
    WHERE actualization_flag = 0;

    -- Call the procedure to refresh strategy_cal_act table
    CALL price_markdown_opt.pc_act_refresh_strategy_cal(_sid, _start_date, _end_date);

    -- Call the procedure to get sku store mapping in seperate table and index it
    CALL price_markdown_opt.pc_act_create_tb_sku_store_mapping(_sid);

    -- Truncate the tb_temp_ssd_actuals table
    _truncate_and_insert_query = FORMAT('TRUNCATE TABLE price_markdown_opt.tb_temp_ssd_actuals;

    INSERT INTO price_markdown_opt.tb_temp_ssd_actuals(strategy_id, product_id, store_id, product_level_id,
                                 store_level_id, recommendation_date, recommended_offer_percentage,
                                 effective_price_point, pcd_id, sales_units, margin, revenue, status,
                                 created_at, updated_at, created_by, updated_by, rem_inv, spend,
                                 currency_id, effective_price_point_with_vat, margin_with_vat, revenue_with_vat,
                                 spend_with_vat)
   ( WITH sku_store_base AS (
        SELECT tb1.*,
               tb2.product_id, tb2.store_id, tb2.inv_oh, tb2.currency_id
        FROM (
            SELECT x1.strategy_id, x1.product_id, x1.store_id, x1.product_level_id, x1.store_level_id, 
                   COALESCE(x2.total_inventory,0) AS inv_oh,
                   x1.currency_id
            FROM price_markdown_opt.tb_act_sku_store_mapping x1
            LEFT JOIN global.tb_latest_inventory x2
            ON x1.product_id = x2.product_id
            AND x1.store_id = x2.store_id
        ) tb2
        INNER JOIN price_markdown_opt.tb_act_strategy_cal tb1
        ON tb2.strategy_id = tb1.strategy_id
        AND tb2.product_level_id = tb1.product_level_id
        AND tb2.store_level_id = tb1.store_level_id
    ),

    txn_data AS (
        SELECT a1.strategy_id, a1.product_id, a1.store_id, a1.product_level_id,
               a1.store_level_id, a1.date, a1.pcd_id, a1.inv_oh,
               a1.currency_id,
               COALESCE(a2.gross_quantity, 0) AS sales_units, 
               COALESCE(a2.gross_margin, 0) AS margin,
               COALESCE(a2.gross_revenue, 0) AS revenue, 
               COALESCE(a2.retail_price, 0) AS effective_price_point,
               COALESCE(a2.final_amount, 0) AS final_amount,
               COALESCE(a1.recommended_offer_percentage, 0) AS recommended_offer_percentage,
               COALESCE(SUM(a2.gross_quantity) OVER(PARTITION BY a1.strategy_id, a1.product_id, a1.store_id ORDER BY a1.date), 0) AS cumsum_sales,
               COALESCE(a2.gross_margin_with_vat, 0) AS margin_with_vat,
               COALESCE(a2.gross_revenue_with_vat, 0) AS revenue_with_vat,
               COALESCE(a2.retail_price_with_vat, 0) AS effective_price_point_with_vat,
               COALESCE(a2.final_amount_with_vat, 0) AS final_amount_with_vat
        FROM sku_store_base a1
        LEFT JOIN price_markdown_opt.tb_transaction_latest_mkd a2
        ON a1.date = a2.date_id
        AND a1.product_id = a2.product_id
        AND a1.store_id = a2.store_id
        AND a2.date_id >= ''%1$s''
        AND a2.date_id <= ''%2$s''
        WHERE a1.inv_oh > 0 OR a2.gross_quantity > 0
    ),

    cal_rem_inv AS (
        SELECT *,
               COALESCE(CASE WHEN (start_day_inv - sales_units) < 0
                            THEN 0 ELSE (start_day_inv - sales_units)
                       END, 0) AS rem_inv
        FROM (
            SELECT *,
                   COALESCE(CASE WHEN (sales_units + (inv_oh - cumsum_sales))> 0
                                THEN (sales_units + (inv_oh - cumsum_sales))
                                ELSE 0 END, 0) AS start_day_inv
            FROM txn_data
        ) tab1
    ),

    final_cal AS (
        SELECT tb1.*,
               COALESCE(round(CAST(((final_amount * sales_units)/100) AS NUMERIC), 2), 0) AS spend,
               COALESCE(round(CAST(((final_amount_with_vat * sales_units)/100) AS NUMERIC), 2), 0) AS spend_with_vat
        FROM cal_rem_inv tb1
    )

    SELECT strategy_id, product_id, store_id, product_level_id, store_level_id,
           date AS recommendation_date, recommended_offer_percentage, effective_price_point,
           pcd_id, sales_units, margin, revenue, 1 AS status, current_timestamp AS created_at,
           current_timestamp AS updated_at, 0 AS created_by, 0 AS updated_by, rem_inv, spend,
           currency_id, effective_price_point_with_vat, margin_with_vat, revenue_with_vat, spend_with_vat
    FROM final_cal);', _start_date, _end_date, _sid);
    raise notice '_truncate_and_insert_query : %', _truncate_and_insert_query;
	execute _truncate_and_insert_query;
END;
$procedure$
;