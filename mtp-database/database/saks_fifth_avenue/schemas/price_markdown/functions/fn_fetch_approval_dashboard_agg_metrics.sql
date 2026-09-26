--liquibase formatted sql
--changeset durgaprasad.tulugu@impactanalytics.co:fn_fetch_approval_dashboard_agg_metrics_9 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: fn_fetch_approval_dashboard_agg_metrics_9
--rollback: SELECT 1

DROP FUNCTION IF EXISTS price_markdown.fn_fetch_approval_dashboard_agg_metrics(_int4, _int4, _int4, _int4, _int4, _int4, _int4, _int4, _int4, date, date, bool, _int4, _int4);
CREATE OR REPLACE FUNCTION price_markdown.fn_fetch_approval_dashboard_agg_metrics(_strategy_id integer[], _l0_ids integer[], _l1_ids integer[], _l2_ids integer[], _l3_ids integer[], _l4_ids integer[], _brand_ids integer[], _s0_ids integer[], _s1_ids integer[], _start_date date, _end_date date, _is_dd_filters boolean DEFAULT false, _pcd_ids integer[] DEFAULT NULL::integer[])
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
	final_query text;
	final_response json := null;
    vl_test_query text :=  '';
   	filtered_strategy_ids integer[];
	product_hierarchy_level integer;
	product_hierarchy_values integer[];
	store_hierarchy_level integer;
	store_hierarchy_values integer[];
	strategy_where_arr text[];
	where_condition1 text := '';
	_ia_inventory int := 0;
	_fa_inventory int := 0;
	_ia_inventory_cost int := 0;
	_fa_inventory_cost int := 0;
	_total_inventory int := 0;
	_total_inventory_cost int := 0;
