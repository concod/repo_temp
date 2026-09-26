--liquibase formatted sql
--changeset sidharth.harish@impactanalytics.co:fn_fetch_basic_strategies_info_3 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: logic_change_3 changeset for fn_fetch_basic_strategies_info_3
--rollback: SELECT 1

DROP FUNCTION if exists price_markdown.fn_fetch_basic_strategies_info;
CREATE OR REPLACE FUNCTION price_markdown.fn_fetch_basic_strategies_info(_strategy_ids integer[] DEFAULT NULL::integer[])
 RETURNS json
 LANGUAGE plpgsql
AS $function$
declare
	final_result json;
begin
	-- Ftech basic strategy info.
	select
		json_agg(
			json_build_object(
				'strategy_id', tsm.strategy_id,
				'strategy_name', tsm.strategy_name,
				'start_date', tsm.start_date,
				'end_date', tsm.end_date,
				'created_by', usr.name,
				'status', tssc.status_name
			) ORDER BY tsm.start_date
		) as strategies into final_result
	from
		price_markdown.tb_strategy_master tsm
	left join
		global.user_master usr on tsm.created_by = usr.user_code
	left join
		price_markdown.tb_strategy_status_config tssc on tsm.status = tssc.status_id
	where
		tsm.strategy_id = any(_strategy_ids);

	return final_result;
end;
$function$
;
