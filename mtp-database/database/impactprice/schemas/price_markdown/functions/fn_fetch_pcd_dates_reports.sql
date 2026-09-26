--liquibase formatted sql
--changeset anoop.madamsetty@impactanalytics.co:fn_fetch_pcd_dates_reports runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for fn_fetch_pcd_dates_reports
--rollback: SELECT 1

DROP FUNCTION if EXISTS price_markdown.fn_fetch_pcd_dates_reports;
CREATE OR REPLACE FUNCTION price_markdown.fn_fetch_pcd_dates_reports(_strategy_id integer[], _start_date date, _end_date date, _status_condition integer[], timezone text, p_hierarchy_filters jsonb DEFAULT NULL::jsonb)
 RETURNS TABLE(label text, value text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
	product_hierarchy_level integer;
	product_hierarchy_values integer[];
	strategy_where_arr text[];
	start_time TIMESTAMP;
    end_time TIMESTAMP;
	vl_test_query text;
	date_str text;
	status_condition_str text;
	hierarchy_where_conditions text[];
begin
	if array_length(_strategy_id, 1) > 0 then
		vl_test_query := format('
				select
				    tam.pcd_start_date::text as label,
				    tam.pcd_start_date::text as value
				from
				    price_markdown.tb_approval_metrics tam
				where
				    tam.pcd_start_date between (date(timezone(''%2$s'', now()))) and (date(timezone(''%2$s'', now())) + 60)
					and strategy_id = ANY(%1$L)
				group by
				    tam.pcd_start_date
				order by
				    tam.pcd_start_date
				',
				_strategy_id,
				timezone
				);
		RAISE NOTICE 'vl_test_query 1 statement: %', vl_test_query;
		RETURN QUERY EXECUTE vl_test_query;

	else
		-- Build dynamic hierarchy conditions using the new function
		SELECT strategy_where_conditions
		INTO hierarchy_where_conditions
		FROM price_markdown.fn_build_hierarchy_filters(p_hierarchy_filters);

		-- Add hierarchy conditions to strategy_where_arr if any exist
		IF array_length(hierarchy_where_conditions, 1) > 0 THEN
			strategy_where_arr := strategy_where_arr || hierarchy_where_conditions;
		END IF;

		if _start_date IS NOT NULL then
			date_str = format(' and sm.start_date <= ''%1$s''::date and sm.end_date >= ''%2$s''::date ', _end_date, _start_date);
		else
			date_str = '';
		end if;

		if _status_condition IS NOT NULL then
			status_condition_str = format(' where status = ANY(array[%1$s])', array_to_string(_status_condition, ','));
		else
			status_condition_str = '';
		end if;

		vl_test_query := format('
			with strategies_list_cte as (
			select *
				from
				(
				select
				sm.strategy_id,
				sm.start_date,
				case
				    when sm.status = 2 and sm.end_date < date(timezone(''%4$s'', now())) then 4
				    when sm.status = 2 and sm.start_date <= date(timezone(''%4$s'', now())) then 3
					else sm.status
					end as status
				    from price_markdown.tb_strategy_master sm
					where true
					%1$s
					%2$s) sm
					%3$s
					order by
						start_date
					)
				select
				    tam.pcd_start_date::text as label,
				    tam.pcd_start_date::text as value
				from
				    price_markdown.tb_approval_metrics tam
				inner join
				    strategies_list_cte slc using(strategy_id)
				where
				    tam.pcd_start_date between (date(timezone(''%4$s'', now()))) and (date(timezone(''%4$s'', now())) + 60)
				group by
				    tam.pcd_start_date
				order by
				    tam.pcd_start_date
				',
				date_str,
				array_to_string(strategy_where_arr, ' '),
				status_condition_str,
				timezone
				);

		RAISE NOTICE 'vl_test_query 4 statement: %', vl_test_query;
	    RETURN QUERY EXECUTE vl_test_query;
	end if;

END;
$function$
;
