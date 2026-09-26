--liquibase formatted sql
--changeset harsh.singh@impactanalytics.co:fn_get_step4data_default_load_with_copy_19 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: fn_get_step4data_default_load_with_copy_19
--rollback: SELECT 1

DROP FUNCTION if exists price_markdown.fn_get_step4data_default_load_with_copy;


CREATE OR REPLACE FUNCTION price_markdown.fn_get_step4data_default_load_with_copy(in_refcursor refcursor, in_strategy_id integer, in_rule_type integer, in_pcd_ids integer[], in_constraint_type integer DEFAULT 0, in_rule_status integer DEFAULT 0, in_page_number integer DEFAULT 1, in_record_per_page integer DEFAULT 100, in_number_of_pages integer DEFAULT 1, in_record_offset integer DEFAULT NULL::integer, in_pcd_metrics_filter jsonb DEFAULT NULL::jsonb, in_approval_filter text[] DEFAULT NULL::text[], in_filters jsonb DEFAULT NULL::jsonb, in_sort_key character varying DEFAULT NULL::character varying, in_sort_order character varying DEFAULT 'asc'::character varying, in_is_data_changed boolean DEFAULT false, in_copy_data boolean DEFAULT false, in_copy_ia_session_id text DEFAULT ''::text, in_alerts_severity_filter integer[] DEFAULT NULL::integer[], in_alerts_metric_filter integer[] DEFAULT NULL::integer[])
 RETURNS TABLE(rowid text, is_footer_row boolean, is_row_locked boolean, product_level_id integer, product_level_value jsonb, store_level_id integer, store_level_value jsonb, cw_offer_percentage double precision, min_offer_value double precision, max_offer_value double precision, pcd_metrics jsonb, ia_pcd_metrics jsonb, optimisation_type integer, step_count integer, total_count integer, cw_incremental_discount double precision, cw_effective_price_point double precision, brand text[], division text[], department text[], style text[], color text[], size text[], product_name text[], age double precision, base_price double precision, show_alert boolean, sales_units_diff double precision, ia_discount_next_pcd double precision, upcoming_pcd_id integer, max_alert_severity integer, alert_triggered_case text)
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
		vl_pcd_metric text;
		vl_pcd_metric_value jsonb;
		validation_query text;
        vl_approval_filter_condition text = '';
        vl_approval_status_join_condition  text = '';
		rc record;
		filter_record record;
		curr_filter text;
		curr_value jsonb;
        _copy_ia_exists bool = false;
        _approval_filter_enum_array price_markdown.strategy_approval_status_enum[] = array[]::price_markdown.strategy_approval_status_enum[];
		is_custom_alerts_applicable bool;
		custom_alerts_table_name text;
		custom_alerts_join_type text := '';
		alerts_join_case text;
		max_severity_select text := ', null::int as max_alert_severity';
		triggered_case_select text := ', null::text as alert_triggered_case';
	BEGIN
	    if in_record_offset is null then
			vl_data_offset :=(in_page_number-1)*in_record_per_page;
		else
			vl_data_offset := in_record_offset;
		end if;
		vl_output_limit := in_record_per_page * in_number_of_pages;
		vl_table_count := 0;

        execute format(
                'select case when
                    exists (
                        select 1 from price_markdown.tb_strategy_master where strategy_id = %1$s and last_copy_ia_session_id = ''%2$s''
                    ) then true
                    else false
                    end
                ; ',
                in_strategy_id,
                in_copy_ia_session_id
        ) into _copy_ia_exists;

        raise notice 'copy_ia exists: %',_copy_ia_exists;



		execute format('select count(*) from information_schema.tables where table_name = ''tb_strategy_step4_full_%1$s'' and table_schema=''price_markdown_temp'' ;',in_strategy_id) into vl_table_count;
		if vl_table_count = 0 or not exists (select 1 from price_markdown.tb_strategy_master where strategy_id = in_strategy_id and final_data_prepared=true) then
		   in_is_data_changed:= true;
		end if;

		raise notice 'Is table exist :: -- %',vl_table_count;
		raise notice 'Is data changed :: -- %',in_is_data_changed;

		if in_is_data_changed = true and in_copy_data = false then
			execute format('select * from price_markdown.fn_populate_step4_data_v4(%1$L) ;',in_strategy_id);
		end if;

