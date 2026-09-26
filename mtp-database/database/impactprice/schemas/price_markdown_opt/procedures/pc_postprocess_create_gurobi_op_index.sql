--liquibase formatted sql
--changeset liquibase:pc_postprocess_create_gurobi_op_index_add_security_definer runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: added security definer for pc_postprocess_create_gurobi_op_index

DROP PROCEDURE IF EXISTS price_markdown_opt.pc_postprocess_create_gurobi_op_index(integer, text);

CREATE OR REPLACE PROCEDURE price_markdown_opt.pc_postprocess_create_gurobi_op_index(_strategy_id INTEGER, _gurobi_output TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    EXECUTE format(
        'CREATE INDEX idx_gurobi_op_%1$s ON %2$s USING btree (product_level_id, store_level_id, event);',
        _strategy_id,
        _gurobi_output
    );
END;
$$;
