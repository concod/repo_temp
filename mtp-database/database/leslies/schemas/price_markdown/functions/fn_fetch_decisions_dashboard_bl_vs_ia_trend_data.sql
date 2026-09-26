--liquibase formatted sql
--changeset anoop.madamsetty@impactanalytics.co:fn_fetch_decisions_dashboard_bl_vs_ia_trend_data-3 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:approval
--comment: changed store hierarchy filter logic


DROP FUNCTION if exists price_markdown.fn_fetch_decisions_dashboard_bl_vs_ia_trend_data;

CREATE OR REPLACE FUNCTION price_markdown.fn_fetch_decisions_dashboard_bl_vs_ia_trend_data(
    _strategy_id integer[],
    product_h1 integer[],
    product_h2 integer[],
    product_h3 integer[],
    product_h4 integer[],
    brand integer[],
    _s0_ids integer[],
    _s1_ids integer[],
    _s2_ids integer[],
    _s3_ids integer[],
    _s4_ids integer[],
    _start_date date,
    _end_date date,
    in_user_id integer
)
 RETURNS TABLE(decisiondashboardcomparisoncarddata jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    query_ text :=  '';
   	dummy_data_query text:=    'select null::jsonb';
	filtered_strategy_ids integer[];
	product_hierarchy_level integer;
	product_hierarchy_values integer[];
	strategy_where_arr text[];
	q1 text;
	start_time TIMESTAMP;
    end_time TIMESTAMP;
	vl_test_query text;
	ia_remaining_inv float;
	ia_inventory_cost  float;
	ia_inventory_retail  float;
	fin_remaining_inv float;
	fin_inventory_cost float;
	fin_inventory_retail float;
begin
	if array_length(_strategy_id, 1) > 0 then
		filtered_strategy_ids := _strategy_id;
	else
		if array_length(product_h4, 1) > 0 then
			product_hierarchy_level := 3;
			product_hierarchy_values := product_h4;
		elsif array_length(product_h3, 1) > 0 then
			product_hierarchy_level := 2;
			product_hierarchy_values := product_h3;
		elsif array_length(product_h2, 1) > 0 then
			product_hierarchy_level := 1;
			product_hierarchy_values := product_h2;
		elsif array_length(product_h1, 1) > 0 then
			product_hierarchy_level := 0;
			product_hierarchy_values := product_h1;
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
				RAISE NOTICE 'strategy_where_arr 1 statement: %', strategy_where_arr;
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

		if array_length(brand, 1) > 0 then
				strategy_where_arr := array_append(strategy_where_arr, format('and sm.strategy_id IN (
					    SELECT
				            strategy_id
				        FROM
				            price_markdown.tb_strategy_hierarchy
				        WHERE is_product_hierarchy = 1
					    AND hierarchy_level = 0
					    AND hierarchy_value = ANY(array[%1$s])
			    	)', array_to_string(brand, ','))) ;
					RAISE NOTICE 'strategy_where_arr 3 statement: %', strategy_where_arr;
		end if;

		vl_test_query := format('select
							array_agg(sm.strategy_id)
						  from
							price_markdown.tb_strategy_master sm
						  where
							sm.status in (1,2,3,4,6)
							and sm.start_date <= ''%2$s''::date
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
		begin
			--tb_temp_strategy_metrics
			vl_test_query :=  'drop table if exists tb_temp_strategy_metrics;';
			execute vl_test_query;
			vl_test_query :=  ('create temp table tb_temp_strategy_metrics as
			select *
    	from price_markdown.tb_strategy_date_metrics_fin' || Format(' where strategy_id = ANY(%L)', filtered_strategy_ids) || Format(' and recommendation_date between %L and %L', _start_date, _end_date)  || ' and is_approved = 1'
								);

			RAISE NOTICE 'tb_temp_strategy_metrics 1 statement: %', vl_test_query;
			start_time := clock_timestamp();
			execute vl_test_query using filtered_strategy_ids;
			end_time := clock_timestamp();
			RAISE NOTICE 'Time taken SQL tb_temp_strategy_metrics 1 statement: %', end_time - start_time;


			--tb_temp_strategy_ia_reco
			vl_test_query :=  'drop table if exists tb_temp_strategy_ia_reco;';
			execute vl_test_query;
			vl_test_query :=  ('create temp table tb_temp_strategy_ia_reco as
			select *
    	from price_markdown.tb_strategy_date_metrics_ia' || Format(' where strategy_id = ANY(%L)', filtered_strategy_ids) || Format(' and recommendation_date between %L::date and %L::date', _start_date, _end_date) || ' and is_approved = 1'
								);
			RAISE NOTICE 'vl_test_query tb_temp_strategy_ia_reco statement: %', vl_test_query;
			start_time := clock_timestamp();
			execute vl_test_query using filtered_strategy_ids;
			end_time := clock_timestamp();
			RAISE NOTICE 'Time taken SQL tb_temp_strategy_ia_reco statement: %', end_time - start_time;


			--tb_temp_bl_inventory_at_end
			vl_test_query :=  'drop table if exists tb_temp_bl_inventory_at_end;';
	  		execute vl_test_query;
	  		vl_test_query :=  ('create temp table tb_temp_bl_inventory_at_end as
								select sum(remaining_inv) as remaining_inv,
										sum(inventory_cost) as inventory_cost,
										sum(inventory_retail) as inventory_retail
								from (
								        select
									        row_number() over (
									            partition by bl.strategy_id
									            order by bl.strategy_id,recommendation_date asc
									        ) as rank_,
									        inventory as remaining_inv,
										inventory_cost,
										inventory_retail,
									        bl.strategy_id
								        from tb_temp_strategy_metrics bl
							        ) inventory_subquery
							    where rank_ = 1');
			RAISE NOTICE 'vl_test_query tb_temp_bl_inventory_at_end statement: %', vl_test_query;
			start_time := clock_timestamp();
			execute vl_test_query;
			end_time := clock_timestamp();
			RAISE NOTICE 'Time taken SQL tb_temp_bl_inventory_at_end statement: %', end_time - start_time;

			select * from tb_temp_bl_inventory_at_end into fin_remaining_inv, fin_inventory_cost, fin_inventory_retail;
			raise notice '********** %,%,%', fin_remaining_inv, fin_inventory_cost, fin_inventory_retail;


			--tb_temp_ia_reco_inventory_at_end
			vl_test_query :=  'drop table if exists tb_temp_ia_reco_inventory_at_end;';
	  		execute vl_test_query;
			vl_test_query :=  ('create temp table tb_temp_ia_reco_inventory_at_end as
								select sum(remaining_inv) as remaining_inv,
										sum(inventory_cost) as inventory_cost,
										sum(inventory_retail) as inventory_retail
								from (
							        select
								        row_number() over (
								            partition by ia_reco.strategy_id
								            order by ia_reco.strategy_id,recommendation_date asc
								        ) as rank_,
								        inventory as remaining_inv,
										inventory_cost,
										inventory_retail,
								        ia_reco.strategy_id
							        from tb_temp_strategy_ia_reco ia_reco
							        ) inventory_subquery
							    where rank_ = 1');
			RAISE NOTICE 'vl_test_query tb_temp_ia_reco_inventory_at_end statement: %', vl_test_query;
			start_time := clock_timestamp();
			execute vl_test_query;
			end_time := clock_timestamp();
			RAISE NOTICE 'Time taken SQL tb_temp_ia_reco_inventory_at_end statement: %', end_time - start_time;

			select * from tb_temp_ia_reco_inventory_at_end into ia_remaining_inv, ia_inventory_cost, ia_inventory_retail;
			raise notice '********** %,%,%', ia_remaining_inv, ia_inventory_cost, ia_inventory_retail;

			--tb_temp_aggregate_data_finalized
			vl_test_query :=  'drop table if exists tb_temp_aggregate_data_finalized;';
	  		execute vl_test_query;
			vl_test_query :=  format('create temp table tb_temp_aggregate_data_finalized as (
								select
							        round((sum(sm.margin) / NULLIF(sum(sm.revenue),0))::numeric,2)*100 as bl_gm_percent,
							        round((sum(sm.margin) / NULLIF(sum(sm.sales_units),0))::numeric,2) as bl_aum_$,
							        round((sum(sm.revenue) / NULLIF(sum(sm.sales_units),0))::numeric,2) as bl_aur_$,
							        round((sum(sm.revenue))::numeric,2) as bl_revenue_$,
							        round((sum(sm.margin))::numeric,2) as bl_gm_$,
							        round(sum(sm.spend)::numeric, 2) as bl_markdown_$,
									round(%2$L::numeric, 2) as bl_inventory_cost,
									round(%3$L::numeric, 2) as bl_inventory_retail,
							        round(sum(sm.sales_units)::numeric) as bl_sales_units,
							        round(%1$L::numeric) as bl_inventory,
							        round((sum(sir.margin) / NULLIF(sum(sir.revenue),0))::numeric,2)*100 as ia_reco_gm_percent,
							        round((sum(sir.margin) / NULLIF(sum(sir.sales_units),0))::numeric,2) as ia_reco_aum_$,
							        round((sum(sir.revenue) / NULLIF(sum(sir.sales_units),0))::numeric,2) as ia_reco_aur_$,
							        round((sum(sir.revenue))::numeric,2) as ia_reco_revenue_$,
							        round((sum(sir.margin))::numeric,2) as ia_reco_gm_$,
							        round(sum(sir.spend)::numeric, 2) as ia_reco_markdown_$,
									round(%5$L::numeric, 2) as ia_reco_inventory_cost,
									round(%6$L::numeric, 2) as ia_reco_inventory_retail,
							        round(sum(sir.sales_units)::numeric) as ia_reco_sales_units,
							        round(%4$L::numeric) as ia_reco_inventory
							    from
							        tb_temp_strategy_metrics sm
							        full outer join tb_temp_strategy_ia_reco sir on sm.strategy_id = sir.strategy_id
							        and sm.recommendation_date = sir.recommendation_date)',
							       fin_remaining_inv, fin_inventory_cost, fin_inventory_retail,
							       ia_remaining_inv, ia_inventory_cost, ia_inventory_retail
							      );
			RAISE NOTICE 'vl_test_query tb_temp_aggregate_data_finalized statement: %', vl_test_query;
			start_time := clock_timestamp();
			execute vl_test_query;
			end_time := clock_timestamp();
			RAISE NOTICE 'Time taken SQL tb_temp_aggregate_data_finalized statement: %', end_time - start_time;


			--final query
			vl_test_query :=format('drop table if exists public.tb_dashboard_bl_vs_ia_trend_data_%1$s;', in_user_id);
	  		execute vl_test_query;
			vl_test_query :=format('create unlogged table public.tb_dashboard_bl_vs_ia_trend_data_%1$s as
									select
									    jsonb_build_object(
									        ''gm_dollar'',
									        jsonb_build_object(
									            ''bl_override'',
									            jsonb_build_object(
									                ''value'',
									                bl_gm_$
									            ),
									            ''ia_recommended'',
									            json_build_object(
									                ''value'',
									                ia_reco_gm_$,
									                ''trend'',
									                case when bl_gm_$ < ia_reco_gm_$ then ''up''
									                when bl_gm_$ > ia_reco_gm_$ then ''down''
									                else ''''
									                end
									            )
									        ),
									        ''sales_dollar'',
									        jsonb_build_object(
									            ''bl_override'',
									            json_build_object(
									                ''value'',
									                bl_revenue_$
									            ),
									            ''ia_recommended'',
									            json_build_object(
									                ''value'',
									                ia_reco_revenue_$,
									                ''trend'',
									                case when bl_revenue_$ < ia_reco_revenue_$ then ''up''
									                when bl_revenue_$ > ia_reco_revenue_$ then ''down''
									                else ''''
									                end
									            )
									        ),
									        ''sales_unit'',
									        jsonb_build_object(
									            ''bl_override'',
									            json_build_object(
									                ''value'',
									                bl_sales_units
									            ),
									            ''ia_recommended'',
									            json_build_object(
									                ''value'',
									                ia_reco_sales_units,
									                ''trend'',
									                case when bl_sales_units < ia_reco_sales_units then ''up''
									                when bl_sales_units > ia_reco_sales_units then ''down''
									                else ''''
									                end
									            )
									        ),
									        ''gm_percent'',
									        jsonb_build_object(
									            ''bl_override'',
									            json_build_object(
									                ''value'',
									                bl_gm_percent
									            ),
									            ''ia_recommended'',
									            json_build_object(
									                ''value'',
									                ia_reco_gm_percent,
									                ''trend'',
									                case when bl_gm_percent < ia_reco_gm_percent then ''up''
									                when bl_gm_percent > ia_reco_gm_percent then ''down''
									                else ''''
									                end
									            )
									        ),
									        ''aur'',
									        jsonb_build_object(
									            ''bl_override'',
									            json_build_object(
									                ''value'',
									                bl_aur_$
									            ),
									            ''ia_recommended'',
									            json_build_object(
									                ''value'',
									                ia_reco_aur_$,
									                ''trend'',
									                case when bl_aur_$ < ia_reco_aur_$ then ''up''
									                when bl_aur_$ > ia_reco_aur_$ then ''down''
									                else ''''
									                end
									            )
									        ),
									        ''aum'',
									        jsonb_build_object(
									            ''bl_override'',
									            json_build_object(
									                ''value'',
									                bl_aum_$
									            ),
									            ''ia_recommended'',
									            json_build_object(
									                ''value'',
									                ia_reco_aum_$,
									                ''trend'',
									                case when bl_aum_$ < ia_reco_aum_$ then ''up''
									                when bl_aum_$ > ia_reco_aum_$ then ''down''
									                else ''''
									                end
									            )
									        ),
									        ''markdown_dollar'',
									        jsonb_build_object(
									            ''bl_override'',
									            json_build_object(
									                ''value'',
									                bl_markdown_$
									            ),
									            ''ia_recommended'',
									            json_build_object(
									                ''value'',
									                ia_reco_markdown_$,
									                ''trend'',
									                case when bl_markdown_$ < ia_reco_markdown_$ then ''up''
									                when bl_markdown_$ > ia_reco_markdown_$ then ''down''
									                else ''''
									                end
									            )
									        ),
											''inventory_cost'',
											jsonb_build_object(
												''bl_override'',
									            json_build_object(
									                ''value'',
									                bl_inventory_cost
									            ),
									            ''ia_recommended'',
									            json_build_object(
									                ''value'',
									                ia_reco_inventory_cost,
									                ''trend'',
									                case when bl_inventory_cost < ia_reco_inventory_cost then ''up''
									                when bl_inventory_cost > ia_reco_inventory_cost then ''down''
									                else ''''
									                end
									            )
											),
											''inventory_retail'',
											jsonb_build_object(
												''bl_override'',
									            json_build_object(
									                ''value'',
									                bl_inventory_retail
									            ),
									            ''ia_recommended'',
									            json_build_object(
									                ''value'',
									                ia_reco_inventory_retail,
									                ''trend'',
									                case when bl_inventory_retail < ia_reco_inventory_retail then ''up''
									                when bl_inventory_retail > ia_reco_inventory_retail then ''down''
									                else ''''
									                end
									            )
											),
									        ''inventory'',
									        jsonb_build_object(
									            ''bl_override'',
									            json_build_object(
									                ''value'',
									                bl_inventory
									            ),
									            ''ia_recommended'',
									            json_build_object(
									                ''value'',
									                ia_reco_inventory,
									                ''trend'',
									                case when bl_inventory < ia_reco_inventory then ''up''
									                when bl_inventory > ia_reco_inventory then ''down''
									                else ''''
									                end
									            )
									        )
									    ) as decisionDashboardComparisonCardData
									from
									    tb_temp_aggregate_data_finalized', in_user_id);

			RAISE NOTICE 'SQL final query statement: %', vl_test_query;
			start_time := clock_timestamp();
			execute vl_test_query;
			end_time := clock_timestamp();

			vl_test_query := format('select decisionDashboardComparisonCardData from public.tb_dashboard_bl_vs_ia_trend_data_%1$s',in_user_id);
			RAISE NOTICE 'SQL 5 statement: %', vl_test_query;
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