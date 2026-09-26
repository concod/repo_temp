--liquibase formatted sql
--changeset surya.avinash@impactanalytics.co:pc_update_process_tracker_post_ingestion runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_update_process_tracker_post_ingestion

DROP PROCEDURE IF EXISTS price_markdown_opt.pc_update_process_tracker_post_ingestion();

CREATE OR REPLACE PROCEDURE price_markdown_opt.pc_update_process_tracker_post_ingestion()
LANGUAGE plpgsql
AS $$
DECLARE
    _inv_date DATE;
    _trans_date DATE;
begin
	select max(date) from global.tb_latest_inventory into _inv_date;
	select max(date_id) from price_markdown_opt.tb_transaction_latest_mkd into _trans_date;

	call price_markdown_opt.pc_opt_update_process_execution_tracker('set updated_date = current_date  where process_name = ''data_ingestion'';');
    call price_markdown_opt.pc_opt_update_process_execution_tracker('set start_flag=1, end_flag=1  where process_name = ''actualization'';');
	call price_markdown_opt.pc_opt_update_process_execution_tracker('set start_flag=1, end_flag=1  where process_name = ''strategy_sync'';');
	call price_markdown_opt.pc_opt_update_process_execution_tracker('set updated_date= ''' || to_char(_trans_date, 'YYYY-MM-DD') || ''' where process_name = ''trans_date'';');
	call price_markdown_opt.pc_opt_update_process_execution_tracker('set updated_date= ''' || to_char(_inv_date, 'YYYY-MM-DD') || '''  where process_name = ''inv_date'';');

    RAISE NOTICE 'Process execution tracker updated successfully.';
END;
$$;