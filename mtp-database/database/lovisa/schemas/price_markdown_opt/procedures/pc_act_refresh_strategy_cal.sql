--liquibase formatted sql
--changeset liquibase:pc_act_refresh_strategy_cal_03032026 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_act_refresh_strategy_cal

DROP PROCEDURE IF EXISTS price_markdown_opt.pc_act_refresh_strategy_cal(_int4, date, date);

CREATE OR REPLACE PROCEDURE price_markdown_opt.pc_act_refresh_strategy_cal(IN _sid integer[], IN _start_date date, IN _end_date date)
 LANGUAGE plpgsql
  SECURITY DEFINER
AS $procedure$
BEGIN
    -- Drop the table if it exists
    EXECUTE 'DROP TABLE IF EXISTS price_markdown_opt.tb_act_strategy_cal';

    -- Create the table
    EXECUTE '
        CREATE TABLE price_markdown_opt.tb_act_strategy_cal AS
        SELECT
            strategy_id,
            pcd_id,
            start_date,
            end_date,
            product_level_id,
            store_level_id,
            product_id,
            store_id,
            recommended_offer_percentage,
            CASE
                WHEN fisc.date = tab1.start_date THEN previous_markdown_percentage
                ELSE recommended_offer_percentage
            END AS lag_promo,
            effective_price_point,
            effective_price_point_with_vat,
            stat_id,
            fisc.date
        FROM (
            SELECT
                st_cal.strategy_id,
                st_cal.pcd_id,
                st_cal.pcd_start_date AS start_date,
                st_cal.pcd_end_date AS end_date,
                b2.product_id,
                b2.store_id,
                b2.product_level_id,
                b2.store_level_id,
                b2.recommended_offer_percentage,
                b2.previous_markdown_percentage,
                b2.effective_price_point,
                b2.effective_price_point_with_vat,
                b2.stat_id
            FROM (
                SELECT pcd_id, strategy_id, pcd_start_date, pcd_end_date
                FROM price_markdown.tb_strategy_pcd
                WHERE strategy_id = ANY($1)
            ) st_cal
            INNER JOIN (
                SELECT product_id, store_id, strategy_id, product_level_id, store_level_id, pcd_id, markdown_percentage as recommended_offer_percentage,
				previous_markdown_percentage, effective_price_point, effective_price_point_with_vat, stat_id
                FROM price_markdown_opt_temp.tb_stg_disc_local_temp
                WHERE strategy_id = ANY($1)
            ) b2
            ON st_cal.strategy_id = b2.strategy_id
            AND st_cal.pcd_id = b2.pcd_id
        ) tab1
        INNER JOIN global.tb_fiscal_date_mapping fisc
        ON fisc.date BETWEEN tab1.start_date AND tab1.end_date
        WHERE fisc.date >= $2
        AND fisc.date <= $3'
    USING _sid, _start_date, _end_date;

END;
$procedure$
;