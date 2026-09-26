--liquibase formatted sql
--changeset durgaprasad.tulugu@impactanalytics.co:fn_insert_auto_archive_logs_2 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: fn_logic_change_2.
--rollback: SELECT 1
DROP FUNCTION if exists price_markdown.fn_insert_auto_archive_logs;
CREATE OR REPLACE FUNCTION price_markdown.fn_insert_auto_archive_logs(action_date_ date, action_time_ timestamp without time zone, action_type_ text, strategies_ids_ integer[], is_entry_before_archive_ boolean DEFAULT true)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Check if strategies_ids_ is not empty
	IF array_length(strategies_ids_, 1) > 0 THEN
        -- Insert into tb_auto_archive_strategy_logs
    	INSERT INTO price_markdown.tb_auto_archive_strategy_logs (action_date, action_time, action_type, strategy_id, start_date, end_date, status, is_entry_before_archive)
        SELECT 
            action_date_,
            action_time_,
            action_type_,
            strategy_id,
            start_date,
            end_date,
            status,
            is_entry_before_archive_
        FROM 
            price_markdown.tb_strategy_master
        WHERE 
            strategy_id = ANY(strategies_ids_);
    END IF;
END;
$function$
;
