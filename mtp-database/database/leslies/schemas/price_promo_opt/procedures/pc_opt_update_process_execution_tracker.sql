--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:pc_opt_update_process_execution_tracker runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_opt_update_process_execution_tracker

DROP PROCEDURE IF EXISTS price_promo_opt.pc_opt_update_process_execution_tracker ;
CREATE OR REPLACE PROCEDURE price_promo_opt.pc_opt_update_process_execution_tracker(IN _query_clause text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
BEGIN
    EXECUTE format('UPDATE price_promo_opt.process_execution_tracker %s', _query_clause);
END;
$procedure$
;
