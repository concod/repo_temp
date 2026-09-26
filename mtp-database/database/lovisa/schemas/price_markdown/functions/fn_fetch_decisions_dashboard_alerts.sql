--liquibase formatted sql
--changeset harshita.kona@impactanalytics.co:fn_fetch_decisions_dashboard_alerts runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: Updated fn_fetch_decisions_dashboard_alerts


DROP FUNCTION if exists price_markdown.fn_fetch_decisions_dashboard_alerts;
CREATE OR REPLACE FUNCTION price_markdown.fn_fetch_decisions_dashboard_alerts(
	currency_ids integer[],
    _start_date date,
    _end_date date,
    _strategy_status integer[] DEFAULT NULL::integer[],
    _strategy_ids integer[] DEFAULT NULL::integer[],
    p_hierarchy_filters jsonb DEFAULT NULL::jsonb
)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
	_time_zone text;
	client_timezone_name text:= 'client_timezone';
	final_result json;
	next_duration_attr_1_days_pcd_ids integer[];
	next_duration_attr_2_days_pcd_ids integer[];
	filter_based_pcd_ids integer[];

	temp_query text;
	next_duration_attr_1_days_pending_approval_count integer := 0;
	next_duration_attr_1_days_pending_approval_pcd_ids integer[] := null;
	next_duration_attr_1_days_final_approval_count integer := 0;
	next_duration_attr_1_days_final_approval_pcd_ids integer[] := null;
	next_duration_attr_1_days_pending_initial_approval_count integer := 0;
	next_duration_attr_1_days_pending_initial_approval_strategy_ids integer[];

	next_duration_attr_2_days_pending_approval_count integer := 0;
	next_duration_attr_2_days_pending_approval_pcd_ids integer[] := null;
	next_duration_attr_2_days_final_approval_count integer := 0;
	next_duration_attr_2_days_final_approval_pcd_ids integer[] := null;
	next_duration_attr_2_days_pending_initial_approval_count integer := 0;
	next_duration_attr_2_days_pending_initial_approval_strategy_ids integer[];

	filter_based_pending_approval_count integer := 0;
	filter_based_pending_approval_pcd_ids integer[] := null;
	filter_based_final_approval_count integer := 0;
	filter_based_final_approval_pcd_ids integer[] := null;
	filter_based_pending_initial_approval_count integer := 0;
	filter_based_pending_initial_approval_strategy_ids integer[];
	threshold_days int:= 7;
	threshold_days_name text:= 'automatic_strategy_creation_alert_threshold_days';
	automatic_strategy_count integer := 0;
	automatic_strategy_ids integer[];
	filtered_strategy_ids integer[];
	strategy_where_arr text[];
	filter_strategies_query text;
	pcd_buffer text;
	buffer_start_date date;
	buffer_start_date_filter date;
	alert_duration_attr_1 integer;
	alert_duration_attr_2 integer;

	-- Hierarchy filter conditions
	hierarchy_where_conditions text[];
