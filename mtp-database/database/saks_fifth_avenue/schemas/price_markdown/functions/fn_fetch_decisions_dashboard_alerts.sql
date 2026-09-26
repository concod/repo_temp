--liquibase formatted sql
--changeset sidharth.harish@impactanalytics.co:fn_fetch_decisions_dashboard_alerts_6 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: added buffer to the start date


DROP FUNCTION if exists price_markdown.fn_fetch_decisions_dashboard_alerts;
CREATE OR REPLACE FUNCTION price_markdown.fn_fetch_decisions_dashboard_alerts(_start_date date, _end_date date, _p0_ids integer[] DEFAULT NULL::integer[], _p1_ids integer[] DEFAULT NULL::integer[], _p2_ids integer[] DEFAULT NULL::integer[], _p3_ids integer[] DEFAULT NULL::integer[], _brand_ids integer[] DEFAULT NULL::integer[], _s0_ids integer[] DEFAULT NULL::integer[], _s1_ids integer[] DEFAULT NULL::integer[], _s2_ids integer[] DEFAULT NULL::integer[], _s3_ids integer[] DEFAULT NULL::integer[], _s4_ids integer[] DEFAULT NULL::integer[], _strategy_status integer[] DEFAULT NULL::integer[], _strategy_ids integer[] DEFAULT NULL::integer[])
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
	_time_zone text;
	client_timezone_name text:= 'client_timezone';
	final_result json;
	next7_days_pcd_ids integer[];
	next14_days_pcd_ids integer[];
	filter_based_pcd_ids integer[];

	temp_query text;
	next7_days_pending_approval_count integer := 0;
	next7_days_pending_approval_pcd_ids integer[] := null;
	next7_days_final_approval_count integer := 0;
	next7_days_final_approval_pcd_ids integer[] := null;
	next7_days_pending_initial_approval_count integer := 0;
	next7_days_pending_initial_approval_strategy_ids integer[];

	next14_days_pending_approval_count integer := 0;
	next14_days_pending_approval_pcd_ids integer[] := null;
	next14_days_final_approval_count integer := 0;
	next14_days_final_approval_pcd_ids integer[] := null;
	next14_days_pending_initial_approval_count integer := 0;
	next14_days_pending_initial_approval_strategy_ids integer[];

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
	product_hierarchy_level integer;
	product_hierarchy_values integer[];
	filtered_strategy_ids integer[];
	strategy_where_arr text[];
	filter_strategies_query text;
	pcd_buffer text;
	buffer_start_date date;
	buffer_start_date_filter date;
