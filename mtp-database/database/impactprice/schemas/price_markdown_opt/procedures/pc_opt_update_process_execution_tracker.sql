--liquibase formatted sql
--changeset liquibase:pc_opt_update_process_execution_tracker_110924 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_opt_update_process_execution_tracker

DROP PROCEDURE IF EXISTS price_markdown_opt.pc_opt_update_process_execution_tracker(IN _query_clause TEXT);

CREATE OR REPLACE PROCEDURE price_markdown_opt.pc_opt_update_process_execution_tracker(
    IN _query_clause TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $procedure$
BEGIN
    EXECUTE format('UPDATE price_markdown_opt.process_execution_tracker %s', _query_clause);
END;
$procedure$;