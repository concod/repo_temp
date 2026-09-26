--liquibase formatted sql
--changeset surya.avinash@impactanalytics.co:pc_create_materialized_view_sim_schema_change_v2 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: schema changes for pc_create_materialized_view_sim

DROP PROCEDURE IF EXISTS price_markdown_opt.pc_create_materialized_view_sim(int4);

CREATE OR REPLACE PROCEDURE price_markdown_opt.pc_create_materialized_view_sim(IN _strategy_id integer)
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
    _table_name := 'mvm_sim_'|| _strategy_id ;
    _index_name := 'mvm_sim_bp_index_'|| _strategy_id;

    -- Use the function to get week_start_date range
    SELECT start_date, end_date
    INTO _start_date, _end_date
    FROM price_markdown_opt.fn_get_week_start_dates(_strategy_id);

    EXECUTE FORMAT('
        DROP MATERIALIZED VIEW IF EXISTS price_markdown_opt.%I;
        CREATE MATERIALIZED VIEW IF NOT EXISTS price_markdown_opt.%I AS
        SELECT product_id, week_start_date, base_percentage, bnm_sales_units, ecom_sales_units, bnm_elasticity, ecom_elasticity
        FROM price_markdown_opt.tb_simulation_week_mkd t1
        WHERE week_start_date BETWEEN %L AND %L
            AND product_id IN (SELECT product_id
                            FROM price_markdown.tb_strategy_sku_store_mapping tsssm
                            WHERE strategy_id = %s
                            GROUP BY 1);

        CREATE INDEX IF NOT EXISTS %I ON price_markdown_opt.%I USING btree (product_id, base_percentage);',
        _table_name, _table_name, _start_date, _end_date, _strategy_id, _index_name, _table_name);
END;
$procedure$
;