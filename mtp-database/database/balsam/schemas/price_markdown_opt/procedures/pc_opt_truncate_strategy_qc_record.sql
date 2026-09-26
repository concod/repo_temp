--liquibase formatted sql
--changeset liquibase:pc_opt_truncate_strategy_qc_record runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_opt_truncate_strategy_qc_record

DROP PROCEDURE IF EXISTS price_markdown_opt.pc_opt_truncate_strategy_qc_record();

CREATE OR REPLACE PROCEDURE price_markdown_opt.pc_opt_truncate_strategy_qc_record()
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    EXECUTE 'TRUNCATE TABLE price_markdown_opt.tb_strategy_qc_record';
    RAISE NOTICE 'Table tb_strategy_qc_record has been truncated';
END;
$$;