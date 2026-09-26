--liquibase formatted sql
--changeset liquibase:pc_preprocess_get_store_split_strategy_12062025 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_preprocess_get_store_split_strategy

DROP PROCEDURE IF EXISTS price_markdown_opt.pc_preprocess_get_store_split_strategy;

CREATE OR REPLACE PROCEDURE price_markdown_opt.pc_preprocess_get_store_split_strategy(IN _store_split_opt text, IN _strategy_id integer, IN _tb_strategy_sku_store_mapping text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
    _store_split_opt_query text;
BEGIN
    _store_split_opt_query =  format('DROP TABLE IF EXISTS %1$s;', _store_split_opt);


    _store_split_opt_query = _store_split_opt_query || format(
            'CREATE TABLE IF NOT EXISTS %1$s AS
            (
                WITH prod_week AS
                (
                    select product_id, week_start_date
                    from price_markdown_opt.mvm_sim_%3$s sm
					group by 1,2
                )
                SELECT
                    t1.product_id,
                    t3.store_id,
                    ''Ecom'' AS channel,
                    week_start_date,
                    1 AS store_split
                FROM prod_week t1
                INNER JOIN %2$s t3
                    ON t1.product_id = t3.product_id
                    AND t3.strategy_id = %3$s
                GROUP BY 1, 2, 3, 4, 5
            );',
            _store_split_opt,
            _tb_strategy_sku_store_mapping,
            _strategy_id
        );
    raise notice 'Store Split Opt Query : %', _store_split_opt_query;
    execute _store_split_opt_query;
END;
$procedure$
;
