--liquibase formatted sql
--changeset siddharth.bajpai@impactanalytics.co:pc_get_sku_store_date_disc_resim_15122025 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: simulation schema changes for pc_get_sku_store_date_disc_resim_15122025

DROP PROCEDURE IF EXISTS price_markdown_opt.pc_get_sku_store_date_disc_resim(int4, int4, int4, date, text);

CREATE OR REPLACE PROCEDURE price_markdown_opt.pc_get_sku_store_date_disc_resim(IN _strategy_id integer, IN _min_strategy_disc_id integer, IN _max_strategy_disc_id integer, IN _pcd_start_date date, IN _table_type text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
DECLARE _table_name text;
        _table_name_1 text;
        _table_name_2 text;
        _idx_name text;
        vl_query text;
        v2_query text;
        v3_query text;
        _day_split_table text;
        _store_split_table text;

BEGIN
    -- Construct the dynamic SQL statement to drop the table
    _table_name := 'tb_ssd_'||_table_type ||_strategy_id;
    _table_name_1 := 'tb_ssd_'||_table_type ||_strategy_id || '_1';
    _table_name_2 := 'tb_ssd_'||_table_type ||_strategy_id || '_2';
    _idx_name := 'idx_item_mp'||_strategy_id;
    _day_split_table := 'mvm_day_split_' ||_strategy_id;
    _store_split_table := 'mvm_store_split_' ||_strategy_id;
--    _inv_table := 'mvm_'||_strategy_id || '_inv';

        vl_query := FORMAT('DROP TABLE IF EXISTS price_markdown_opt_temp.%I;
            CREATE UNLOGGED TABLE price_markdown_opt_temp.%I AS
            select a1.*, pcd_start_date AS start_date, pcd_end_date AS end_date
                from
                (SELECT d1.strategy_id, d1.product_level_id, d1.store_level_id, d1.pcd_id as EVENT,
                d1.markdown_percentage as markdown_percentage_exact, floor(d1.markdown_percentage / 5.0) * 5 as markdown_percentage,
                previous_markdown_percentage
                            FROM price_markdown.tb_strategy_discount d1
                            WHERE d1.strategy_id = $1
                            AND EXISTS (
                                SELECT 1
                                FROM price_markdown.tb_strategy_discount d2
                                WHERE d2.strategy_id = d1.strategy_id
                                AND d2.product_level_id = d1.product_level_id
                                AND d2.store_level_id = d1.store_level_id
                                and id BETWEEN $2 AND $3
                                LIMIT 1)) a1
                            INNER JOIN price_markdown.tb_strategy_pcd a2
                            ON a1.EVENT = a2.pcd_id
                             ;
            ', _table_name_1, _table_name_1) ;

        raise notice 'CTE --- %', vl_query;
        execute vl_query using _strategy_id ,_min_strategy_disc_id, _max_strategy_disc_id;

        v2_query := FORMAT('DROP TABLE IF EXISTS price_markdown_opt_temp.%I;
                            CREATE UNLOGGED TABLE price_markdown_opt_temp.%I AS
            SELECT
                 tb1.*,
                 tb2.total_inventory
             FROM
                 (
                 SELECT
                     a1.*, a2.product_id, a2.store_id,
                     a3.l3_cid, a3.l0_cid, a3.msrp as price, a3.cost, a2.channel_info,
                     a3.currency_id, a3.msrp_with_vat as price_with_vat
                 FROM price_markdown_opt_temp.%I a1
                 INNER JOIN price_markdown.tb_strategy_sku_store_mapping_%s a2
                 ON a1.product_level_id = a2.product_level_id
                 and a1.store_level_id = a2.store_level_id
                 and a1.strategy_id = a2.strategy_id
                 INNER JOIN price_markdown.product_master a3
                 ON a2.product_id = a3.product_id) tb1
                 INNER JOIN global.tb_latest_inventory tb2
                 ON tb1.product_id = tb2.product_id
                 AND tb1.store_id = tb2.store_id;
            ', _table_name_2, _table_name_2, _table_name_1, _strategy_id) ;

        raise notice 'CTE --- %', v2_query;
        execute v2_query;

       v3_query := FORMAT('DROP TABLE IF EXISTS price_markdown_opt_temp.%I;
                            CREATE UNLOGGED TABLE price_markdown_opt_temp.%I AS
            SELECT
                 tb1.*,
                 tb2.day_split_ratio,
                 tb2.simulation_week_start_date AS week_start_date,
                 tb2.date,
                 tb3.store_split_ratio AS store_ratio
             FROM
                 price_markdown_opt_temp.%I tb1
            INNER JOIN price_markdown.tb_store_master sm
            ON tb1.store_id = sm.store_id
            INNER JOIN price_markdown_opt.%I tb2
            ON tb2.date between start_date and end_date
            and tb1.l3_cid = tb2.l3_cid
            and tb1.l0_cid = tb2.l0_cid
            and tb2.date >= $1
            and tb2.s0_id = sm.s0_id
            and tb2.s1_id = sm.s1_id
            INNER JOIN price_markdown_opt.%I tb3
            ON tb1.product_id = tb3.product_id
            AND tb1.store_id = tb3.store_id
			AND tb2.simulation_week_start_date = tb3.simulation_week_start_date
            AND tb3.s0_id = sm.s0_id
            AND tb3.s1_id = sm.s1_id ;
            ', _table_name, _table_name, _table_name_2, _day_split_table, _store_split_table) ;

        raise notice 'CTE --- %', v3_query;
        execute v3_query using _pcd_start_date;

END;
$procedure$
;
