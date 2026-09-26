--liquibase formatted sql
--changeset utkarsh.tiwari@impactanalytics.co:price_markdown.fn_v3_insert_clearance_trigger_options runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for price_markdown.fn_v3_insert_clearance_trigger_options

DROP FUNCTION if exists price_markdown.fn_v3_insert_clearance_trigger_options;

CREATE OR REPLACE FUNCTION price_markdown.fn_v3_insert_clearance_trigger_options(p_trigger_id integer, user_id integer, trigger_options_info jsonb)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
DECLARE
	current_trigger_record price_markdown.tb_clearance_trigger_info_master%ROWTYPE;
	is_create_flow bool := true;
	BEGIN
		select * into current_trigger_record from price_markdown.tb_clearance_trigger_info_master where trigger_id = p_trigger_id;
		-- Check if there is any existing data for the given trigger_id in the tb_clearance_trigger_conditions_mapping table
	    if exists (select 1 from price_markdown.tb_clearance_trigger_conditions_mapping where trigger_id = p_trigger_id) or current_trigger_record.created_by != user_id then
	        is_create_flow := false;
	    end if;
		
	    -- Delete existing records for the given trigger_id in the mapping table
	    delete from price_markdown.tb_clearance_trigger_conditions_mapping 
	    where trigger_id = p_trigger_id;
	
	    -- Insert new records from jsonb input
	    insert into price_markdown.tb_clearance_trigger_conditions_mapping (
			trigger_id, 
            operator_id, 
            metric_id, 
            timeframe_id, 
            threshold_value_1,
            threshold_value_2,
            logical_operator
		)
	    select 
	        p_trigger_id as trigger_id, 
	        tbl.operator_id, 
	        tbl.metric_id,
			tbl.timeframe_id,
	        tbl.threshold_value_1,
            tbl.threshold_value_2,
	        tbl.logical_operator
	    from 
	        jsonb_to_recordset(trigger_options_info) 
	        as tbl (
				operator_id int4, 
                metric_id int4, 
                timeframe_id int4, 
                threshold_value_1 float8, 
                threshold_value_2 float8,
                logical_operator text
			);

		return p_trigger_id;

	END;
$function$
;
