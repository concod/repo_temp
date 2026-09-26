--liquibase formatted sql
--changeset durgaprasad.tulugu@impactanalytics.co:fn_v3_get_step3_custom_table_data_10 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:approval
--comment: fn_v3_get_step3_custom_table_data_10
--rollback: SELECT 1

DROP FUNCTION if exists price_markdown.fn_v3_get_step3_custom_table_data;


CREATE OR REPLACE FUNCTION price_markdown.fn_v3_get_step3_custom_table_data(_strategy_id integer, _pcd_ids integer[] DEFAULT NULL::integer[], _product_level integer DEFAULT NULL::integer, _store_level integer DEFAULT NULL::integer, _strategy_actual_product_level integer DEFAULT NULL::integer, _strategy_actual_store_level integer DEFAULT NULL::integer, _include_copy_ia boolean DEFAULT false, _copy_ia_session_id text DEFAULT ''::text, _is_data_changed boolean DEFAULT false, _pcd_metrics_filter jsonb DEFAULT NULL::jsonb, _approval_filter text[] DEFAULT NULL::text[], _page_number integer DEFAULT 1, _number_of_pages integer DEFAULT 1, _limit integer DEFAULT 100, _offset integer DEFAULT NULL::integer, _records_filters jsonb DEFAULT NULL::jsonb, _record_sort_key character varying DEFAULT NULL::character varying, _record_sort_order character varying DEFAULT 'asc'::character varying, _alerts_seviority_filter integer[] DEFAULT NULL::integer[], _alerts_metric_filter integer[] DEFAULT NULL::integer[])
 RETURNS TABLE(rowid text, is_footer_row boolean, is_row_locked boolean, product_level_id integer, product_level_value text, store_level_id integer, store_level_value text, cw_offer_percentage double precision, min_offer_value double precision, max_offer_value double precision, pcd_metrics jsonb, optimisation_type integer, step_count integer, total_count integer, cw_incremental_discount double precision, cw_effective_price_point double precision, brand text[], division text[], department text[], style text[], color text[], size text[], product_name text[], age double precision, base_price double precision, show_alert boolean, sales_units_diff double precision, ia_discount_next_pcd double precision, upcoming_pcd_id integer, max_alert_severity integer, alert_triggered_case text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
	DECLARE
		_client_timezone text ;

		record_filter_where_clause text;
		pcd_metrics_where_clause text;
		approval_filter_where_clause text;

		sku_store_temp_table_query text;
		bl_override_temp_table_query text;
		ia_recc_temp_table_query text;
		overall_metrics_temp_table_query text;
		current_week_metric_temp_table_query text;
		final_table_data_temp_query text;
		final_result_temp_table_query text;

		final_query_sort_order varchar[];
		final_query_sort_order_by_string text = '';
		final_return_query text;
		is_custom_alerts_applicable bool;
		custom_alerts_table_name text;
		custom_alerts_join_type text := '';
		alerts_join_case text;
		max_severity_select text := ', null::int as max_alert_severity';
		triggered_case_select text := ', null::text as alert_triggered_case';
	BEGIN
		select remarks into _client_timezone from metaschema.tb_app_sub_master tasm where tasm."name" = 'client_timezone';
		raise notice '==================================== FUNCTION START ==================================== ';
		

		------------------------------------------------- BUILDING REQUIRED WHERE CLAUSES ------------------------------------------------- 		
	    record_filter_where_clause = price_markdown.fn_v3_get_step3_where_clause_for_record_filter(_records_filters);
		raise notice 'record_filter_where_clause : %', record_filter_where_clause;
		
		pcd_metrics_where_clause = price_markdown.fn_v3_get_step3_where_clause_for_pcd_metrics(_pcd_metrics_filter);
		raise notice 'pcd_metrics_where_clause : %', pcd_metrics_where_clause;

		approval_filter_where_clause = price_markdown.fn_v3_get_step3_where_clause_for_approval_filter(_approval_filter);
		raise notice 'approval_filter_where_clause : %', approval_filter_where_clause;



		------------------------------------------------- CREATING REQUIRED TEMP TABLES ------------------------------------------------- 
		-- create temp table for sku_store_date_cte
		sku_store_temp_table_query := price_markdown.fn_v3_build_step3_sku_store_temp_table_query(_strategy_id, _product_level, _store_level);
		raise notice 'sku_store_temp_table_query : %', sku_store_temp_table_query;
    	execute sku_store_temp_table_query;
		raise notice 'Execution successfull : sku_store_temp_table_query';

		-- create temp table for ending_rule 
		create 
			temp table ending_rule on commit drop as 
        select 
			strategy_id, unnest(applicable_value) as end_rule
        from 
			price_markdown.tb_strategy_rule t1 
        inner join (select rule_id, rule_type from price_markdown.tb_rule_master trm) t2 on t1.constraint_id = t2.rule_id
        where 
			strategy_id = _strategy_id
	        and constraint_type  = 0
	        and status = 0
	        and rule_type = 44
	        limit 1;
		raise notice 'Execution successfull : temp table ending_rule';

		-- create temp table for bl_override_temp_table_query
		bl_override_temp_table_query = price_markdown.fn_v3_build_step3_bl_override_temp_table_query(_strategy_id, _product_level, _store_level, _pcd_ids);
		raise notice 'bl_override_temp_table_query : %', bl_override_temp_table_query;
    	execute bl_override_temp_table_query;
		raise notice 'Execution successfull : bl_override_temp_table_query';

		-- create temp table for bl_override_temp_table_query
		ia_recc_temp_table_query = price_markdown.fn_v3_build_step3_ia_recc_temp_table_query(_strategy_id, _product_level, _store_level, _pcd_ids);
		raise notice 'ia_recc_temp_table_query : %', ia_recc_temp_table_query;
    	execute ia_recc_temp_table_query;
		raise notice 'Execution successfull : ia_recc_temp_table_query';

		-- create temp table for bl_override_temp_table_query
		overall_metrics_temp_table_query = price_markdown.fn_v3_build_step3_overall_metrics_temp_table_query();
		raise notice 'overall_metrics_temp_table_query : %', overall_metrics_temp_table_query;
    	execute overall_metrics_temp_table_query;
		raise notice 'Execution successfull : overall_metrics_temp_table_query';

		-- create temp table for upcoming_pcd_cte
		create temp table upcoming_pcd_cte on commit drop as 
        with future_pcd_cte as (
            select
                min(tsp.pcd_id) as pcd_id
            from 
				price_markdown.tb_strategy_pcd tsp
            where tsp.strategy_id = _strategy_id
                and (
                    tsp.pcd_start_date > date(timezone(_client_timezone, now()))
                    or tsp.pcd_end_date = (
                        select tsm.end_date from price_markdown.tb_strategy_master tsm where tsm.strategy_id = _strategy_id
                    )
               )
        )
        select
            bofc.product_level_id,
            bofc.store_level_id,
            bofc.approval_status
        from 
			bl_override_final_cte bofc
        where 
			bofc.pcd_id = (select pcd_id from future_pcd_cte);
		raise notice 'Execution successfull : temp table upcoming_pcd_cte';

		-- create temp table for bl_override_temp_table_query
		current_week_metric_temp_table_query = price_markdown.fn_v3_build_step3_current_week_metric_temp_table_query(_strategy_id, _product_level, _store_level, _pcd_ids, _client_timezone);
		raise notice 'current_week_metric_temp_table_query : %', current_week_metric_temp_table_query;
    	execute current_week_metric_temp_table_query;
		raise notice 'Execution successfull : current_week_metric_temp_table_query';
		
		-- create final temp table data query.
		final_table_data_temp_query = price_markdown.fn_v3_build_step3_final_table_data_temp_query(record_filter_where_clause);
		raise notice 'final_table_data_temp_query : %', final_table_data_temp_query;
    	execute final_table_data_temp_query;
		raise notice 'Execution successfull : final_table_data_temp_query';


		-- create final temp table data query.
		final_result_temp_table_query = price_markdown.fn_v3_build_step3_final_result_temp_table_query(pcd_metrics_where_clause, approval_filter_where_clause);
		raise notice 'final_result_temp_table_query : %', final_result_temp_table_query;
    	execute final_result_temp_table_query;
		raise notice 'Execution successfull : final_result_temp_table_query';


		if _record_sort_key is not null then
			if starts_with(_record_sort_key,'pcd_') then
				final_query_sort_order := array_append(
					final_query_sort_order,
					' ((pcd_metrics->>''' ||
					(regexp_match(_record_sort_key, 'pcd_[0-9]+'))[1]
					|| ''')::jsonb->>''' ||
					(regexp_match(_record_sort_key, 'pcd_[0-9]+_(.*)'))[1]
					|| ''')::numeric'
				);
			else
				final_query_sort_order := array_append(final_query_sort_order , _record_sort_key);
			end if;
			final_query_sort_order := array_append(final_query_sort_order , _record_sort_order);
		else
			final_query_sort_order := array_append(final_query_sort_order ,'product_level_value, store_level_value');
		end if ;

		raise notice ' sort order  ----   %', array_to_string(final_query_sort_order, ' , ');
		if array_length(final_query_sort_order, 1)  > 0 then
		   final_query_sort_order_by_string := array_to_string(final_query_sort_order, ' ');
		end if ;

		--================================================================================================================================
		-- find if custom_alerts_applicable
		select 
		    (case 
		        when exists (
		            select 1 
		            from price_markdown.tb_custom_alerts_trigger_data tcatd
		            where tcatd.strategy_id = _strategy_id
		            and tcatd.display_alert = 1
		            limit 1
		        ) 
		        then true 
		        else false 
		    end) into is_custom_alerts_applicable;

		-- if is_custom_alerts_applicable
		
		if is_custom_alerts_applicable then
			max_severity_select = ', tbl1.max_severity_id as max_alert_severity';
			triggered_case_select = ', tbl1.triggered_case as alert_triggered_case';

			select 
				* into custom_alerts_table_name
			from 
				price_markdown.fn_v3_build_step3_alerts_table(
					_strategy_id,
					false::boolean, 
					_product_level::int, 
					_store_level::int,
					_alerts_seviority_filter::integer[], 
					_alerts_metric_filter::integer[]
				);

			
			alerts_join_case = ' tbl1 on tbl2.product_level_id = tbl1.product_level_id and tbl2.store_level_id = tbl1.store_level_id ';
			if array_length(_alerts_seviority_filter, 1) > 0 or array_length(_alerts_metric_filter, 1) > 0 then 
				custom_alerts_join_type = ' inner join '|| custom_alerts_table_name || alerts_join_case;
			else 
				custom_alerts_join_type = ' left join ' || custom_alerts_table_name || alerts_join_case;
			end if;
			
			
		end if;
		


	
		--================================================================================================================================
				

		final_return_query = '
			select
				tb.rowid,
				tb.is_footer_row,
		        tb.is_row_locked,
		        tb.product_level_id,
		        tb.product_level_value,
		        tb.store_level_id,
		        tb.store_level_value,
		        tb.cw_offer_percentage,
		        null::double precision min_offer_value,
		        null::double precision max_offer_value,
		        tb.pcd_metrics,
		        tb.optimisation_type,
		        tb.step_count,
		        tb.total_count,
		        null::double precision cw_incremental_discount,
		        null::double precision cw_effective_price_point,
		        tb.brand,
		        tb.division,
		        tb.department,
				tb.style,
		        tb.color,
		        tb.size,
				tb.product_name,
		        tb.age,
		        tb.base_price,
		        null::bool show_alert,
		        null::double precision sales_units_diff,
		        null::double precision ia_discount_next_pcd,
		        null::int upcoming_pcd_id,
				tb.max_alert_severity,
				tb.alert_triggered_case
			from( 	
					(
	                    select 
							tbl2.*,
	                        null::integer as optimisation_type,
	                        null::integer as step_count,
	                        null::integer as total_count
							'|| max_severity_select || triggered_case_select ||'
	                    from 
							final_result tbl2
						' || custom_alerts_join_type || '
	                    order by 
							' || final_query_sort_order_by_string || '
	                    limit ' || _limit::text || '
						offset ' || _offset::text || '
	               	)
	                union all
                    (
		                   select rowId,order_,is_footer_row,false as is_row_locked,
		                        product_level_id,product_level_value,store_level_id,store_level_value,
		                        cw_offer_percentage,jsonb_object_agg(key,value) as pcd_metrics,
		                        null::text[] as brand,
		                        null::text[] as division,
		                        null::text[] as department,
								null::text[] as style,
		                        null::text[] as color,
		                        null::text[] as size,
								null::text[] as product_name,
								null::float8 as age,
		                        null::float8 as base_price,
		                        sm.optimisation_type,
		                        sm.step_count,
		                        (select count(*) from final_result)::integer as total_count,
								null::integer as max_severity_id,
								null::text as triggered_case
		                    from 
								overall_metrics_cte
		                    cross join (
		                        select step_count,optimisation_type from price_markdown.tb_strategy_master where strategy_id = ' || _strategy_id::text || '
		                    ) sm
		                    cross join 
		                    lateral jsonb_each(pcd_metrics) as pcd_metric(key,value)
		                    group by rowId, order_, is_footer_row, product_level_id, product_level_value, store_level_id, store_level_value, cw_offer_percentage, sm.optimisation_type, sm.step_count
                    )
			)tb
			order by order_;
		';
		raise notice 'final_return_query : % ', final_return_query;
		return query execute final_return_query;
		
  	END;
$function$
;
