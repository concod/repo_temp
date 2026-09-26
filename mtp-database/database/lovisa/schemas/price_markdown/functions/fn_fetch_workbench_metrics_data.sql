--liquibase formatted sql
--changeset sidharth.harish@impactanalytics.co:fn_fetch_workbench_metrics_data-8 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: fn_fetch_workbench_metrics_data-8
--rollback: SELECT 1

DROP FUNCTION if exists price_markdown.fn_fetch_workbench_metrics_data;

CREATE OR REPLACE FUNCTION price_markdown.fn_fetch_workbench_metrics_data(_strategy_ids integer[], _currency_ids integer[], _start_date date, _end_date date, _timezone text, p_hierarchy_filters jsonb DEFAULT NULL::jsonb, _user_id integer DEFAULT NULL::integer, _status integer[] DEFAULT NULL::integer[])
 RETURNS TABLE(sales_units integer, revenue double precision, margin double precision, markdown_dollar double precision, gm_percent double precision, rem_inv double precision, aum_dollar double precision, aur_dollar double precision, sell_through double precision)
 LANGUAGE plpgsql
AS $function$
declare
    query_ text :=  '';
	filtered_strategy_ids integer[];
	product_hierarchy_level integer;
	product_hierarchy_values integer[];
 hierarchy_where_conditions text[] := '{}';
	strategy_where_arr text[];
    currency_multiplier real;

begin
	raise notice ' begining ';
	if array_length(_strategy_ids, 1) > 0 then
		filtered_strategy_ids := _strategy_ids;
		raise notice ' st ids from ip  ----- %', array_to_string(_strategy_ids, ',');
	else
		SELECT strategy_where_conditions
		INTO hierarchy_where_conditions
		FROM price_markdown.fn_build_hierarchy_filters(p_hierarchy_filters);

		-- Add hierarchy conditions to strategy_where_arr if any exist
		IF array_length(hierarchy_where_conditions, 1) > 0 THEN
			strategy_where_arr := strategy_where_arr || hierarchy_where_conditions;
		END IF;


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

	select 
		* into currency_multiplier
	from
		price_markdown.fn_v3_fetch_currency_forex_multiplier(_currency_ids);

	IF currency_multiplier IS NULL THEN
	    currency_multiplier := 1.0;
	END IF;

	raise notice ' currency forex multiplier ----- %', currency_multiplier;
	if array_length(filtered_strategy_ids, 1) > 0 then
		query_ := format('
			        SELECT
			            ROUND(SUM(sales_units)::numeric, 0)::integer AS sales_units,
			            ROUND(SUM(revenue)::numeric, 2)::double precision * %2$s AS revenue,
			            ROUND(SUM(margin)::numeric, 2)::double precision * %2$s AS margin,
			            ROUND(SUM(spend)::numeric, 2)::double precision * %2$s AS markdown_dollar,
			            ROUND((100 * SUM(margin) / NULLIF(SUM(revenue), 0))::numeric, 2)::double precision AS gm_percent,
			            SUM(rem_inv)::double precision as rem_inv,
                        ROUND((sum(margin)/NULLIF(sum(sales_units),0))::numeric,2)::double precision * %2$s as aum_dollar,
                        ROUND((sum(revenue)/NULLIF(sum(sales_units),0))::numeric,2)::double precision * %2$s as aur_dollar,
			            ROUND((100*sum(sales_units)  / nullif((sum(sales_units) + SUM(rem_inv)),0))::numeric,2)::double precision as sell_through
			        from
			            (SELECT
			                a.strategy_id,
			                SUM(sales_units)::numeric AS sales_units,
			                SUM(revenue)::numeric AS revenue,
			                SUM(margin)::numeric AS margin,
			                SUM(spend)::numeric AS spend,
			                SUM(case when recommendation_date = b.end_date then rem_inv else 0 END) as rem_inv
			            FROM
                            price_markdown.tb_agg_fin a
			            JOIN
			                (select strategy_id, start_date, end_date from price_markdown.tb_strategy_master where strategy_id in (%1$s)) b
						USING(strategy_id)
                        where strategy_id = any(array[%1$s])
		                group by a.strategy_id
			            ) dd;
			', array_to_string(filtered_strategy_ids, ','), currency_multiplier);
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
