--liquibase formatted sql
--changeset durgaprasad.tulugu@impactanalytics.co:fn_v3_get_step3_default_table_data_9 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:approval
--comment: fn_v3_get_step3_default_table_data_9
--rollback: SELECT 1

DROP FUNCTION if exists price_markdown.fn_v3_get_step3_default_table_data;


CREATE OR REPLACE FUNCTION price_markdown.fn_v3_get_step3_default_table_data(_strategy_id integer, _page_number integer DEFAULT 1, _number_of_pages integer DEFAULT 1, _limit integer DEFAULT 100, _offset integer DEFAULT NULL::integer, _pcd_metrics_filter jsonb DEFAULT NULL::jsonb, _approval_filter text[] DEFAULT NULL::text[], _records_filters jsonb DEFAULT NULL::jsonb, _record_sort_key character varying DEFAULT NULL::character varying, _record_sort_order character varying DEFAULT 'asc'::character varying, _is_data_changed boolean DEFAULT false, _include_copy_ia boolean DEFAULT false, _copy_ia_session_id text DEFAULT ''::text, _alerts_seviority_filter integer[] DEFAULT NULL::integer[], _alerts_metric_filter integer[] DEFAULT NULL::integer[], _currency_type text DEFAULT ''::text)
 RETURNS TABLE(rowid text, is_footer_row boolean, is_row_locked boolean, product_level_id integer, product_level_value text, store_level_id integer, store_level_value text, cw_offer_percentage double precision, min_offer_value double precision, max_offer_value double precision, pcd_metrics jsonb, optimisation_type integer, step_count integer, total_count integer, cw_incremental_discount double precision, cw_effective_price_point double precision, currency_name text, base_price double precision, show_alert boolean, sales_units_diff double precision, ia_discount_next_pcd double precision, upcoming_pcd_id integer, max_alert_severity integer, alert_triggered_case text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
	DECLARE
		vl_test_query text;
		vl_test_query1 text;
		vl_data_offset int;
		vl_output_limit int;
		vl_where_condition varchar[];
		vl_sort_order varchar[];
		vl_where_condition_string text;
		vl_order_by_string text;
		vl_total_count int;
		vl_table_count int;
		vl_table_data_cte_name text;
		vl_overall_metrics_cte_name text;
		vl_pcd_metric_filter jsonb;
		vl_pcd_metric text;
		vl_pcd_metric_value jsonb;
		validation_query text;
        vl_approval_filter_condition text = '';
        vl_approval_status_join_condition  text = '';
		rc record;
		filter_record record;
		curr_filter text;
		curr_value jsonb;

		const_client_timezone text = (select remarks from metaschema.tb_app_sub_master where name = 'client_timezone');
        const_copy_ia_exists bool = false;
        const_approval_filter_enum_array price_markdown.strategy_approval_status_enum[] = array[]::price_markdown.strategy_approval_status_enum[];
		is_custom_alerts_applicable bool;
		custom_alerts_table_name text;
		custom_alerts_join_type text := '';
		alerts_join_case text;
		max_severity_select text := ', null::int as max_alert_severity';
		triggered_case_select text := ', null::text as alert_triggered_case';
		_preferred_currency_type text;
	BEGIN
		
		if _currency_type is null or _currency_type = '' then 
			select fn_get_strategy_preferred_currency_type into _currency_type from price_markdown.fn_get_strategy_preferred_currency_type(_strategy_id);	    
		end if;

		if _offset is null then
			vl_data_offset :=(_page_number - 1) * _limit;
		else
			vl_data_offset := _offset;
		end if;
		vl_output_limit := _limit * _number_of_pages;
		vl_table_count := 0;

        execute format(
                'select case when
                    exists (
                        select 1 from price_markdown.tb_strategy_master where strategy_id = %1$s and last_copy_ia_session_id = ''%2$s''
                    ) then true
                    else false
                    end
                ; ',
                _strategy_id,
                _copy_ia_session_id
        ) into const_copy_ia_exists;
        raise notice 'copy_ia exists: %', const_copy_ia_exists;

		execute format('select count(*) from information_schema.tables where table_name = ''tb_strategy_step4_full_%2$s_%1$s'' and table_schema=''price_markdown_temp'' ;',_strategy_id, _currency_type) into vl_table_count;
		if vl_table_count = 0 or not exists (select 1 from price_markdown.tb_strategy_master where strategy_id = _strategy_id and final_data_prepared=true) then
		   _is_data_changed:= true;
		end if;
		raise notice 'Is table exist :: -- %', vl_table_count;
		raise notice 'Is data changed :: -- %', _is_data_changed;

		if _is_data_changed = true and _include_copy_ia = false then
			select preferred_currency_type
            into _preferred_currency_type
            from price_markdown.tb_strategy_master
            where strategy_id = _strategy_id;
			
			execute format('select * from price_markdown.fn_populate_step4_data(%1$L, ''dominating'') ;', _strategy_id);
			execute format('select * from price_markdown.fn_populate_step4_data(%1$L, ''global'') ;', _strategy_id);
			if _preferred_currency_type = 'local' then
				execute format('select * from price_markdown.fn_populate_step4_data(%1$L, ''local'') ;', _strategy_id);
			end if;
		end if;

		--	vl_test_query = format('select count(*) from (select 1 from price_markdown.tb_strategy_sku_store_mapping where strategy_id = %1$s group by product_level_id, store_level_id) dd', _strategy_id);
		--	execute vl_test_query into vl_total_count;
	
		if _records_filters is not null then
			raise notice 'Input JSON object: %', _records_filters;
	
			for filter_record in select * from jsonb_each(_records_filters)
			loop
				curr_filter = filter_record.key;
				curr_value = filter_record.value;
				raise notice 'curr_filter %',curr_filter;
				raise notice 'curr_value %', curr_value;
			
				IF curr_filter = ANY (ARRAY['brand', 'sub_department', 'department', 'product_name']) THEN
			        RAISE NOTICE 'Array Column';
			
			        -- Convert the array column to lowercase comma-separated string
			        curr_filter := 'array_to_string(' || curr_filter || ', '','')';
		       end if;
				if curr_value->>'value1' is not null then
					vl_where_condition:= array_append(
	                vl_where_condition ,
	                global.fn_generate_filter_condition_for_int(
	                    curr_filter,
	                    curr_value->>'operator',
	                    curr_value->>'value1',
	                    curr_value->>'value2'
		                )
		            );
		        else
		        	vl_where_condition:= array_append(
	                vl_where_condition ,
	                global.fn_generate_filter_condition_for_string(
	                    format('lower(%1$s)',curr_filter),
	                    curr_value->>'operator',
	                    lower(curr_value->>'value')
	                )
	            );
	           end if;
			end loop;
		end if;
		

        if coalesce(array_length(_approval_filter, 1),0) = 1 then

            if 'approved' = any(_approval_filter) then
                const_approval_filter_enum_array = array[
                    'Initially Approved'::price_markdown.strategy_approval_status_enum,
                    'Finally Approved'::price_markdown.strategy_approval_status_enum
                ]::price_markdown.strategy_approval_status_enum[];
            end if;

            if 'not_approved' = any(_approval_filter) then
                const_approval_filter_enum_array = array_append(
                    const_approval_filter_enum_array,
                    'Not Approved'
                );
            end if;

            vl_approval_filter_condition := format(
                    ' where fw_approval_status in (%1$s) ',
                    array_to_string(
                        array(
                            SELECT quote_literal(unnest(const_approval_filter_enum_array))
                        )
                        ,
                        ','
                    )
                );

            vl_approval_status_join_condition = format(
                '
                inner join
                (
                    select product_level_id,store_level_id from price_markdown_temp.tb_future_week_data_%1$s fw
                    %2$s
                ) fw
                on fw.product_level_id = s.product_level_id and fw.store_level_id = s.store_level_id
                ',
                _strategy_id,
                vl_approval_filter_condition
            );
        end if;


		if _pcd_metrics_filter is not null then
			RAISE NOTICE 'Input JSON object: %', _pcd_metrics_filter;

			for vl_pcd_metric, vl_pcd_metric_value in select * from jsonb_each(_pcd_metrics_filter) loop
				raise notice 'vl_pcd_metric %',vl_pcd_metric;
				raise notice 'vl_pcd_metric_value %', vl_pcd_metric_value;
			
				if vl_pcd_metric_value->>'value' is not null then
				raise notice 'inside string condition if';
		        	vl_where_condition:= array_append(
	                vl_where_condition ,
	                global.fn_generate_filter_condition_for_string(
					        format(
					            'lower((pcd_metrics->>''%1$s'')::jsonb->>''%2$s'')',
					            (regexp_match(vl_pcd_metric, 'pcd_[0-9]+'))[1],
					            (regexp_match(vl_pcd_metric, 'pcd_[0-9]+_(.*)'))[1]
					    ),
					    vl_pcd_metric_value->>'operator',
					    lower(vl_pcd_metric_value->>'value')
	                )
	            );
	           else
				vl_where_condition := array_append(
					vl_where_condition,
                    global.fn_generate_filter_condition_for_int(
                        format(
                            ' round(((pcd_metrics->>''%1$s'')::jsonb->>''%2$s'')::numeric,2) ',
                            (regexp_match(vl_pcd_metric, 'pcd_[0-9]+'))[1],
                            (regexp_match(vl_pcd_metric, 'pcd_[0-9]+_(.*)'))[1]
                        ),
                        vl_pcd_metric_value->>'operator',
                        vl_pcd_metric_value->>'value1',
                        vl_pcd_metric_value->>'value2'
                    )
				);

			 end if;
			end loop;

		end if;

		if _record_sort_key is not null then
			vl_sort_order := array_append(vl_sort_order ,' Order by ');
			if starts_with(_record_sort_key,'pcd_') then
				vl_sort_order := array_append(
					vl_sort_order,
					' ((pcd_metrics->>''' ||
					(regexp_match(_record_sort_key, 'pcd_[0-9]+'))[1]
					|| ''')::jsonb->>''' ||
					(regexp_match(_record_sort_key, 'pcd_[0-9]+_(.*)'))[1]
					|| ''')::numeric'
				);
			else
				vl_sort_order := array_append(vl_sort_order , _record_sort_key);
			end if;
			vl_sort_order := array_append(vl_sort_order , _record_sort_order);
		else
			vl_sort_order := array_append(vl_sort_order ,' Order by product_level_value, store_level_value');
		end if ;

		raise notice ' sort order  ----   %', array_to_string(vl_sort_order, ' , ');

		if array_length(vl_where_condition, 1)  > 0 then
		   vl_where_condition_string := array_to_string(vl_where_condition, ' and ');
		end if ;

		if array_length(vl_sort_order, 1)  > 0 then
		   vl_order_by_string := array_to_string(vl_sort_order, ' ');
		end if ;

		if vl_where_condition is not null then
		     vl_where_condition_string := ' where '::text  || vl_where_condition_string;
		end if;

		if _include_copy_ia and const_copy_ia_exists then
			vl_table_data_cte_name := format('price_markdown_temp.tb_copy_table_data_cte_%2$s_%1$s', _strategy_id, _currency_type);
			vl_overall_metrics_cte_name := format('price_markdown_temp.tb_copy_overral_overall_metrics_cte_%2$s_%1$s', _strategy_id, _currency_type);
		else
			vl_table_data_cte_name := format('price_markdown_temp.tb_table_data_cte_%2$s_%1$s', _strategy_id, _currency_type);
			vl_overall_metrics_cte_name := format('price_markdown_temp.tb_overall_metrics_cte_%2$s_%1$s',_strategy_id, _currency_type);
		end if;

		raise notice 'where condition %', vl_where_condition_string;

		raise notice ' table data ---  %         overall data ---- %', vl_table_data_cte_name, vl_overall_metrics_cte_name;
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
					true::boolean, 
					null::int, 
					null::int,
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
		if (_include_copy_ia and const_copy_ia_exists) then
			vl_test_query = format('select count(*) from (select 1 from price_markdown_temp.tb_table_data_cte_%2$s_%1$s group by product_level_id, store_level_id) dd',
								_strategy_id,
								_currency_type
							);
			raise notice ' total count query  ----   %', vl_test_query;
			execute vl_test_query into vl_total_count;

			vl_test_query:= format('
				with pcd_mapping as (

						select tsp.pcd_id,next_pcd.pcd_id as next_pcd_id,
						previous_pcd.pcd_id as previous_pcd_id
						from price_markdown.tb_strategy_pcd tsp
						left  join (
							select pcd_id,pcd_start_date from price_markdown.tb_strategy_pcd where strategy_id =  %1$L
						) next_pcd
						on tsp.pcd_end_date = next_pcd.pcd_start_date - interval ''1 day''
						left join (
							select pcd_id, pcd_end_date from price_markdown.tb_strategy_pcd where strategy_id = %1$L

						) previous_pcd
						on tsp.pcd_start_date = previous_pcd.pcd_end_date + interval ''1 day''
						where tsp.strategy_id = %1$L

					),
				final_result as (
					select *  from (
	                        select
								rowId,
								is_footer_row,
								min(is_row_locked)::bool as is_row_locked,
								s.product_level_id,
								s.product_level_value,
								s.store_level_id,
								s.store_level_value,
								cw_offer_percentage,
								min(recommended_offer_percentage) as min_offer_value,
								max(recommended_offer_percentage) as max_offer_value,
                                coalesce(min(approval_status),''Not Approved''::price_markdown.strategy_approval_status_enum) as min_approval_status,
                                coalesce(max(approval_status),''Not Approved''::price_markdown.strategy_approval_status_enum) as max_approval_status,
								currency_name,
								base_price,
								bool_or(coalesce(show_alert, false)) as show_alert,
								max(sales_units_diff) as sales_units_diff,
					        	max(ia_discount_next_pcd) as ia_discount_next_pcd,
								max(upcoming_pcd_id) as upcoming_pcd_id,
								jsonb_object_agg(
									''pcd_'' || pcd_id::text, jsonb_build_object(
										''finalized_is_locked'', false,
										''finalized_discount_percent'', recommended_offer_percentage,
                                        ''incremental_discount'', incremental_discount,
                                        ''approval_status'', coalesce(approval_status,''Not Approved''::price_markdown.strategy_approval_status_enum),
										''finalized_pp'', effective_price_point::numeric,
										''margin_finalized'', margin,
										''revenue_finalized'', revenue,
										''unit_finalized'', sales_units,
										''ia_reco_discount_percent'', ia_recommended_offer_percentage,
                                        ''ia_incremental_discount'',ia_incremental_discount,
										''ia_reco_pp'', ia_effective_price_point::numeric,
										''unit_ia_reco'', ia_sales_units,
										''margin_ia_reco'', ia_margin,
										''revenue_ia_reco'', ia_revenue,
										''is_locked'', is_locked,
										''enable_lock'', enable_lock,
										''next_pcd'',next_pcd_id,
										''previous_pcd'',previous_pcd_id,
										''finalized_inventory'',inventory,
							            ''finalized_markdown_dollar'',markdown_dollar,
										''ia_inventory'',ia_inventory,
							            ''ia_markdown_dollar'',ia_markdown_dollar,
										''finalized_sell_through'', sell_through,
										''ia_sell_through'', ia_sell_through
									)
								) as pcd_metrics,
								null::integer as optimisation_type,
								null::integer as step_count,
                                cw_incremental_discount,
                                cw_effective_price_point
							from
								%8$s s
							inner join
								pcd_mapping using(pcd_id)
                            %9$s

							group by
								s.product_level_id,
								s.product_level_value,
								s.store_level_id,
								s.store_level_value,
								rowId,
								is_footer_row,
								cw_offer_percentage,
                                cw_incremental_discount,
                                cw_effective_price_point,
								currency_name,
								base_price
                    ) s
                    %4$s

				)
				select * from (
					select
                        rowId,
                        is_footer_row,
                        is_row_locked,
                        tbl2.product_level_id,
                        product_level_value,
                        tbl2.store_level_id,
                        store_level_value,
                        cw_offer_percentage,
                        min_offer_value,
                        max_offer_value,
                        pcd_metrics,
                        optimisation_type,
                        step_count,
                        %6$s::int as total_count,
                        cw_incremental_discount,
                        cw_effective_price_point,
						currency_name,
						base_price,
						show_alert,
						sales_units_diff,
			        	ia_discount_next_pcd,
						upcoming_pcd_id
						%10$s
						%11$s
                    from final_result tbl2
					%12$s
					%5$s
					limit %2$s offset %3$s
			    ) s
                union all
                select * from (
                    select
                        rowId,
                        is_footer_row,
                        false as is_row_locked,
                        product_level_id,
                        product_level_value,
                        store_level_id,
                        store_level_value,
                        cw_offer_percentage,
                        null::float8 as min_offer_value,
                        null::float8 as max_offer_value,
                        jsonb_object_agg(key, value) as pcd_metrics,
                        sm.optimisation_type,
                        sm.step_count,
                        (select count(*) from final_result)::int as total_count,
                        cw_incremental_discount,
                        cw_effective_price_point,
						currency_name,
						base_price,
						bool_or(coalesce(show_alert, false)) as show_alert,
						max(sales_units_diff) as sales_units_diff,
			        	max(ia_discount_next_pcd) as ia_discount_next_pcd,
						max(upcoming_pcd_id) as upcoming_pcd_id,
						null::integer as max_severity_id,
						null::text as triggered_case
                    from
                        %7$s
                    cross join (select step_count,optimisation_type from price_markdown.tb_strategy_master where strategy_id = %1$L ) sm
                    cross join lateral jsonb_each(pcd_metrics) as pcd_metric(key, value)
                    group by
                        1,2,3,4,5,6,7,8,12,13,15,16,17,18
                ) s
				order by is_footer_row;',
					_strategy_id,
                    vl_output_limit,
                    vl_data_offset,
                    vl_where_condition_string,
                    vl_order_by_string,
                    vl_total_count,
                    vl_overall_metrics_cte_name,
                    vl_table_data_cte_name,
                   	vl_approval_status_join_condition,
					max_severity_select,
					triggered_case_select,
					custom_alerts_join_type
                );
              else
              	validation_query = format('SELECT table_name FROM information_schema.tables WHERE table_schema = ''price_markdown_temp'' and table_name like ''tb_strategy_step4_full_%2$s_%1$s''', _strategy_id, _currency_type);
				execute validation_query into rc;
				if rc is not NULL then
	    			vl_test_query = format('select count(*) from (select 1 from price_markdown_temp.tb_strategy_step4_full_%3$s_%1$s %2$s group by product_level_id, store_level_id) dd', _strategy_id, vl_where_condition_string, _currency_type);
					raise notice ' total count query  ----   %', vl_test_query;
					execute vl_test_query into vl_total_count;

					 vl_test_query:=format('
						with final_result as (
							select
                                rowId,
                                is_footer_row,
                                is_row_locked::bool,
                                s.product_level_id,
                                s.product_level_value,
                                s.store_level_id,
                                s.store_level_value,
                                cw_offer_percentage,
                                min_offer_value::float8,
                                max_offer_value::float8,
                                pcd_metrics,
                                optimisation_type,
                                null::integer as step_count,
                                %6$s::integer as total_count,
                                cw_incremental_discount,
                                cw_effective_price_point,
								s.currency_name,
								s.base_price,
								coalesce(s.show_alert, false) as show_alert,
								s.sales_units_diff,
					        	s.ia_discount_next_pcd,
								s.upcoming_pcd_id
                            from
                                price_markdown_temp.tb_strategy_step4_full_%11$s_%1$s s
                            %7$s
                            %4$s
						)
						select 
							s.*
						from (
                            select * from (
                                select
                                    tbl2.*
									%9$s
									%10$s
                                from final_result tbl2
								%8$s
                                %5$s limit %2$s offset %3$s
                            ) s
							union all
                            select * from (
                                select
                                    rowId,
                                    is_footer_row,
                                    false as is_row_locked,
                                    product_level_id,
                                    product_level_value,
                                    store_level_id,
                                   	store_level_value,
                                    cw_offer_percentage,
                                    null::float8 as min_offer_value,
                                    null::float8 as max_offer_value,
                                    jsonb_object_agg(key, value) as pcd_metrics,
                                    sm.optimisation_type,
                                    sm.step_count,
                                    (select count(*) from final_result)::int as total_count,
                                    cw_incremental_discount,
                                    cw_effective_price_point,
									null::text as currency_name,
									null::float8 as base_price,
									null::boolean as show_alert,
									null::float8 as sales_units_diff,
						        	null::float8 as ia_discount_next_pcd,
									null::integer as upcoming_pcd_id,
									null::integer as max_severity_id,
									null::text as triggered_case
                                from
                                    price_markdown_temp.tb_overall_metrics_cte_%11$s_%1$s
                                cross join (select step_count,optimisation_type from price_markdown.tb_strategy_master where strategy_id = %1$L ) sm
                                cross join lateral jsonb_each(pcd_metrics) as pcd_metric(key, value)
                                group by
                                    1,2,3,4,5,6,7,8,12,13,15,16
                            ) s
						) s
						order by is_footer_row ;',
                        _strategy_id,
                        vl_output_limit,
                        vl_data_offset,
                        vl_where_condition_string,
                        vl_order_by_string,
                        vl_total_count,
                       	vl_approval_status_join_condition,
						custom_alerts_join_type,
						max_severity_select,
						triggered_case_select,
						_currency_type
                        );
					else
						vl_test_query = 'select ';
					end if;
			  end if;

	raise notice 'query- Final --%' , vl_test_query;
    return query execute vl_test_query;
  end;
$function$
;
