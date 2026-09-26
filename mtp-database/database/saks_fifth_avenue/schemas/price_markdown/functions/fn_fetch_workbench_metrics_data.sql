--liquibase formatted sql
--changeset sidharth.harish@impactanalytics.co:fn_fetch_workbench_metrics_data-4 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: changed store hierarchy filter logic
--rollback: SELECT 1

DROP FUNCTION if exists price_markdown.fn_fetch_workbench_metrics_data;
CREATE OR REPLACE FUNCTION price_markdown.fn_fetch_workbench_metrics_data(_strategy_ids integer[], _l0_ids integer[], _l1_ids integer[], _l2_ids integer[], _l3_ids integer[], _l4_ids integer[], _brand integer[], _s0_ids integer[], _s1_ids integer[], _s2_ids integer[], _start_date date, _end_date date, _timezone text, _user_id integer DEFAULT NULL::integer, _status integer[] DEFAULT NULL::integer[])
 RETURNS TABLE(sales_units integer, revenue double precision, margin double precision, markdown_dollar double precision, gm_percent double precision, rem_inv double precision, aum_dollar double precision, aur_dollar double precision, sell_through double precision)
 LANGUAGE plpgsql
AS $function$
declare
    query_ text :=  '';
	filtered_strategy_ids integer[];
	product_hierarchy_level integer;
	product_hierarchy_values integer[];
	strategy_where_arr text[];

begin
	raise notice ' begining ';
	if array_length(_strategy_ids, 1) > 0 then
		filtered_strategy_ids := _strategy_ids;
		raise notice ' st ids from ip  ----- %', array_to_string(_strategy_ids, ',');
	else
		if array_length(_l4_ids, 1) > 0 then
            product_hierarchy_level := 4;
            product_hierarchy_values := _l4_ids;
        elsif array_length(_l3_ids, 1) > 0 then
            product_hierarchy_level := 3;
            product_hierarchy_values := _l3_ids;
        elsif array_length(_l2_ids, 1) > 0 then
            product_hierarchy_level := 2;
            product_hierarchy_values := _l2_ids;
        elsif array_length(_l1_ids, 1) > 0 then
            product_hierarchy_level := 1;
            product_hierarchy_values := _l1_ids;
        elsif array_length(_l0_ids,1) > 0 then
            product_hierarchy_level := 0;
            product_hierarchy_values := _l0_ids;
        end if;

		raise notice ' product_hierarchy_level  ----- %', product_hierarchy_level;
		raise notice ' product_hierarchy_values  ----- %', array_to_string(product_hierarchy_values, ',');

		if product_hierarchy_level is not null then
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

		if array_length(_brand, 1) > 0 then
				strategy_where_arr := array_append(strategy_where_arr, format('and sm.strategy_id IN (
					    SELECT
				            strategy_id
				        FROM
				            price_markdown.tb_strategy_hierarchy
				        WHERE is_product_hierarchy = 1
					    AND hierarchy_level = 0
					    AND hierarchy_value = ANY(array[%1$s])
			    	)', array_to_string(_brand, ','))) ;
		end if;

		if array_length(_status, 1) > 0 then
        	strategy_where_arr := array_append(strategy_where_arr, format(' and sm.status in (%1$s) ', array_to_string(_status, ',')));
        end if;

		query_ := format('select array_agg(sm.strategy_id) from price_markdown.tb_strategy_master sm where
					sm.start_date <= ''%2$s''::date
					and sm.end_date >= ''%1$s''::date
					%3$s', _start_date,  _end_date, array_to_string(strategy_where_arr, ' '));
		raise notice ' strategy filter query ----- %', query_;
		execute query_ into filtered_strategy_ids;
	end if;

	if array_length(filtered_strategy_ids, 1) > 0 then
		query_ := format('
			        SELECT
			            ROUND(SUM(sales_units)::numeric, 0)::integer AS sales_units,
			            ROUND(SUM(revenue)::numeric, 2)::double precision AS revenue,
			            ROUND(SUM(margin)::numeric, 2)::double precision AS margin,
			            ROUND(SUM(spend)::numeric, 2)::double precision AS markdown_dollar,
			            ROUND((100 * SUM(margin) / NULLIF(SUM(revenue), 0))::numeric, 2)::double precision AS gm_percent,
			            sum(rem_inv)::double precision as rem_inv,
                        round((sum(margin)/NULLIF(sum(sales_units),0))::numeric,2)::double precision as aum_dollar,
                        round((sum(revenue)/NULLIF(sum(sales_units),0))::numeric,2)::double precision as aur_dollar,
			            ROUND((100*sum(sales_units)  / nullif((sum(sales_units) + SUM(rem_inv)),0))::numeric,2)::double precision as sell_through
			        from
			            (SELECT
			                a.strategy_id,
			                ROUND(SUM(sales_units)::numeric, 0) AS sales_units,
			                ROUND(SUM(revenue)::numeric, 2) AS revenue,
			                ROUND(SUM(margin)::numeric, 2) AS margin,
			                ROUND(SUM(spend)::numeric, 2) AS spend,
			                SUM(case when recommendation_date = b.end_date then rem_inv else 0 END) as rem_inv
			            FROM
                            price_markdown.tb_agg_fin a
			            JOIN
			                (select strategy_id, start_date, end_date from price_markdown.tb_strategy_master where strategy_id in (%1$s)) b
						USING(strategy_id)
                        where strategy_id = any(array[%1$s])
		                group by a.strategy_id
			            ) dd;
			', array_to_string(filtered_strategy_ids, ',') );
	else
		query_ := 'select
                        null::integer, null::double precision, null::double precision, null::double precision,
                        null::double precision, null::double precision, null::double precision,
                        null:: double precision, null::double precision
                    ';
	end if;
	raise notice 'final query ----- %', query_;
	return query execute query_;

END;
$function$
;