--		vl_test_query = format('select count(*) from (select 1 from price_markdown.tb_strategy_sku_store_mapping where strategy_id = %1$s group by product_level_id, store_level_id) dd', in_strategy_id);
--		execute vl_test_query into vl_total_count;
	
		if in_filters is not null then
		RAISE NOTICE 'Input JSON object: %', in_filters;
	
			for filter_record in select * from jsonb_each(in_filters)
			loop
				curr_filter = filter_record.key;
				curr_value = filter_record.value;
				raise notice 'curr_filter %',curr_filter;
				raise notice 'curr_value %', curr_value;
			
				IF curr_filter = ANY (ARRAY['brand', 'division', 'department', 'style', 'color', 'size', 'product_name']) THEN
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
		

        if coalesce(array_length(in_approval_filter,1),0) = 1 then

            if 'approved' = any(in_approval_filter) then
                _approval_filter_enum_array = array[
                    'Initially Approved'::price_markdown.strategy_approval_status_enum,
                    'Finally Approved'::price_markdown.strategy_approval_status_enum
                ]::price_markdown.strategy_approval_status_enum[];
            end if;

            if 'not_approved' = any(in_approval_filter) then
                _approval_filter_enum_array = array_append(
                    _approval_filter_enum_array,
                    'Not Approved'
                );
            end if;

            vl_approval_filter_condition := format(
                    ' where min_approval_status in (%1$s) ',
                    array_to_string(
                        array(
                            SELECT quote_literal(unnest(_approval_filter_enum_array))
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
                in_strategy_id,
                vl_approval_filter_condition
            );
        end if;


		if in_pcd_metrics_filter is not null then
			RAISE NOTICE 'Input JSON object: %', in_pcd_metrics_filter;

			for vl_pcd_metric,vl_pcd_metric_value in select * from jsonb_each(in_pcd_metrics_filter) loop
				raise notice 'vl_pcd_metric %',vl_pcd_metric;
				raise notice 'vl_pcd_metric_value %', vl_pcd_metric_value;
			
				if vl_pcd_metric_value->>'value' is not null then
				raise notice 'inside string condition if';
		        	vl_where_condition:= array_append(
	                vl_where_condition ,
	                global.fn_generate_filter_condition_for_string(
					        format(
					            'lower((pcd_metrics->>''%1$s'')::jsonb->>''%2$s'')',
					            (regexp_match(vl_pcd_metric, '^([0-9]+)'))[1],
					            (regexp_match(vl_pcd_metric, '^[0-9]+_(.*)'))[1]
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
                            (regexp_match(vl_pcd_metric, '^([0-9]+)'))[1],
                            (regexp_match(vl_pcd_metric, '^[0-9]+_(.*)'))[1]
                        ),
                        vl_pcd_metric_value->>'operator',
                        vl_pcd_metric_value->>'value1',
                        vl_pcd_metric_value->>'value2'
                    )
				);

			 end if;
			end loop;

		end if;

		if in_sort_key is not null then
			vl_sort_order := array_append(vl_sort_order ,' Order by ');
			if in_sort_key ~ '^[0-9]+_' then
				vl_sort_order := array_append(
					vl_sort_order,
					' ((pcd_metrics->>''' ||
					(regexp_match(in_sort_key, '^([0-9]+)'))[1]
					|| ''')::jsonb->>''' ||
					(regexp_match(in_sort_key, '^[0-9]+_(.*)'))[1]
					|| ''')::numeric'
				);
			else
				vl_sort_order := array_append(vl_sort_order , in_sort_key);
			end if;
			vl_sort_order := array_append(vl_sort_order , in_sort_order);
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

		if in_copy_data and _copy_ia_exists then
			vl_table_data_cte_name := format('price_markdown_temp.tb_copy_table_data_cte_%1$s', in_strategy_id);
			vl_overall_metrics_cte_name := format('price_markdown_temp.tb_copy_overral_overall_metrics_cte_%1$s', in_strategy_id);
		else
			vl_table_data_cte_name := format('price_markdown_temp.tb_table_data_cte_%1$s', in_strategy_id);
			vl_overall_metrics_cte_name := format('price_markdown_temp.tb_overall_metrics_cte_%1$s',in_strategy_id);
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
		            where tcatd.strategy_id = in_strategy_id
		            and tcatd.display_alert = 1
		            limit 1
		        )
		        then true
		        else false
		    end) into is_custom_alerts_applicable;

		if is_custom_alerts_applicable then
			max_severity_select = ', tbl1.max_severity_id as max_alert_severity';
			triggered_case_select = ', tbl1.triggered_case as alert_triggered_case';

			select
				* into custom_alerts_table_name
			from
				price_markdown.fn_v3_build_step3_alerts_table(
					in_strategy_id,
					true::boolean,
					null::int,
					null::int,
					in_alerts_severity_filter::integer[],
					in_alerts_metric_filter::integer[]
				);

			alerts_join_case = ' tbl1 on tbl2.product_level_id = tbl1.product_level_id and tbl2.store_level_id = tbl1.store_level_id ';
			if array_length(in_alerts_severity_filter, 1) > 0 or array_length(in_alerts_metric_filter, 1) > 0 then
				custom_alerts_join_type = ' inner join '|| custom_alerts_table_name || alerts_join_case;
			else
				custom_alerts_join_type = ' left join ' || custom_alerts_table_name || alerts_join_case;
			end if;
		end if;
		--================================================================================================================================

		if (in_copy_data and _copy_ia_exists) then
			vl_test_query = format('select count(*) from (select 1 from price_markdown_temp.tb_table_data_cte_%1$s group by product_level_id, store_level_id) dd',
									in_strategy_id
							);
			raise notice ' total count query  ----   %', vl_test_query;
			execute vl_test_query into vl_total_count;

			vl_test_query:= format('
				with pcd_mapping as (

						select tsp.pcd_id,
						tsp.order_number,
						lead(tsp.order_number) over (order by tsp.pcd_start_date) as next_order_number,
						lag(tsp.order_number) over (order by tsp.pcd_start_date) as prev_order_number
						from price_markdown.tb_strategy_pcd_new tsp
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
								brand,
					            division,
								department,
								style,
					            color,
								size,
								product_name,
								age,
								base_price,
								bool_or(coalesce(show_alert, false)) as show_alert,
								max(sales_units_diff) as sales_units_diff,
					        	max(ia_discount_next_pcd) as ia_discount_next_pcd,
								max(upcoming_pcd_id) as upcoming_pcd_id,
								jsonb_object_agg(
									pm.order_number::text, jsonb_build_object(
										''pcd_id'', pm.pcd_id,
										''finalized_is_locked'', false,
										''finalized_discount_percent'', recommended_offer_percentage,
                                        ''incremental_discount'', incremental_discount,
                                        ''approval_status'', coalesce(approval_status,''Not Approved''::price_markdown.strategy_approval_status_enum),
										''finalized_pp'', effective_price_point::numeric,
										''margin_finalized'', margin,
										''revenue_finalized'', revenue,
										''unit_finalized'', sales_units,
										''is_locked'', is_locked,
										''enable_lock'', enable_lock,
										''next_pcd'', pm.next_order_number,
										''previous_pcd'', pm.prev_order_number,
										''finalized_inventory'', inventory,
							            ''finalized_markdown_dollar'', markdown_dollar,
										''finalized_sell_through'', sell_through
									)
								) as pcd_metrics,
								jsonb_object_agg(
									pm.order_number::text, jsonb_build_object(
										''pcd_id'', pm.pcd_id,
										''ia_reco_discount_percent'', ia_recommended_offer_percentage,
                                        ''ia_incremental_discount'', ia_incremental_discount,
										''ia_reco_pp'', ia_effective_price_point::numeric,
										''unit_ia_reco'', ia_sales_units,
										''margin_ia_reco'', ia_margin,
										''revenue_ia_reco'', ia_revenue,
										''ia_inventory'', ia_inventory,
							            ''ia_markdown_dollar'', ia_markdown_dollar,
										''ia_sell_through'', ia_sell_through
									)
								) as ia_pcd_metrics,
								null::integer as optimisation_type,
								null::integer as step_count,
                                cw_incremental_discount,
                                cw_effective_price_point
							from
								%8$s s
							inner join
								pcd_mapping pm on s.pcd_id = pm.pcd_id
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
								brand,
					            division,
								department,
								style,
					            color,
								size,
								product_name,
								age,
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
                        ia_pcd_metrics,
                        optimisation_type,
                        step_count,
                        %6$s::int as total_count,
                        cw_incremental_discount,
                        cw_effective_price_point,
						brand,
			            division,
						department,
						style,
			            color,
						size,
						product_name,
						age,
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
                        pcd_metrics,
                        ia_pcd_metrics,
                        sm.optimisation_type,
                        sm.step_count,
                        (select count(*) from final_result)::int as total_count,
                        cw_incremental_discount,
                        cw_effective_price_point,
						brand,
			            division,
						department,
						style,
			            color,
						size,
						product_name,
						age,
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
                ) s
				order by is_footer_row;',
					in_strategy_id,
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
              	validation_query = format('SELECT table_name FROM information_schema.tables WHERE table_schema = ''price_markdown_temp'' and table_name like ''tb_strategy_step4_full_%1$s''', in_strategy_id);
				execute validation_query into rc;
				if rc is not NULL then
	    			vl_test_query = format('select count(*) from (select 1 from price_markdown_temp.tb_strategy_step4_full_%1$s %2$s group by product_level_id, store_level_id) dd', in_strategy_id, vl_where_condition_string);
					raise notice ' total count query  ----   %', vl_test_query;
					execute vl_test_query into vl_total_count;

					 vl_test_query:=format('
						with final_result as (
							select
                                rowId,
                                is_footer_row,
                                is_row_locked::bool,
                                s.product_level_id::int,
                                s.product_level_value,
                                s.store_level_id::int,
                                s.store_level_value,
                                cw_offer_percentage::float8,
                                null::float8 as min_offer_value,
                                null::float8 as max_offer_value,
                                pcd_metrics,
                                s.ia_pcd_metrics,
                                null::integer as optimisation_type,
                                null::integer as step_count,
                                %6$s::integer as total_count,
                                cw_incremental_discount,
                                cw_effective_price_point,
								s.brand,
					            s.division,
								s.department,
								s.style,
					            s.color,
								s.size,
								s.product_name,
								s.age::float8,
								s.base_price,
								coalesce(s.show_alert, false) as show_alert,
								s.sales_units_diff,
					        	s.ia_discount_next_pcd,
								s.upcoming_pcd_id
                            from
                                price_markdown_temp.tb_strategy_step4_full_%1$s s
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
                                    product_level_id::int,
                                    product_level_value,
                                    store_level_id::int,
                                   	store_level_value,
                                    cw_offer_percentage::float8,
                                    null::float8 as min_offer_value,
                                    null::float8 as max_offer_value,
                                    pcd_metrics,
                                    ia_pcd_metrics,
                                    sm.optimisation_type,
                                    sm.step_count,
                                    (select count(*) from final_result)::int as total_count,
                                    cw_incremental_discount,
                                    cw_effective_price_point,
									null::text[] as brand,
						            null::text[] as division,
									null::text[] as department,
									null::text[] as style,
						            null::text[] as color,
									null::text[] as size,
									null::text[] as product_name,
									null::float8 as age,
									null::float8 as base_price,
									null::boolean as show_alert,
									null::float8 as sales_units_diff,
						        	null::float8 as ia_discount_next_pcd,
									null::integer as upcoming_pcd_id,
									null::integer as max_severity_id,
									null::text as triggered_case
                                from
                                    price_markdown_temp.tb_overall_metrics_cte_%1$s
                                cross join (select step_count,optimisation_type from price_markdown.tb_strategy_master where strategy_id = %1$L ) sm
                            ) s
						) s
						order by is_footer_row ;',
                        in_strategy_id,
                        vl_output_limit,
                        vl_data_offset,
                        vl_where_condition_string,
                        vl_order_by_string,
                        vl_total_count,
                       	vl_approval_status_join_condition,
						custom_alerts_join_type,
						max_severity_select,
						triggered_case_select
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
