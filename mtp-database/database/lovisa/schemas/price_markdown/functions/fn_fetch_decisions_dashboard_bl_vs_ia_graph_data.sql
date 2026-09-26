--liquibase formatted sql
--changeset harshita.kona@impactanalytics.co:fn_fetch_decisions_dashboard_bl_vs_ia_graph_data runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:approval
--comment: Updated fn_fetch_decisions_dashboard_bl_vs_ia_graph_data


DROP FUNCTION if exists price_markdown.fn_fetch_decisions_dashboard_bl_vs_ia_graph_data;

CREATE OR REPLACE FUNCTION price_markdown.fn_fetch_decisions_dashboard_bl_vs_ia_graph_data(
    _strategy_id integer[],
    currency_ids integer[],
	strategy_status integer[],
    _view_by text,
    _start_date date,
    _end_date date,
    in_user_id integer,
    p_hierarchy_filters jsonb DEFAULT NULL::jsonb
)
 RETURNS TABLE(decisiondashboardchartdata jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    query_ text :=  '';
   	dummy_data_query text:=    'select null::jsonb';
	filtered_strategy_ids integer[];
	strategy_where_arr text[];
	q1 text;
	start_time TIMESTAMP;
    end_time TIMESTAMP;
	vl_test_query text;
	_aggregate_key text := '';
    table_suffix text;
    _currency_name text;
	
	-- Hierarchy filter conditions
	hierarchy_where_conditions text[];
begin
	if array_length(_strategy_id, 1) > 0 then
		filtered_strategy_ids := _strategy_id;
	else
        SELECT currency_name INTO _currency_name FROM global.tb_currency_master WHERE currency_id = ANY(currency_ids) LIMIT 1;

        IF _currency_name = 'AUD' THEN
            table_suffix := 'global';
        ELSE
            table_suffix := 'dominating';
        END IF;

		-- Build dynamic hierarchy conditions using the new function
		SELECT strategy_where_conditions
		INTO hierarchy_where_conditions
		FROM price_markdown.fn_build_hierarchy_filters(p_hierarchy_filters);

		-- Add hierarchy conditions to strategy_where_arr if any exist
		IF array_length(hierarchy_where_conditions, 1) > 0 THEN
			strategy_where_arr := strategy_where_arr || hierarchy_where_conditions;
		END IF;

		if array_length(strategy_status, 1) > 0 then
			strategy_where_arr := array_append(strategy_where_arr, format('and sm.status = ANY(array[%s])', array_to_string(strategy_status, ',')));
		else
			strategy_where_arr := array_append(strategy_where_arr, format('and sm.status in (1,2,3,4,6)'));
		end if;

		vl_test_query := format('select
							array_agg(sm.strategy_id)
						  from
							price_markdown.tb_strategy_master sm
						  where
							sm.start_date <= ''%2$s''::date
							and sm.end_date >= ''%1$s''::date
							%3$s', _start_date, _end_date, array_to_string(strategy_where_arr, ' '));
		--raise notice ' strategy filter query ----- %', query_;
		RAISE NOTICE 'vl_test_query 4 statement: %', vl_test_query;
		start_time := clock_timestamp();
		execute vl_test_query into filtered_strategy_ids;
		end_time := clock_timestamp();
	    RAISE NOTICE 'Time taken SQL 4 statement: %', end_time - start_time;
	end if;

	if array_length(filtered_strategy_ids, 1) > 0 then
	RAISE NOTICE 'filtered_strategy_ids : %', filtered_strategy_ids;
	RAISE NOTICE 'Input ids  : %', _strategy_id;

	if _view_by = 'weekly' then
		_aggregate_key = 'format(''FW%s: %s'',fdm.fiscal_week,to_char(weeks_start_date, ''FMDDth Mon''))';
	elseif _view_by = 'monthly' then
		_aggregate_key = 'format(''FM%s: %s'',fdm.fiscal_month, to_char(make_date(2000,fiscal_month,1), ''Mon''))';
	else
		_aggregate_key = 'format(''Q%s %s'',extract(quarter from metrics.recommendation_date),fdm.fiscal_year)';
	end if;

	BEGIN
	    vl_test_query :=  'drop table if exists tb_temp_1_strategy_metrics;';
		execute vl_test_query;

		vl_test_query :=  ('create temp table tb_temp_1_strategy_metrics as
							select *
    	from' || Format(' price_markdown.tb_strategy_date_metrics_fin_%I', table_suffix) || Format(' where strategy_id = ANY(%L)', filtered_strategy_ids) || Format(' and recommendation_date between %L and %L', _start_date, _end_date) || ' and is_approved = 1'
							);
		RAISE NOTICE 'tb_temp_1_strategy_metrics 1 statement: %', vl_test_query;

		start_time := clock_timestamp();
		execute vl_test_query using filtered_strategy_ids;
		end_time := clock_timestamp();
		RAISE NOTICE 'Time taken SQL tb_temp_1_strategy_metrics 1 statement: %', end_time - start_time;


		vl_test_query :=  'drop table if exists tb_temp_1_strategy_ia_reco;';
		execute vl_test_query;

		vl_test_query :=  ( 'create temp table tb_temp_1_strategy_ia_reco as
							 select *
    	from'|| Format(' price_markdown.tb_strategy_date_metrics_ia_%I', table_suffix) || Format(' where strategy_id = ANY(%L)', filtered_strategy_ids) || Format(' and recommendation_date between %L::date and %L::date', _start_date, _end_date) || ' and is_approved = 1'
							 );
		RAISE NOTICE 'vl_test_query tb_temp_1_strategy_ia_reco statement: %', vl_test_query;

		start_time := clock_timestamp();
		execute vl_test_query using filtered_strategy_ids;
		end_time := clock_timestamp();
		RAISE NOTICE 'Time taken SQL tb_temp_1_strategy_ia_reco statement: %', end_time - start_time;


      vl_test_query :=  'drop table if exists tb_temp_1_bl_inventory_at_end;';
	  execute vl_test_query;
	  vl_test_query :=  format('create temp table tb_temp_1_bl_inventory_at_end as
				select aggregate_key,sum(remaining_inv) as remaining_inv,
						sum(inventory_cost) as inventory_cost,
						sum(inventory_retail) as inventory_retail
				from (
					select
					row_number() over (
						partition by metrics.strategy_id, %1$s
						order by metrics.strategy_id,recommendation_date asc
					) as rank_,
					inventory as remaining_inv,
					inventory_cost,
					inventory_retail,
					metrics.strategy_id,
					%1$s as aggregate_key
					from tb_temp_1_strategy_metrics metrics
					inner join global.tb_fiscal_date_mapping fdm on fdm.date = metrics.recommendation_date
					) inventory_subquery
				where rank_ = 1
				group by 1', _aggregate_key);

		RAISE NOTICE 'vl_test_query tb_temp_1_bl_inventory_at_end statement: %', vl_test_query;
		start_time := clock_timestamp();
		execute vl_test_query;
		end_time := clock_timestamp();
		RAISE NOTICE 'Time taken SQL tb_temp_1_bl_inventory_at_end statement: %', end_time - start_time;


      vl_test_query :=  'drop table if exists tb_temp_1_ia_reco_inventory_at_end;';
	  execute vl_test_query;
			vl_test_query :=  format('create temp table tb_temp_1_ia_reco_inventory_at_end as
				select aggregate_key,sum(remaining_inv) as remaining_inv,
						sum(inventory_cost) as inventory_cost,
						sum(inventory_retail) as inventory_retail
				from (
					select
					row_number() over (
						partition by metrics.strategy_id, %1$s
						order by metrics.strategy_id,recommendation_date asc
					) as rank_,
					inventory as remaining_inv,
					inventory_cost,
					inventory_retail,
					metrics.strategy_id,
					%1$s as aggregate_key
					from tb_temp_1_strategy_ia_reco metrics
					inner join global.tb_fiscal_date_mapping fdm on fdm.date = metrics.recommendation_date
					) inventory_subquery
				where rank_ = 1
				group by 1 ', _aggregate_key);

		RAISE NOTICE 'vl_test_query tb_temp_1_ia_reco_inventory_at_end statement: %', vl_test_query;
		start_time := clock_timestamp();
		execute vl_test_query;
		end_time := clock_timestamp();
		RAISE NOTICE 'Time taken SQL tb_temp_1_ia_reco_inventory_at_end statement: %', end_time - start_time;


      vl_test_query :=  'drop table if exists tb_temp_1_aggregate_data_finalized;';
	  execute vl_test_query;
			vl_test_query :=  format('create temp table tb_temp_1_aggregate_data_finalized as (
				select
				%1$s as aggregate_key_fn,
				max(fdm.date) as date_fn,
				round((sum(metrics.margin)/ NULLIF(sum(metrics.revenue),0))::numeric,2)*100 as bl_gm_percent,
				round((sum(metrics.revenue)/ NULLIF(sum(metrics.sales_units),0))::numeric,2) as bl_aur_$,
				round((sum(metrics.margin) / NULLIF(sum(metrics.sales_units),0))::numeric,2) as bl_aum_$,
				round((sum(metrics.revenue))::numeric,2) as bl_revenue_$,
				round((sum(metrics.margin))::numeric,2) as bl_gm_$,
				round(sum(metrics.spend)::numeric, 2) as bl_markdown_$,
				--round(sum(metrics.inventory_cost)::numeric, 2) as bl_inventory_cost,
				--round(sum(metrics.inventory_retail)::numeric, 2) as bl_inventory_retail,
				round(sum(metrics.sales_units)::numeric) as bl_sales_units,
				round(1-(sum(metrics.revenue)/ NULLIF(sum(metrics.inventory_retail_with_vat * metrics.sales_units),0))::numeric,2) as bl_avg_discount
				from tb_temp_1_strategy_metrics metrics
				inner join global.tb_fiscal_date_mapping fdm on fdm.date = metrics.recommendation_date
				group by aggregate_key_fn
			)', _aggregate_key);
		RAISE NOTICE 'vl_test_query tb_temp_1_aggregate_data_finalized statement: %', vl_test_query;
		start_time := clock_timestamp();
		execute vl_test_query;
		end_time := clock_timestamp();
		RAISE NOTICE 'Time taken SQL tb_temp_1_aggregate_data_finalized statement: %', end_time - start_time;

      vl_test_query :=  'drop table if exists tb_temp_1_aggregate_data_ia;';
	  execute vl_test_query;
			vl_test_query :=  format('create temp table tb_temp_1_aggregate_data_ia as (
				select
				%1$s as aggregate_key,
				max(fdm.date) as date,
				round((sum(metrics.margin)/ NULLIF(sum(metrics.revenue),0))::numeric,2)*100 as ia_reco_gm_percent,
				round((sum(metrics.revenue)/ NULLIF(sum(metrics.sales_units),0))::numeric,2) as ia_reco_aur_$,
				round((sum(metrics.margin) / NULLIF(sum(metrics.sales_units),0))::numeric,2) as ia_reco_aum_$,
				round((sum(metrics.revenue))::numeric,2) as ia_reco_revenue_$,
				round((sum(metrics.margin))::numeric,2) as ia_reco_gm_$,
				round(sum(metrics.spend)::numeric, 2) as ia_reco_markdown_$,
				--round(sum(metrics.inventory_cost)::numeric, 2) as ia_reco_inventory_cost,
				--round(sum(metrics.inventory_retail)::numeric, 2) as ia_reco_inventory_retail,
				round(sum(metrics.sales_units)::numeric) as ia_reco_sales_units,
				round(1-(sum(metrics.revenue)/ NULLIF(sum(metrics.inventory_retail_with_vat * metrics.sales_units),0))::numeric,2) as ia_reco_avg_discount
				from
				tb_temp_1_strategy_ia_reco metrics
				inner join global.tb_fiscal_date_mapping fdm on fdm.date = metrics.recommendation_date
				group by aggregate_key
			)', _aggregate_key);
		RAISE NOTICE 'vl_test_query tb_temp_1_aggregate_data_ia statement: %', vl_test_query;
		start_time := clock_timestamp();
		execute vl_test_query;
		end_time := clock_timestamp();
		RAISE NOTICE 'Time taken SQL tb_temp_1_aggregate_data_ia statement: %', end_time - start_time;
		    vl_test_query :=  'drop table if exists tb_temp_1_aggregate_data_final;';
			execute vl_test_query;
			vl_test_query :=  ('create unlogged table tb_temp_1_aggregate_data_final as
				select
				adf.aggregate_key_fn as key,
				adf.date_fn as order_key,
				adf.*,
				adia.*,
				round((bl_inv.remaining_inv)::numeric) as bl_inventory,
				round(bl_inv.inventory_cost::numeric) as bl_inventory_cost,
				round(bl_inv.inventory_retail::numeric) as bl_inventory_retail,
				round((ia_inv.remaining_inv)::numeric) as ia_reco_inventory,
				round(ia_inv.inventory_cost::numeric) as ia_reco_inventory_cost,
				round(ia_inv.inventory_retail::numeric) as ia_reco_inventory_retail
				from
				tb_temp_1_aggregate_data_finalized adf
				left join
				tb_temp_1_aggregate_data_ia adia on adf.aggregate_key_fn = adia.aggregate_key
				left join tb_temp_1_bl_inventory_at_end bl_inv on bl_inv.aggregate_key = adf.aggregate_key_fn
				left join tb_temp_1_ia_reco_inventory_at_end ia_inv on ia_inv.aggregate_key = adia.aggregate_key');

		RAISE NOTICE 'vl_test_query tb_temp_1_aggregate_data_final statement: %', vl_test_query;
		start_time := clock_timestamp();
		execute vl_test_query;
		end_time := clock_timestamp();
		RAISE NOTICE 'Time taken SQL tb_temp_1_aggregate_data_final statement: %', end_time - start_time;


		vl_test_query :=format('drop table if exists public.tb_dashboard_bl_vs_ia_graph_data_%1$s;', in_user_id);
	  	execute vl_test_query;
	 	vl_test_query := format('create unlogged table public.tb_dashboard_bl_vs_ia_graph_data_%1$s as  select jsonb_build_object(
								''gm_dollar'',
								jsonb_build_object(
								''bl_override'',
								array_agg( json_build_object(
								''timeline'',key,
								''value'',bl_gm_$ ) )
								,
								''ia_recommended'',
								array_agg(json_build_object(
								''timeline'',key,
								''value'',ia_reco_gm_$))
								),
								''sales_dollar'',
								jsonb_build_object(
								''bl_override'',
								array_agg( json_build_object(
								''timeline'',key,
								''value'',bl_revenue_$ ) )
								,
								''ia_recommended'',
								array_agg( json_build_object(
								''timeline'',key,
								''value'',ia_reco_revenue_$ ) )

								),
								''sales_unit'',
								jsonb_build_object(
								''bl_override'',
								array_agg(
								json_build_object(
								''timeline'',key,
								''value'',bl_sales_units ))
								,
								''ia_recommended'',
								array_agg(
								json_build_object(
								''timeline'',key,
								''value'',ia_reco_sales_units ))
								),
								''gm_percent'',
								jsonb_build_object(
								''bl_override'',
								array_agg( json_build_object(
								''timeline'',key,
								''value'',bl_gm_percent ) )
								,
								''ia_recommended'',
								array_agg(
								json_build_object(
								''timeline'',key,
								''value'',ia_reco_gm_percent ))
								),
								''aur'',
								jsonb_build_object(
								''bl_override'',
								array_agg(
								json_build_object(
								''timeline'',key,
								''value'',bl_aur_$ ) )
								,
								''ia_recommended'',
								array_agg(
								json_build_object(
								''timeline'',key,
								''value'',ia_reco_aur_$ ))
								),
								''aum'',
								jsonb_build_object(
								''bl_override'',
								array_agg( json_build_object(
								''timeline'',key,
								''value'',bl_aum_$ ) )
								,
								''ia_recommended'',
								array_agg(
								json_build_object(
								''timeline'',key,
								''value'',ia_reco_aum_$ ))
								),
								''markdown_dollar'',
								jsonb_build_object(
								''bl_override'',
								array_agg( json_build_object(
								''timeline'',key,
								''value'',bl_markdown_$ ) )
								,
								''ia_recommended'',
								array_agg( json_build_object(
								''timeline'',key,
								''value'',ia_reco_markdown_$))

								),
								''average_discount'',
								jsonb_build_object(
								''bl_override'',
								array_agg( json_build_object(
								''timeline'',key,
								''value'',bl_avg_discount ) )
								,
								''ia_recommended'',
								array_agg( json_build_object(
								''timeline'',key,
								''value'',ia_reco_avg_discount))

								),
								''inventory_cost'',
								jsonb_build_object(
								''bl_override'',
								array_agg( json_build_object(
								''timeline'',key,
								''value'',bl_inventory_cost ) )
								,
								''ia_recommended'',
								array_agg( json_build_object(
								''timeline'',key,
								''value'',ia_reco_inventory_cost))

								),
								''inventory_retail'',
								jsonb_build_object(
								''bl_override'',
								array_agg( json_build_object(
								''timeline'',key,
								''value'',bl_inventory_retail ) )
								,
								''ia_recommended'',
								array_agg( json_build_object(
								''timeline'',key,
								''value'',ia_reco_inventory_retail))

								),
								''inventory'',
								jsonb_build_object(
								''bl_override'',
								array_agg(
								json_build_object(
								''timeline'',key,
								''value'',bl_inventory)
								),
								''ia_recommended'',
								array_agg(
								json_build_object(
								''timeline'',key,
								''value'',ia_reco_inventory))

								)
								) as final_response,
								%2$L as  _strategy_id,
								%3$L  as hierarchy_filters,
								%4$L as _start_date,
								%5$L as _end_date,
								false as is_data_change
								from   (select * from tb_temp_1_aggregate_data_final
								order by order_key) foo ;',in_user_id,_strategy_id, p_hierarchy_filters, _start_date, _end_date);

		RAISE NOTICE 'SQL 5 statement: %', vl_test_query		;
		start_time := clock_timestamp();
		execute vl_test_query;
		end_time := clock_timestamp();

		vl_test_query := format('select final_response from public.tb_dashboard_bl_vs_ia_graph_data_%1$s',in_user_id);
		RAISE NOTICE 'SQL 5 statement: %', vl_test_query		;
		start_time := clock_timestamp();
		return query execute vl_test_query;
		end_time := clock_timestamp();

		end;
	else
		return query execute dummy_data_query;
	end if;
	--raise notice 'query: %', q1;
	--return query execute dummy_data_query;
END;
$function$
;
