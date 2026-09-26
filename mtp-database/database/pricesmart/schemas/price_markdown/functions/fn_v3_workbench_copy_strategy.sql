--liquibase formatted sql
--changeset durgaprasad.tulugu@impactanalytics.co:fn_v3_workbench_copy_strategy_1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for price_markdown.fn_v3_workbench_copy_strategy_1

DROP FUNCTION if exists price_markdown.fn_v3_workbench_copy_strategy;


CREATE OR REPLACE FUNCTION price_markdown.fn_v3_workbench_copy_strategy(p_strategy_id integer, p_strategy_name character varying, p_start_date date, p_end_date date, p_user_id integer)
 RETURNS TABLE(new_strategy_id integer, new_strategy_name text, old_strategy_name text)
 LANGUAGE plpgsql
AS $function$
	DECLARE
		new_strategy_id int;
		strategy_record price_markdown.tb_strategy_master%ROWTYPE;
	begin
		select * into strategy_record from price_markdown.tb_strategy_master where strategy_id = p_strategy_id;
		if p_strategy_name is null then
			p_strategy_name := price_markdown.fn_get_new_strategy_copied_version(
				strategy_record.strategy_name
			);
		end if;
		if p_start_date is null then
			p_start_date := strategy_record.start_date;
		end if;
		if p_end_date is null then
			p_end_date := strategy_record.end_date;
		end if;
		new_strategy_id := price_markdown.fn_v3_copy_strategy(p_strategy_id,p_user_id,p_start_date,p_end_date);
		update price_markdown.tb_strategy_master
		set
			strategy_name = p_strategy_name,
			status=0,
			parent_strategy = null,
            root_strategy = null,
            version_number = 1,
			step_count = least(strategy_record.step_count,2)
		where strategy_id =  new_strategy_id;
		return query (
            select new_strategy_id::int, p_strategy_name::text as new_strategy_name, strategy_record.strategy_name::text as old_strategy_name
        );
	end;
$function$
;
