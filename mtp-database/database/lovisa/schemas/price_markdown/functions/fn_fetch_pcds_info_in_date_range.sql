--liquibase formatted sql
--changeset sidharth.harish@impactanalytics.co:fn_fetch_pcds_info_in_date_range_5 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: logic_change_3 changeset for fn_fetch_pcds_info_in_date_range_5
--rollback: SELECT 1

DROP FUNCTION if exists price_markdown.fn_fetch_pcds_info_in_date_range;
CREATE OR REPLACE FUNCTION price_markdown.fn_fetch_pcds_info_in_date_range(_start_date date, _end_date date, _time_zone text DEFAULT 'US/Eastern'::text, _strategy_ids integer[] DEFAULT NULL::integer[])
 RETURNS TABLE(pcd_ids integer[])
 LANGUAGE plpgsql
AS $function$
declare
	temp_query text;
	where_cond1 text := '';
	pcd_ids_ integer[];
begin
	if array_length(_strategy_ids, 1) > 0 then
		where_cond1 = format(' and tsp.strategy_id in (%1$s) ', array_to_string(_strategy_ids,','));
	end if;

	-- Ftech All strategy_ids and pcd_ids fall under the given start and end dates.
	temp_query = format('	select
								array_agg(distinct tsp.pcd_id)
							from
								price_markdown.tb_strategy_pcd tsp
							join
    							price_markdown.tb_strategy_master tsm ON tsp.strategy_id = tsm.strategy_id
							where
								tsp.pcd_start_date >= %2$L
								and tsp.pcd_start_date <= %3$L
								and tsm.status NOT IN (-1, -2, 4, 6)
								%4$s
						',
						_time_zone, _start_date, _end_date, where_cond1
				);
	raise notice 'temp_query: %', temp_query;
	execute temp_query into pcd_ids_;
	--raise notice 'date_range(% - %) ----> pcd_ids : %', _start_date, _end_date, pcd_ids_;

	return query(select pcd_ids_ as pcd_ids);
end;
$function$
;
