--liquibase formatted sql
--changeset surya.avinash@impactanalytics.co:pc_preprocess_get_prev_pcd_strategy_v1608 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: discount changes for pc_preprocess_get_prev_pcd_strategy

DROP PROCEDURE IF EXISTS price_markdown_opt.pc_preprocess_get_prev_pcd_strategy;

CREATE OR REPLACE PROCEDURE price_markdown_opt.pc_preprocess_get_prev_pcd_strategy(IN _prev_pcd_opt text, IN _strategy_id integer, IN _actual_exist integer, IN _strategy_pcd text, IN _stg_start_date date, IN _strategy_discount text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_get_prev_pcd_query text;
BEGIN
    IF _actual_exist = 1 THEN
        _get_prev_pcd_query = format(
            'DROP TABLE IF EXISTS %1$s;
            CREATE TABLE IF NOT EXISTS %1$s AS (
                WITH pcd_date AS (
                    SELECT pcd_id
                    FROM %2$s
                    WHERE strategy_id = %3$s
                    AND pcd_start_date < ''%4$s''
                )
                SELECT
                    CONCAT(CAST(product_level_id AS TEXT), ''_'', CAST(store_level_id AS TEXT)) AS Opt_level_bins,
                    a1.pcd_id AS event,
                    CONCAT(''percent_off_'', CAST(ROUND(markdown_percentage)  AS TEXT)) AS offer_identifier,
                    markdown_percentage AS effective_opt_discount
                FROM %5$s a1
                INNER JOIN pcd_date a2
                USING(pcd_id)
                WHERE strategy_id = %3$s
            );',
            _prev_pcd_opt, _strategy_pcd, _strategy_id, _stg_start_date, _strategy_discount);
    ELSE
        _get_prev_pcd_query = format(
            'DROP TABLE IF EXISTS %1$s;
            CREATE TABLE IF NOT EXISTS %1$s (
                opt_level_bins text,
                event text,
                offer_identifier text,
                effective_opt_discount int
            );',
            _prev_pcd_opt);
    END IF;
   raise notice 'Get Previous PCD discounts query : %', _get_prev_pcd_query;
  execute _get_prev_pcd_query;
END;
$procedure$
;


