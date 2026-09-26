--liquibase formatted sql
--changeset keerthana.reddy@impactanalytics.com:pc_postprocess_create_gurobi_op_index_26112025 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: added security definer for pc_postprocess_create_gurobi_op_index

DROP PROCEDURE IF EXISTS price_markdown_opt.pc_postprocess_create_gurobi_op_index;

CREATE OR REPLACE PROCEDURE price_markdown_opt.pc_postprocess_create_gurobi_op_index(_strategy_id INTEGER, _gurobi_output TEXT, _currency_type TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    EXECUTE format(
        'CREATE INDEX idx_gurobi_op_%3$s_%1$s ON %2$s_%3$s_%1$s USING btree (product_level_id, store_level_id, event);',
        _strategy_id,
        _gurobi_output,
        _currency_type
    );
END;
$$;
