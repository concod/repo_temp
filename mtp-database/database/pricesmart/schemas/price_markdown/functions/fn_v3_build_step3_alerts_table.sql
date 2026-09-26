--liquibase formatted sql
--changeset utkarsh.tiwari@impactanalytics.co:fn_v3_build_step3_alerts_table-2 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:approval
--comment: Function to build step3 alerts table

DROP FUNCTION if exists price_markdown.fn_v3_build_step3_alerts_table;

CREATE OR REPLACE FUNCTION price_markdown.fn_v3_build_step3_alerts_table(_strategy_id integer, _is_default_level boolean DEFAULT true, _product_level integer DEFAULT NULL::integer, _store_level integer DEFAULT NULL::integer, _seviority_level_filter integer[] DEFAULT NULL::integer[], _alerts_metric_filter integer[] DEFAULT NULL::integer[])
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
	fetch_type text := 'other';
	strategy_alerts_info_table text;
    temp_table_name text;
	dummu  text;
	filtered_alerts int[];
	where_condition1 text;
	temp_query text;
    final_query text;
    metric_level_filter_present boolean := false;
BEGIN
    -- Generate a unique temp table name with timestamp
    temp_table_name := 'alerts_temp_' || _strategy_id::text || '_' || extract(epoch from now())::BIGINT;
	
	
	--strategy_alerts_info_table = 'tb_strategy_alerts_triggered_prasad_test' ;
	if _is_default_level then 
		fetch_type = 'default';	
	end if;
	select 
		* into strategy_alerts_info_table
	from 
		price_markdown_opt.fn_custom_alerts_step3_data(_strategy_id, fetch_type, _product_level, _store_level);
	--strategy_alerts_info_table = 'price_markdown.tb_strategy_alerts_triggered_prasad_test' ;
	raise notice 'strategy_alerts_info_table: %', strategy_alerts_info_table;

	temp_query = '
					with latest_pcd_info as(
						select 
							max(tcatd.triggered_on) as triggered_on
						from 
							price_markdown.tb_custom_alerts_trigger_data tcatd
						where 
							tcatd.strategy_id = %1$s 
					)
					select 
						array_agg(tcatd.alert_id)
					from 
						price_markdown.tb_custom_alerts_trigger_data tcatd
					inner join 
						latest_pcd_info using (triggered_on)
					inner join 
						price_markdown.tb_custom_alerts_metrics tcam using(alert_id)
					inner join 
						price_markdown.tb_custom_alerts_master tcam2 using(alert_id)
					where
						tcatd.strategy_id = %1$s
						%2$s
						%3$s;
				';

	-- Fetch alerts if _alerts_metric_filter provided.
	if array_length(_alerts_metric_filter, 1) > 0 then
		if array_length(_seviority_level_filter, 1) > 0 and array_length(_alerts_metric_filter, 1) > 0 then
			metric_level_filter_present := true;
			temp_query = format(temp_query, 
								_strategy_id::text,
								format(' and tcam.metric_id in (%1$s)', array_to_string(_alerts_metric_filter, ',')),
								format(' and tcam2.severity_id in (%1$s)', array_to_string(_seviority_level_filter, ','))
						);
		elsif array_length(_alerts_metric_filter, 1) > 0 then
			metric_level_filter_present := true;
			temp_query = format(temp_query, 
								_strategy_id::text,
								format(' and tcam.metric_id in (%1$s)', array_to_string(_alerts_metric_filter, ',')),
								''::text
						);
		end if;
		execute temp_query into filtered_alerts;
	end if;


	-- build where condition for final query if filters provided.
	where_condition1 = 'where tbl.alert_ids && array[%1$s]::int[]';
	if array_length(_alerts_metric_filter, 1) is null and array_length(_seviority_level_filter, 1) > 0 then
		where_condition1 = format('where tbl.severity_id in (%1$s)', array_to_string(_seviority_level_filter, ','));
	elsif array_length(_alerts_metric_filter, 1) > 0 then
		if array_length(filtered_alerts, 1) > 0 then
			where_condition1 = format(where_condition1, array_to_string(filtered_alerts, ','));
		else 
			where_condition1 = format(where_condition1, ''::text);
		end if;
	else 
		where_condition1 = '';
	end if;

	-- Fetch type selection based on the flag
    fetch_type := case when metric_level_filter_present then 2 else 1 end;

	final_query = format(
				'
					create temp table %1$s as 
					with max_severity_cte as(
						select 
							tbl.strategy_id,
							tbl.product_level_id,
							tbl.store_level_id,
							max(tbl.severity_id) as max_severity_id
						from 
							%2$s tbl
						%3$s
						group by
							tbl.strategy_id,
							tbl.product_level_id,
							tbl.store_level_id
					)
					select 
						dc.strategy_id,
						dc.product_level_id,
						dc.store_level_id,
						dc.max_severity_id,
						price_markdown.fn_v3_get_alerts_metric_info_in_text(
			                tbl.alert_ids::int[],
                			%4$s,
			                %5$s
			            ) as triggered_case
					from 
						max_severity_cte dc
					left join 
						%2$s tbl 
					on
						dc.strategy_id  = tbl.strategy_id 
						and dc.product_level_id = tbl.product_level_id 
						and dc.store_level_id = tbl.store_level_id 
						and dc.max_severity_id = tbl.severity_id
				',
				temp_table_name,
				strategy_alerts_info_table,
				where_condition1,
    			case 
			        when metric_level_filter_present and array_length(filtered_alerts, 1) > 0
			        then 'array[' || array_to_string(filtered_alerts, ',') || ']'
			        else 'null::int[]'
			    end,
				fetch_type
			);
	
	raise notice 'final_query: %', final_query;
	execute final_query;
	return temp_table_name;
END;
$function$
;