begin
	select tasm.remarks::text into _time_zone from metaschema.tb_app_sub_master tasm where tasm.is_active = 1 and tasm.name = client_timezone_name;
	select tasm.remarks::int into threshold_days from metaschema.tb_app_sub_master tasm where tasm.is_active = 1 and tasm.name = threshold_days_name;
	select tasm.remarks into pcd_buffer from metaschema.tb_app_sub_master tasm where  tasm.is_active = 1 and tasm.name = 'pcd_buffer_alerts';

	execute format('select greatest((date(timezone(''%2$s'', now())) + interval ''%1$s''), %3$L) ', pcd_buffer, _time_zone, _start_date) into buffer_start_date_filter;
	raise notice ' buffer_start_date_filter ----- %', buffer_start_date_filter;

	execute format('select date(timezone(''%2$s'', now())) + interval ''%1$s'' ', pcd_buffer, _time_zone) into buffer_start_date;
	raise notice ' buffer_start_date ----- %', buffer_start_date;

	select (tasm.remarks::int[])[1], (tasm.remarks::int[])[2] into alert_duration_attr_1, alert_duration_attr_2
	from metaschema.tb_app_sub_master tasm where  tasm.is_active = 1 and tasm.name = 'approval_alerts_durations';
	raise notice ' alert_duration_attr_1 ----- %', alert_duration_attr_1;
	raise notice ' alert_duration_attr_2 ----- %', alert_duration_attr_2;

	-- Build dynamic hierarchy conditions using the new function
	SELECT strategy_where_conditions
	INTO hierarchy_where_conditions
	FROM price_markdown.fn_build_hierarchy_filters(p_hierarchy_filters);

	-- Add hierarchy conditions to strategy_where_arr if any exist
	IF array_length(hierarchy_where_conditions, 1) > 0 THEN
		strategy_where_arr := strategy_where_arr || hierarchy_where_conditions;
	END IF;

	if array_length(_strategy_status, 1) > 0 then
		strategy_where_arr := array_append(strategy_where_arr, format('and sm.status IN (%1$s)', array_to_string(_strategy_status, ',')));
	end if;

	filter_strategies_query := format('	select
													array_agg(sm.strategy_id)
												from
													price_markdown.tb_strategy_master sm
												where
													sm.status NOT IN (-1, -2, 4, 6)
													and sm.start_date <= ''%2$s''::date
													and sm.end_date >= ''%1$s''::date
													%3$s', _start_date, _end_date, array_to_string(strategy_where_arr, ' '));
	raise notice ' strategy filter query ----- %', filter_strategies_query;
	execute filter_strategies_query into filtered_strategy_ids;


	if array_length(filtered_strategy_ids, 1) > 0 then
		raise notice 'filtered_strategy_ids : %', array_to_string(filtered_strategy_ids, ', ');
	else
		raise notice 'no strategies got filtered';
		filtered_strategy_ids = array[-1]::integer[];
	end if;


	-- Fetch All next attr_1 duration (days) strategy and pcd's info.
	select
		pcd_ids into next_duration_attr_1_days_pcd_ids
	from
		price_markdown.fn_fetch_pcds_info_in_date_range(
			(buffer_start_date + 1),
			(date(timezone(_time_zone, now())) + alert_duration_attr_1),
			_time_zone,
			filtered_strategy_ids
		);
	raise notice 'next_duration_attr_1_days_pcd_ids : %', next_duration_attr_1_days_pcd_ids;

	-- Find the metrics data for next attr_1 duration (days).
	if array_length(next_duration_attr_1_days_pcd_ids, 1) > 0 then
		-- Fetch next_duration_attr_1_days_pending_approval_count, next_duration_attr_1_days_final_approval_count
		select
			pending_approval_count, pending_approval_pcd_ids, final_approval_count, final_approval_pcd_ids
			into next_duration_attr_1_days_pending_approval_count, next_duration_attr_1_days_pending_approval_pcd_ids, next_duration_attr_1_days_final_approval_count, next_duration_attr_1_days_final_approval_pcd_ids
		from
			price_markdown.fn_fetch_pa_fa_info_based_on_pcds(next_duration_attr_1_days_pcd_ids);

		-- next_duration_attr_1_days_pending_initial_approval_count, next_duration_attr_1_days_pending_initial_approval_strategy_ids
		select
			pending_initial_approval_count, pending_initial_approval_strategy_ids
			into next_duration_attr_1_days_pending_initial_approval_count, next_duration_attr_1_days_pending_initial_approval_strategy_ids
		from
			price_markdown.fn_fetch_pending_initial_approval_info_based_on_pcds(next_duration_attr_1_days_pcd_ids, currency_ids);
	end if;



	-- Fetch All Next attr_2 duration (days) strategy and pcd's info.
	select
		pcd_ids into next_duration_attr_2_days_pcd_ids
	from
		price_markdown.fn_fetch_pcds_info_in_date_range(
			(buffer_start_date + 1),
			(date(timezone(_time_zone, now())) + alert_duration_attr_2),
			_time_zone,
			filtered_strategy_ids
		);
	raise notice ' next_duration_attr_2_days_pcd_ids : %', next_duration_attr_2_days_pcd_ids;

	-- Find the metrics data for next attr_2 duration (days).
	if array_length(next_duration_attr_2_days_pcd_ids, 1) > 0 then
		--Fetch next_duration_attr_2_days_pending_approval_count, next_duration_attr_2_days_final_approval_count
		select
			pending_approval_count, pending_approval_pcd_ids, final_approval_count, final_approval_pcd_ids
			into next_duration_attr_2_days_pending_approval_count, next_duration_attr_2_days_pending_approval_pcd_ids, next_duration_attr_2_days_final_approval_count, next_duration_attr_2_days_final_approval_pcd_ids
		from
			price_markdown.fn_fetch_pa_fa_info_based_on_pcds(next_duration_attr_2_days_pcd_ids);

		-- next_duration_attr_2_days_pending_initial_approval_count, next_duration_attr_2_days_pending_initial_approval_strategy_ids
		select
			pending_initial_approval_count, pending_initial_approval_strategy_ids
			into next_duration_attr_2_days_pending_initial_approval_count, next_duration_attr_2_days_pending_initial_approval_strategy_ids
		from
			price_markdown.fn_fetch_pending_initial_approval_info_based_on_pcds(next_duration_attr_2_days_pcd_ids, currency_ids);
	end if;



	-- Fetch All strategy and pcd's info in given date range.
	select
		pcd_ids into filter_based_pcd_ids
	from
		price_markdown.fn_fetch_pcds_info_in_date_range(
			buffer_start_date_filter + 1,
			GREATEST((date(timezone(_time_zone, now())) + 1), _end_date),
			_time_zone,
			filtered_strategy_ids
		);
	raise notice 'filter_based_pcd_ids : %', filter_based_pcd_ids;


	-- Find the metrics data for given date range.
	if array_length(filter_based_pcd_ids, 1) > 0 then
		--Fetch filter_based_pending_approval_count, filter_based_final_approval_count
		select
			pending_approval_count, pending_approval_pcd_ids, final_approval_count, final_approval_pcd_ids
			into filter_based_pending_approval_count, filter_based_pending_approval_pcd_ids, filter_based_final_approval_count, filter_based_final_approval_pcd_ids
		from
			price_markdown.fn_fetch_pa_fa_info_based_on_pcds(filter_based_pcd_ids);

		-- filter_based_pending_initial_approval_count, filter_based_pending_initial_approval_strategy_ids
		select
			pending_initial_approval_count, pending_initial_approval_strategy_ids
			into filter_based_pending_initial_approval_count, filter_based_pending_initial_approval_strategy_ids
		from
			price_markdown.fn_fetch_pending_initial_approval_info_based_on_pcds(filter_based_pcd_ids, currency_ids);
	end if;


	-- find all automatic strategy ids.
	select
		count(tsm.strategy_id), array_agg(tsm.strategy_id)
		into automatic_strategy_count, automatic_strategy_ids
	from
		price_markdown.tb_strategy_master tsm
	where
		tsm.created_at <= (date(timezone(_time_zone, now())))
		and tsm.created_at >= (date(timezone(_time_zone, now())) - threshold_days)
		and tsm.is_automated = true
		and tsm.status not in(-2, -1);

	raise notice 'automatic_strategy_ids : %', automatic_strategy_ids;

	select json_agg(
			json_build_object(
				'label', dd.label,
				'identifier', dd.identifier,
				'items', dd.items,
				'description', dd.description,
				'action_status', dd.action_status,
				'pcds', dd.pcds,
				'strategies', dd.strategies
			)
		) as alerts into final_result
	from
		(
			select format('Pending Approval (Next %s Day(s))', alert_duration_attr_1) as label, 'next_duration_attr_1_days' as identifier, next_duration_attr_1_days_pending_approval_count as items, 'Products' as description, 'Initially Approved' as action_status, next_duration_attr_1_days_pending_approval_pcd_ids::integer[] as pcds, (select null)::json as strategies
			union all
			select format('Pending Initial Approval (Next %s Day(s))', alert_duration_attr_1) as label, 'next_duration_attr_1_days' as identifier, next_duration_attr_1_days_pending_initial_approval_count as items, 'Strategies effected' as description, 'Not Approved' as action_status, null::integer[] as pcds, (price_markdown.fn_fetch_basic_strategies_info(next_duration_attr_1_days_pending_initial_approval_strategy_ids::integer[]))::json as strategies
			union all
			select format('Approved (Next %s Day(s))', alert_duration_attr_1) as label, 'next_duration_attr_1_days' as identifier, next_duration_attr_1_days_final_approval_count as items, 'products' as description, 'Finally Approved' as action_status, next_duration_attr_1_days_final_approval_pcd_ids::integer[] as pcds, (select null)::json as strategies
			union all
			select 'Automated Strategies' as label, 'automatic_strategy' as identifier, automatic_strategy_count as items, 'Strategies effected' as description, 'automatic_strategy' as action_status, null::integer[] as pcds, (price_markdown.fn_fetch_basic_strategies_info(automatic_strategy_ids::integer[]))::json as strategies
			union all
			select format('Pending Approval (Next %s Day(s))', alert_duration_attr_2) as label, 'next_duration_attr_2_days' as identifier, next_duration_attr_2_days_pending_approval_count as items, 'Products' as description, 'Initially Approved' as action_status, next_duration_attr_2_days_pending_approval_pcd_ids::integer[] as pcds, (select null)::json as strategies
			union all
			select format('Pending Initial Approval (Next %s Day(s))', alert_duration_attr_2) as label, 'next_duration_attr_2_days' as identifier, next_duration_attr_2_days_pending_initial_approval_count as items, 'Strategies effected' as description, 'Not Approved' as action_status, null::integer[] as pcds, (price_markdown.fn_fetch_basic_strategies_info(next_duration_attr_2_days_pending_initial_approval_strategy_ids::integer[]))::json as strategies
			union all
			select format('Approved (Next %s Day(s))', alert_duration_attr_2) as label, 'next_duration_attr_2_days' as identifier, next_duration_attr_2_days_final_approval_count as items, 'products' as description, 'Finally Approved' as action_status, next_duration_attr_2_days_final_approval_pcd_ids::integer[] as pcds, (select null)::json as strategies
			union all
			select 'Pending Approval Total' as label, 'filter_based_days' as identifier, filter_based_pending_approval_count as items, 'Products' as description, 'Initially Approved' as action_status, filter_based_pending_approval_pcd_ids::integer[] as pcds, (select null)::json as strategies
			union all
			select 'Pending Initial Approval' as label, 'filter_based_days' as identifier, filter_based_pending_initial_approval_count as items, 'Strategies effected' as description, 'Not Approved' as action_status, null::integer[] as pcds, (price_markdown.fn_fetch_basic_strategies_info(filter_based_pending_initial_approval_strategy_ids::integer[]))::json as strategies
			union all
			select 'Total Approved' as label, 'filter_based_days' as identifier, filter_based_final_approval_count as items, 'products' as description, 'Finally Approved' as action_status, filter_based_final_approval_pcd_ids::integer[] as pcds, (select null)::json as strategies
		)dd;
	return final_result;
end;
$function$
;
