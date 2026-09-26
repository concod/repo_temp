--liquibase formatted sql
--changeset siddharth.bajpai@impactanalytics.co:pc_create_materialized_view_store_split_15122025 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_create_materialized_view_store_split_15122025

DROP PROCEDURE IF EXISTS price_markdown_opt.pc_create_materialized_view_store_split;

CREATE OR REPLACE PROCEDURE price_markdown_opt.pc_create_materialized_view_store_split(IN _strategy_id integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
DECLARE
    _table_name TEXT;
    _index_name TEXT;
    _start_date DATE;
    _end_date DATE;
BEGIN
    -- Dynamic SQL to create materialized view
    _table_name := 'mvm_store_split_' || _strategy_id;
    _index_name := 'mvm_store_split_bp_index_' || _strategy_id;

    -- Use the function to get week_start_date range
    SELECT start_date, end_date
    INTO _start_date, _end_date
    FROM price_markdown_opt.fn_get_week_start_dates(_strategy_id);

    EXECUTE FORMAT('
        DROP MATERIALIZED VIEW IF EXISTS price_markdown_opt.%I;
        CREATE MATERIALIZED VIEW IF NOT EXISTS price_markdown_opt.%I AS
        select tb1.*
		FROM price_markdown_opt.tb_store_split_mkd tb1
		join
			(select product_id, store_id
			from price_markdown.tb_strategy_sku_store_mapping tsssm
			where tsssm.strategy_id = %s
			group by 1,2) tb2
		ON tb1.simulation_week_start_date between %L and %L
		AND tb1.product_id = tb2.product_id
		AND tb1.store_id = tb2.store_id;

        CREATE INDEX IF NOT EXISTS %I ON price_markdown_opt.%I USING btree (product_id, store_id, simulation_week_start_date, s0_id, s1_id);',
        _table_name, _table_name, _strategy_id, _start_date, _end_date, _index_name, _table_name);
END;
$procedure$
;