--liquibase formatted sql
--changeset durgaprasad.tulugu@impactanalytics.co:fn_v3_create_strategy_step_0-1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:approval
--comment: fn_v3_create_strategy_step_0-1
--rollback: SELECT 1

DROP FUNCTION if exists price_markdown.fn_v3_create_strategy_step_0;


CREATE OR REPLACE FUNCTION price_markdown.fn_v3_create_strategy_step_0(p_strategy_name character varying, p_strategy_comment character varying, p_start_date date, p_end_date date, p_calendar_config_id integer, p_user_id integer)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
    declare
        new_stg_id int;
    begin 
        INSERT INTO price_markdown.tb_strategy_master (
                strategy_name,
                strategy_comment,
                start_date,
                end_date,
                calendar_config_id,
                created_by,
                created_at
            )
            VALUES (
                p_strategy_name,
                p_strategy_comment,
                p_start_date,
                p_end_date,
                p_calendar_config_id,
                p_user_id,
                now()
            )
            RETURNING strategy_id into new_stg_id;
        raise notice 'created stg %', new_stg_id;
        
        perform price_markdown.fn_v3_create_strategy_partitions(new_stg_id);
        
        perform 
            price_markdown.fn_v3_edit_strategy_pcd(
                p_strategy_id := new_stg_id,
                p_start_date := p_start_date,
                p_end_date := p_end_date,
                p_calendar_config_id := p_calendar_config_id,
                p_user_id := p_user_id
        );
		
		return new_stg_id;
    end;
$function$
;