begin
	if _is_dd_filters is true then
		if array_length(_pcd_ids, 1) > 0 then
			where_condition1 := format(' tam.pcd_id = any(array[%1$s]) ',array_to_string(_pcd_ids, ','));
			vl_test_query := format('select
										array_agg(distinct sm.strategy_id)
									from
										price_markdown.tb_strategy_pcd sm
									where
										pcd_id = any(array[%1$s])
										', array_to_string(_pcd_ids, ','));

			raise notice ' strategy filter query ----- %', vl_test_query;
			execute vl_test_query into filtered_strategy_ids;
		else
			where_condition1 := ' tam.pcd_id = any(array[-1]) ';
		end if;
	else
		if array_length(_strategy_id, 1) > 0 then
			filtered_strategy_ids := _strategy_id;
		else
			if array_length(_l4_ids, 1) > 0 then
				product_hierarchy_level := 4;
				product_hierarchy_values := _l3_ids;
			elsif array_length(_l3_ids, 1) > 0 then
				product_hierarchy_level := 3;
				product_hierarchy_values := _l3_ids;
			elsif array_length(_l2_ids, 1) > 0 then
				product_hierarchy_level := 2;
				product_hierarchy_values := _l2_ids;
			elsif array_length(_l1_ids, 1) > 0 then
				product_hierarchy_level := 1;
				product_hierarchy_values := _l1_ids;
			elsif array_length(_l0_ids, 1) > 0 then
				product_hierarchy_level := 0;
				product_hierarchy_values := _l0_ids;
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
                from (
                    SELECT
                        strategy_id,
                        array_agg(hierarchy_value) filter (where hierarchy_level = 0) as s0_ids,
                        array_agg(hierarchy_value) filter (where hierarchy_level = 1) as s1_ids
                    FROM
                        price_markdown.tb_strategy_hierarchy
                    WHERE is_product_hierarchy = 0
                    group by strategy_id
                ) tsh
                where
                    s0_ids && array[%1$s]::bigint[]
                    and s1_ids && array[%2$s]::bigint[]
            )',
            array_to_string(_s0_ids,','),
            array_to_string(_s1_ids,',')
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

			vl_test_query := format('select
										array_agg(sm.strategy_id)
									from
										price_markdown.tb_strategy_master sm
									where
										sm.status = 2
										and sm.start_date <= ''%2$s''::date
										and sm.end_date >= ''%1$s''::date
										%3$s', _start_date, _end_date, array_to_string(strategy_where_arr, ' ')
									);
			raise notice ' strategy filter query ----- %', vl_test_query;
			execute vl_test_query into filtered_strategy_ids;
		end if;
		where_condition1 := format(' tam.strategy_id = any(array[%1$s]) ', array_to_string(filtered_strategy_ids, ','));
	end if;

	if ((array_length(filtered_strategy_ids, 1) > 0) or (_is_dd_filters is true)) then
		-- Fetch ia_inventory, fa_inventory, ia_inventory_cost, fa_inventory_cost, total_inventory, total_inventory_cost from the given strategies or pcd's.
		raise notice ' filtered_strategy_ids  ----- %', filtered_strategy_ids;
		raise notice ' pcd_ids  ----- %', _pcd_ids;
		select
			ia_inventory, fa_inventory, ia_inventory_cost, fa_inventory_cost, total_inventory, total_inventory_cost
			into _ia_inventory, _fa_inventory, _ia_inventory_cost, _fa_inventory_cost, _total_inventory, _total_inventory_cost
		from
			price_markdown.fn_fetch_inventory_and_inventory_cost_and_total(filtered_strategy_ids, _pcd_ids);


		final_query = format('
			with agg_initially_approved_metrics_cte as(
				select
					sum(tam.fin_units) as ia_units_sold,
					sum(tam.fin_revenue) as ia_revenue,
					sum(tam.fin_margin) as ia_margin,
					coalesce(sum(tam.fin_sellthrough * tam.fin_units)/nullif(sum(tam.fin_units), 0), 0) as ia_sell_through,
					sum(tam.fin_markdown_spend) as ia_markdown_spend,
					coalesce(sum(tam.fin_revenue)/nullif(sum(tam.fin_units), 0), 0) as ia_aur,
					coalesce(sum(tam.fin_margin)/nullif(sum(tam.fin_units), 0), 0) as ia_aum,
					(%3$s) as ia_inventory,
					(%4$s) as ia_inventory_cost
				from
					price_markdown.tb_approval_metrics tam
				where
					%1$s
					and tam.status = ''Initially Approved''
			),
			agg_finally_approved_metrics_cte as(
				select
					sum(tam.fin_units) as fa_units_sold,
					sum(tam.fin_revenue) as fa_revenue,
					sum(tam.fin_margin) as fa_margin,
					coalesce(sum(tam.fin_sellthrough * tam.fin_units)/nullif(sum(tam.fin_units), 0), 0) as fa_sell_through,
					sum(tam.fin_markdown_spend) as fa_markdown_spend,
					coalesce(sum(tam.fin_revenue)/nullif(sum(tam.fin_units), 0), 0) as fa_aur,
					coalesce(sum(tam.fin_margin)/nullif(sum(tam.fin_units), 0), 0) as fa_aum,
					(%5$s) as fa_inventory,
					(%6$s) as fa_inventory_cost
				from
					price_markdown.tb_approval_metrics tam
				where
					%2$s
					and tam.status = ''Finally Approved''
			)
			select
				json_build_object(
					''units_sold'', json_build_object(''initially_approved'', json_build_object(''label'', ''Initially Approved'', ''value'', ia_units_sold),
													''finally_approved'', json_build_object(''label'', ''Finally Approved'', ''value'', fa_units_sold),
													''total'', json_build_object(''label'', ''Total'', ''value'', (coalesce( ia_units_sold, 0) + coalesce( fa_units_sold, 0)))
								  ),
				    ''revenue'',    json_build_object(''initially_approved'', json_build_object(''label'', ''Initially Approved'', ''value'', ia_revenue),
													''finally_approved'', json_build_object(''label'', ''Finally Approved'', ''value'', fa_revenue),
													''total'', json_build_object(''label'', ''Total'', ''value'', (coalesce( ia_revenue, 0) + coalesce( fa_revenue, 0)))
								  ),
					''margin'',     json_build_object(''initially_approved'', json_build_object(''label'', ''Initially Approved'', ''value'', ia_margin),
													''finally_approved'', json_build_object(''label'', ''Finally Approved'', ''value'', fa_margin),
													''total'', json_build_object(''label'', ''Total'', ''value'', (coalesce( ia_margin, 0) + coalesce( fa_margin, 0)))
								  ),
					''sell_through'', json_build_object(''initially_approved'', json_build_object(''label'', ''Initially Approved'', ''value'', ia_sell_through),
													''finally_approved'', json_build_object(''label'', ''Finally Approved'', ''value'', fa_sell_through),
													''total'', json_build_object(''label'', ''Total'', ''value'', (coalesce( ia_sell_through, 0) + coalesce( fa_sell_through, 0)))
								  ),
					''markdown'', json_build_object(''initially_approved'', json_build_object(''label'', ''Initially Approved'', ''value'', ia_markdown_spend),
													''finally_approved'', json_build_object(''label'', ''Finally Approved'', ''value'',fa_markdown_spend),
													''total'', json_build_object(''label'', ''Total'', ''value'', (coalesce( ia_markdown_spend, 0) + coalesce( fa_markdown_spend, 0)))
								  ),
					''aur'', json_build_object(''initially_approved'', json_build_object(''label'', ''Initially Approved'', ''value'', ia_aur),
													''finally_approved'', json_build_object(''label'', ''Finally Approved'', ''value'',fa_aur),
													''total'', json_build_object(''label'', ''Total'', ''value'', (coalesce((ia_revenue + fa_revenue)/ nullif((ia_units_sold + fa_units_sold), 0), 0)))
								  ),
					''aum'', json_build_object(''initially_approved'', json_build_object(''label'', ''Initially Approved'', ''value'', ia_aum),
													''finally_approved'', json_build_object(''label'', ''Finally Approved'', ''value'',fa_aum),
													''total'', json_build_object(''label'', ''Total'', ''value'', (coalesce((ia_margin + fa_margin)/ nullif((ia_units_sold + fa_units_sold), 0), 0)))
								  ),
					''inventory'', json_build_object(''initially_approved'', json_build_object(''label'', ''Initially Approved'', ''value'', ia_inventory),
													''finally_approved'', json_build_object(''label'', ''Finally Approved'', ''value'',fa_inventory),
													''total'', json_build_object(''label'', ''Total'', ''value'', (coalesce( %7$s, 0)))
								  ),
					''inventory_cost'', json_build_object(''initially_approved'', json_build_object(''label'', ''Initially Approved'', ''value'', ia_inventory_cost),
													''finally_approved'', json_build_object(''label'', ''Finally Approved'', ''value'',fa_inventory_cost),
													''total'', json_build_object(''label'', ''Total'', ''value'', (coalesce( %8$s, 0)))
								  )
				)
			from
				agg_initially_approved_metrics_cte,
				agg_finally_approved_metrics_cte
		', where_condition1, where_condition1, _ia_inventory, _ia_inventory_cost, _fa_inventory, _fa_inventory_cost, _total_inventory, _total_inventory_cost);
		raise notice ' final_query  ----- %', final_query;
		execute final_query into final_response;
	end if;
	return final_response;
END;
$function$
;
