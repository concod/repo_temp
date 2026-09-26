--liquibase formatted sql
--changeset durgaprasad.tulugu@impactanalytics.co:fn_custom_alerts_step2_save_1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for price_markdown.fn_custom_alerts_step2_save_1

DROP FUNCTION if exists price_markdown.fn_custom_alerts_step2_save;


CREATE OR REPLACE FUNCTION price_markdown.fn_custom_alerts_step2_save(p_user_id integer, p_alert_id integer, p_metrics_info jsonb)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
	current_alert_record price_markdown.tb_custom_alerts_master%ROWTYPE;
	is_create_flow bool := true;
BEGIN
	select * into current_alert_record from price_markdown.tb_custom_alerts_master where alert_id = p_alert_id;
	-- Check if there is any existing data for the given alert_id in the tb_custom_alerts_metrics table
    if exists (select 1 from price_markdown.tb_custom_alerts_metrics where alert_id = p_alert_id) or current_alert_record.created_by != p_user_id then
        is_create_flow := false;
    end if;
	
    -- Delete existing records for the given alert_id
    delete from price_markdown.tb_custom_alerts_metrics 
    where alert_id = p_alert_id;

    -- Insert new records from jsonb input
    insert into price_markdown.tb_custom_alerts_metrics (alert_id, operator_id, metric_id, logical_operator, threshold_value)
    select 
        p_alert_id as alert_id, 
        tbl.operator_id, 
        tbl.metric_id, 
        tbl.logical_operator,
        tbl.threshold_value
    from 
        jsonb_to_recordset(p_metrics_info) 
        as tbl (id int4, operator_id int4, metric_id int4, logical_operator text, threshold_value int8);

	-- If not create flow, update updated_by and updated_at
	if not is_create_flow then
	    update price_markdown.tb_custom_alerts_master
	    set 
	        updated_by = p_user_id,
	        updated_at = now()
	    where alert_id = p_alert_id;
	end if;

END;
$function$
;
