--liquibase formatted sql
--changeset siddharth.bajpai@impactanalytics.co:pc_preprocess_get_store_split_strategy_19122025 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_preprocess_get_store_split_strategy

DROP PROCEDURE IF EXISTS price_markdown_opt.pc_preprocess_get_store_split_strategy;

CREATE OR REPLACE PROCEDURE price_markdown_opt.pc_preprocess_get_store_split_strategy(IN _store_split_opt text, IN _strategy_id integer, IN _tb_strategy_sku_store_mapping text, IN _store_cluster text, IN _store_split text, IN _records_cnt integer, IN _max_records_allowed integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_store_split_opt_query text;
BEGIN
    _store_split_opt_query =  format('DROP TABLE IF EXISTS %1$s;', _store_split_opt);

    IF _records_cnt > _max_records_allowed THEN
        _store_split_opt_query = _store_split_opt_query || format(
            'CREATE TABLE IF NOT EXISTS %1$s AS 
            (
                WITH prod_pcd AS 
                (
                    SELECT sku.product_level_id, sku.product_id, sku.store_id, sku.store_level_id
                    FROM %2$s sku
                    WHERE sku.strategy_id = %3$s
                    GROUP BY 1,2,3,4
                )
                SELECT 
                    t1.product_id, 
                    t3.n_cluster AS store_id, 
                    CASE 
                        WHEN t4.s1_id = 999 THEN ''Ecom'' 
                        ELSE ''Store'' 
                    END AS channel, 
                    simulation_week_start_date as week_start_date,
                    SUM(COALESCE(t4.store_split_ratio, 0)) AS store_split
                FROM prod_pcd t1
                INNER JOIN %4$s t3
                    ON t1.store_level_id = t3.store_level_id
                    AND t1.store_id = t3.store_id
                    AND t1.product_level_id = t3.product_level_id
                INNER JOIN %5$s t4
                    ON t1.product_id = t4.product_id
                    AND t1.store_id = t4.store_id
                GROUP BY 1, 2, 3, 4
            );',
            _store_split_opt, 
            _tb_strategy_sku_store_mapping, 
            _strategy_id,  
            _store_cluster, 
            _store_split
        );
    ELSE
        _store_split_opt_query = _store_split_opt_query || format(
            'CREATE TABLE IF NOT EXISTS %1$s AS 
            (
                WITH prod_pcd AS 
                (
                    SELECT sku.product_level_id, sku.product_id, sku.store_id, sku.store_level_id
                    FROM %2$s sku
                    WHERE sku.strategy_id = %3$s
                    GROUP BY 1,2,3,4
                )
                SELECT 
                    t1.product_id, 
                    t1.store_id, 
                    CASE 
                        WHEN t3.s1_id = 999 THEN ''Ecom'' 
                        ELSE ''Store'' 
                    END AS channel, 
                    simulation_week_start_date as week_start_date,
                    COALESCE(t3.store_split_ratio, 0) AS store_split
                FROM prod_pcd t1
                INNER JOIN %4$s t3
                    ON t1.product_id = t3.product_id
                    AND t1.store_id = t3.store_id
                GROUP BY 1, 2, 3, 4, 5
            );',
            _store_split_opt, 
            _tb_strategy_sku_store_mapping, 
            _strategy_id,  
            _store_split
        );
    END IF;
	raise notice 'Store Split Opt Query : %', _store_split_opt_query;
	execute _store_split_opt_query;
END;
$procedure$
;