begin
	select tasm.remarks::text into _time_zone from metaschema.tb_app_sub_master tasm where tasm.is_active = 1 and tasm.name = client_timezone_name;
	select tasm.remarks::int into threshold_days from metaschema.tb_app_sub_master tasm where tasm.is_active = 1 and tasm.name = threshold_days_name;
	select tasm.remarks into pcd_buffer from metaschema.tb_app_sub_master tasm where  tasm.is_active = 1 and tasm.name = 'pcd_buffer_alerts';

	execute format('select greatest((date(timezone(''%2$s'', now())) + interval ''%1$s''), %3$L) ', pcd_buffer, _time_zone, _start_date) into buffer_start_date_filter;
	raise notice ' buffer_start_date_filter ----- %', buffer_start_date_filter;

	execute format('select date(timezone(''%2$s'', now())) + interval ''%1$s'' ', pcd_buffer, _time_zone) into buffer_start_date;
	raise notice ' buffer_start_date ----- %', buffer_start_date;



	if array_length(_strategy_ids, 1) > 0 then
		filtered_strategy_ids := _strategy_ids;
	else
		if array_length(_p3_ids, 1) > 0 then
			product_hierarchy_level := 3;
			product_hierarchy_values := _p3_ids;
		elsif array_length(_p2_ids, 1) > 0 then
			product_hierarchy_level := 2;
			product_hierarchy_values := _p2_ids;
		elsif array_length(_p1_ids, 1) > 0 then
			product_hierarchy_level := 1;
			product_hierarchy_values := _p1_ids;
		elsif array_length(_p0_ids, 1) > 0 then
			product_hierarchy_level := 0;
			product_hierarchy_values := _p0_ids;
		else
			product_hierarchy_level := -1;
		end if;


		if product_hierarchy_level <> -1 then
			strategy_where_arr := array_append(strategy_where_arr, format('and sm.strategy_id IN (
				    SELECT
			            strategy_id
			        FROM
			            price_markdown.tb_strategy_hierarchy
			        WHERE is_product_hierarchy = 1
				    AND hierarchy_level = %1$s::integer
				    AND hierarchy_value = ANY(array[%2$s])
		    	)', product_hierarchy_level, array_to_string(product_hierarchy_values, ','))) ;
		end if;

		strategy_where_arr := array_append(strategy_where_arr, format('and sm.strategy_id IN (
                select
                    strategy_id
                from price_markdown.tb_strategy_store_hierarchies tsh
                where
                    s0_ids && array[%1$s]::bigint[]
                    and s1_ids && array[%2$s]::bigint[]
                    and (
                        array_length(array[%3$s]::bigint[],1) is null
                        or s2_ids && array[%3$s]::bigint[]
                    )
            )',
            array_to_string(_s0_ids,','),
            array_to_string(_s1_ids,','),
            array_to_string(_s2_ids,',')
            )
        );

		if array_length(_brand_ids, 1) > 0 then
				strategy_where_arr := array_append(strategy_where_arr, format('and sm.strategy_id IN (
					    SELECT
				            strategy_id
				        FROM
				            price_markdown.tb_strategy_hierarchy
				        WHERE is_product_hierarchy = 1
					    AND hierarchy_level = 0
					    AND hierarchy_value = ANY(array[%1$s])
			    	)', array_to_string(_brand_ids, ','))) ;
		end if;

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
	end if;


	if array_length(filtered_strategy_ids, 1) > 0 then
		raise notice 'filtered_strategy_ids : %', array_to_string(filtered_strategy_ids, ', ');
	else
		raise notice 'no strategies got filtered';
		filtered_strategy_ids = array[-1]::integer[];
	end if;


	-- Ftech All Next 7 days strategy and pcd's info.
	select
		pcd_ids into next7_days_pcd_ids
	from
		price_markdown.fn_fetch_pcds_info_in_date_range(
			(buffer_start_date + 1),
			(date(timezone(_time_zone, now())) + 7),
			_time_zone,
			filtered_strategy_ids
		);
	raise notice 'next7_days_pcd_ids : %', next7_days_pcd_ids;

	-- Find the metrics data for next 7 days.
	if array_length(next7_days_pcd_ids, 1) > 0 then
		-- Fetch next7_days_pending_approval_count, next7_days_final_approval_count
		select
			pending_approval_count, pending_approval_pcd_ids, final_approval_count, final_approval_pcd_ids
			into next7_days_pending_approval_count, next7_days_pending_approval_pcd_ids, next7_days_final_approval_count, next7_days_final_approval_pcd_ids
		from
			price_markdown.fn_fetch_pa_fa_info_based_on_pcds(next7_days_pcd_ids);

		-- next7_days_pending_initial_approval_count, next7_days_pending_initial_approval_strategy_ids
		select
			pending_initial_approval_count, pending_initial_approval_strategy_ids
			into next7_days_pending_initial_approval_count, next7_days_pending_initial_approval_strategy_ids
		from
			price_markdown.fn_fetch_pending_initial_approval_info_based_on_pcds(next7_days_pcd_ids);
	end if;



	-- Ftech All Next 14 days strategy and pcd's info.
	select
		pcd_ids into next14_days_pcd_ids
	from
		price_markdown.fn_fetch_pcds_info_in_date_range(
			(buffer_start_date + 1),
			(date(timezone(_time_zone, now())) + 14),
			_time_zone,
			filtered_strategy_ids
		);
	raise notice ' next14_days_pcd_ids : %', next14_days_pcd_ids;

	-- Find the metrics data for next 14 days.
	if array_length(next14_days_pcd_ids, 1) > 0 then
		--Fetch next14_days_pending_approval_count, next14_days_final_approval_count
		select
			pending_approval_count, pending_approval_pcd_ids, final_approval_count, final_approval_pcd_ids
			into next14_days_pending_approval_count, next14_days_pending_approval_pcd_ids, next14_days_final_approval_count, next14_days_final_approval_pcd_ids
		from
			price_markdown.fn_fetch_pa_fa_info_based_on_pcds(next14_days_pcd_ids);

		-- next14_days_pending_initial_approval_count, next14_days_pending_initial_approval_strategy_ids
		select
			pending_initial_approval_count, pending_initial_approval_strategy_ids
			into next14_days_pending_initial_approval_count, next14_days_pending_initial_approval_strategy_ids
		from
			price_markdown.fn_fetch_pending_initial_approval_info_based_on_pcds(next14_days_pcd_ids);
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
			price_markdown.fn_fetch_pending_initial_approval_info_based_on_pcds(filter_based_pcd_ids);
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
			select 'Pending Approval (Next 7 Days)' as label, 'next7_days' as identifier, next7_days_pending_approval_count as items, 'Products' as description, 'Initially Approved' as action_status, next7_days_pending_approval_pcd_ids::integer[] as pcds, (select null)::json as strategies
			union all
			select 'Pending Initial Approval (Next 7 Days)' as label, 'next7_days' as identifier, next7_days_pending_initial_approval_count as items, 'Strategies effected' as description, 'Not Approved' as action_status, null::integer[] as pcds, (price_markdown.fn_fetch_basic_strategies_info(next7_days_pending_initial_approval_strategy_ids::integer[]))::json as strategies
			union all
			select 'Approved (Next 7 Days)' as label, 'next7_days' as identifier, next7_days_final_approval_count as items, 'products' as description, 'Finally Approved' as action_status, next7_days_final_approval_pcd_ids::integer[] as pcds, (select null)::json as strategies
			union all
			select 'Automated Strategies' as label, 'automatic_strategy' as identifier, automatic_strategy_count as items, 'Strategies effected' as description, 'automatic_strategy' as action_status, null::integer[] as pcds, (price_markdown.fn_fetch_basic_strategies_info(automatic_strategy_ids::integer[]))::json as strategies
			union all
			select 'Pending Approval (Next 14 Days)' as label, 'next14_days' as identifier, next14_days_pending_approval_count as items, 'Products' as description, 'Initially Approved' as action_status, next14_days_pending_approval_pcd_ids::integer[] as pcds, (select null)::json as strategies
			union all
			select 'Pending Initial Approval (Next 14 Days)' as label, 'next14_days' as identifier, next14_days_pending_initial_approval_count as items, 'Strategies effected' as description, 'Not Approved' as action_status, null::integer[] as pcds, (price_markdown.fn_fetch_basic_strategies_info(next14_days_pending_initial_approval_strategy_ids::integer[]))::json as strategies
			union all
			select 'Approved (Next 14 Days)' as label, 'next14_days' as identifier, next14_days_final_approval_count as items, 'products' as description, 'Finally Approved' as action_status, next14_days_final_approval_pcd_ids::integer[] as pcds, (select null)::json as strategies
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
