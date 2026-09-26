--liquibase formatted sql
--changeset liquibase:keerthana.reddy@impactanalytics.com:pc_preprocess_get_store_split_strategy_26112025 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_preprocess_get_store_split_strategy

DROP PROCEDURE IF EXISTS price_markdown_opt.pc_preprocess_get_store_split_strategy;

CREATE OR REPLACE PROCEDURE price_markdown_opt.pc_preprocess_get_store_split_strategy(IN _store_split_opt text, IN _strategy_id integer, IN _tb_strategy_sku_store_mapping text, IN _store_cluster text, IN _store_split text, IN _records_cnt integer, IN _max_records_allowed integer, IN _currency_type text)
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
                    SELECT sku.product_level_id, sku.product_id, sku.store_id, sku.store_level_id, 
                    s1_id, s0_id, channel, ''%6$s'' as currency_type
                    FROM %2$s_%3$s sku
					left join (select distinct store_id, s0_id, s1_id, s2_id as channel
                         from price_markdown.tb_store_master) sm
					on sku.store_id = sm.store_id
                    GROUP BY 1,2,3,4,5,6,7
                )
                SELECT 
                    t1.product_id,
					case when currency_type = ''local'' 
                        then t1.s1_id when currency_type = ''dominating'' 
                        then t1.s0_id else 1 end as country_id,
                    t3.n_cluster AS store_id, 
                    CASE 
                        WHEN t1.channel = 2 THEN ''Ecom'' 
                        ELSE ''Store'' 
                    END AS channel, 
                    week_start_date,
                    SUM(COALESCE(t4.store_ratio, 0)) AS store_split
                FROM prod_pcd t1
                INNER JOIN %4$s t3
                    ON t1.store_level_id = t3.store_level_id
                    AND t1.store_id = t3.store_id
                    AND t1.product_level_id = t3.product_level_id
                INNER JOIN %5$s t4
                    ON t1.product_id = t4.product_id
                    AND t1.store_id = t4.store_id
                GROUP BY 1, 2, 3, 4, 5
            );',
            _store_split_opt, 
            _tb_strategy_sku_store_mapping, 
            _strategy_id,  
            _store_cluster, 
            _store_split,
			_currency_type
        );
    ELSE
        _store_split_opt_query = _store_split_opt_query || format(
            'CREATE TABLE IF NOT EXISTS %1$s AS 
            (
                WITH prod_pcd AS 
                (
                    SELECT sku.product_level_id, sku.product_id, sku.store_id, sku.store_level_id, 
                    s1_id, s0_id, channel, ''%5$s'' as currency_type
                    FROM %2$s_%3$s sku
					left join (select distinct store_id, s0_id, s1_id, s2_id as channel 
                        from price_markdown.tb_store_master) sm
					on sku.store_id = sm.store_id
                    GROUP BY 1,2,3,4,5,6,7
                )
                SELECT 
                    t1.product_id,
					case when currency_type = ''local'' 
                        then t1.s1_id when currency_type = ''dominating'' 
                        then t1.s0_id else 1 end as country_id,
                    t1.store_id, 
                    CASE 
                        WHEN t1.channel = 2 THEN ''Ecom'' 
                        ELSE ''Store'' 
                    END AS channel,
                    week_start_date,
                    SUM(COALESCE(t4.store_ratio, 0)) AS store_split
                FROM prod_pcd t1
                INNER JOIN %4$s t4
                    ON t1.product_id = t4.product_id
                    AND t1.store_id = t4.store_id
                GROUP BY 1, 2, 3, 4, 5
            );',
            _store_split_opt, 
            _tb_strategy_sku_store_mapping, 
            _strategy_id,  
            _store_split,
			_currency_type
        );
    END IF;
	raise notice 'Store Split Opt Query : %', _store_split_opt_query;
	execute _store_split_opt_query;
END;
$procedure$
;
