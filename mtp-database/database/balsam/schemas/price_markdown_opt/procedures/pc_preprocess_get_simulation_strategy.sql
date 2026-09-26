--liquibase formatted sql
--changeset liquibase:pc_preprocess_get_simulation_strategy_v12062025 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_preprocess_get_simulation_strategy

DROP PROCEDURE IF EXISTS price_markdown_opt.pc_preprocess_get_simulation_strategy(IN _sim_opt text, IN _strategy_id integer, IN _tb_strategy_sku_store_mapping text, IN _product_master text, IN _strategy_pcd text, IN _fiscal_date_mapping text, IN _stg_start_date date, IN _stg_end_date date, IN _count_app_disc integer, IN _tb_strategy_rule text, IN _tb_rule_master text, IN _tb_strategy_discount text, in _discounts_filter_table text);

CREATE OR REPLACE PROCEDURE price_markdown_opt.pc_preprocess_get_simulation_strategy(IN _sim_opt text, IN _strategy_id integer, IN _tb_strategy_sku_store_mapping text, IN _product_master text, IN _strategy_pcd text, IN _fiscal_date_mapping text, IN _stg_start_date date, IN _stg_end_date date, IN _count_app_disc integer, IN _tb_strategy_rule text, IN _tb_rule_master text, IN _tb_strategy_discount text, IN _discounts_filter_table text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_sim_opt_query text;
	_sim_opt_app_disc_clause text;
begin
	_sim_opt_app_disc_clause = CASE WHEN _count_app_disc != 0 THEN format(
                'INNER JOIN %1$s df
                ON sm.product_id = df.product_id
				AND sm.base_percentage = df.markdown_percentage
                AND sm.base_percentage IS NOT NULL',
                _discounts_filter_table)
            ELSE ''
        end;

    _sim_opt_query = format(
        'DROP TABLE IF EXISTS %1$s;
        CREATE TABLE IF NOT EXISTS %1$s AS
        (
            WITH products_hierarchy AS (
                SELECT
                    sku.product_id,
                    pm.l3_cid,
                    pm.msrp AS price,
                    pm.cost,
                    sku.product_level_id,
                    sku.include_from_date,
                    pm.currency_id,
                    pm.msrp_with_vat AS price_with_vat
                FROM %2$s sku
                LEFT JOIN %3$s pm
                ON sku.product_id = pm.product_id
                WHERE sku.strategy_id = %4$s
                AND pm.is_active = 1
                GROUP BY 1,2,3,4,5,6,7,8
            ),
            pcd_week AS (
                SELECT
                    pcd_id,
                    pcd_start_date AS start_date,
                    pcd_end_date AS end_date,
                    weeks_start_date AS week_start_date
                FROM %5$s b1
                INNER JOIN %6$s fdm
                ON fdm.date >= b1.pcd_start_date
                AND fdm.date <= b1.pcd_end_date
                WHERE strategy_id = %4$s
                AND pcd_start_date >= ''%7$s''
                AND pcd_end_date <= ''%8$s''
                GROUP BY 1,2,3,4
            )
            SELECT
                ph.product_id,
                ph.currency_id,
                pcd_id AS event,
                sm.week_start_date,
                ph.price AS original_price,
                ph.cost AS cost_price,
                (ph.price - (ph.price * sm.base_percentage / 100)) AS selling_price,
                CONCAT(''percent_off_'', CAST(sm.base_percentage AS text)) AS offer_identifier,
                sm.base_percentage AS effective_opt_discount,
                ph.price_with_vat as original_price_with_vat,
                (ph.price_with_vat - (ph.price_with_vat * sm.base_percentage / 100)) AS selling_price_with_vat,
                SUM(COALESCE(day_split_ratio * sales_units, 0)) AS pred_qty_ecom
            FROM price_markdown_opt.mvm_sim_%4$s sm
            %9$s
            INNER JOIN products_hierarchy ph
            ON sm.product_id = ph.product_id
            INNER JOIN pcd_week pw
            ON sm.week_start_date = pw.week_start_date
            INNER JOIN price_markdown_opt.mvm_day_split_%4$s ds
            ON ds.date BETWEEN start_date AND end_date
            AND ds.l3_cid = ph.l3_cid
            AND ds.week_start_date = sm.week_start_date
            GROUP BY 1,2,3,4,5,6,7,8,9,10,11
        );',
        _sim_opt, _tb_strategy_sku_store_mapping, _product_master, _strategy_id,
        _strategy_pcd, _fiscal_date_mapping, _stg_start_date, _stg_end_date, _sim_opt_app_disc_clause);
    raise notice 'Sim strategy opt query : %', _sim_opt_query;
   execute _sim_opt_query;
END;
$procedure$
;
