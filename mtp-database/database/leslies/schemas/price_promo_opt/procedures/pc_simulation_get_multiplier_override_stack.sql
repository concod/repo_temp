--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:pc_simulation_get_multiplier_override_stack runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_simulation_get_multiplier_override_stack

DROP PROCEDURE IF EXISTS price_promo_opt.pc_simulation_get_multiplier_override_stack ;
CREATE OR REPLACE PROCEDURE price_promo_opt.pc_simulation_get_multiplier_override_stack(IN var_promo_id integer, IN arr_scenario_id integer[])
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$

DECLARE



    query varchar;

    table_name varchar := format('price_promo_opt_temp.simulation_stacked_multiplier_table_%s_%s',var_promo_id, array_to_string(arr_scenario_id, '_'));

	var_start_date date;

	var_end_date date;





BEGIN

		raise notice '%',table_name;



		select start_date, end_date into var_start_date, var_end_date from price_promo.promo_master where promo_id = var_promo_id;



    -- Construct the query

    query := format('

        DROP TABLE IF EXISTS %s;

        CREATE UNLOGGED TABLE %s AS



		with finalized_cte as materialized (select sub1.*,row_number() over(partition by product_id,s0_id, s1_id,recommendation_date ORDER by updated_at) as row_num

		from (select promo_id, product_id,s0_id, s1_id,recommendation_date,

		effective_discount, sales_units, updated_at, baseline_sales_units

					from price_promo.ps_recommended_finalized where promo_id in

							(select promo_id_return

								FROM price_promo_opt.fn_get_promos_finalized_stack(%s)

								)) sub1

		where recommendation_date between %L and %L

		),

		finalized_override_cte as materialized

		(SELECT sub1.*,row_number() over(partition by product_id,s0_id, s1_id,recommendation_date ORDER by updated_at) as row_num

		FROM (

		    SELECT promo_ids, product_id, s0_id, s1_id, recommendation_date, effective_discount,

				sales_units, baseline_sales_units,updated_at



		    FROM price_promo.ps_recommended_finalized_stack_override

		    WHERE promo_ids && ARRAY(

		        SELECT promo_id_return

		        FROM price_promo_opt.fn_get_promos_finalized_stack(%s)

		    )

		) sub1

		WHERE recommendation_date BETWEEN %L AND %L

		)

		select product_id,s0_id, s1_id,recommendation_date, coalesce(fn2.sales_units/nullif(fn1.sales_units,0),0) AS sales_units_multiplier

		, coalesce(fn2.baseline_sales_units/nullif(fn1.baseline_sales_units,0),0) AS baseline_sales_units_multiplier

		from

		(SELECT

		DISTINCT product_id,

		s0_id,

		s1_id,

		recommendation_date

		FROM

		price_promo.ps_recommended_scenarios prf

		WHERE

		scenario_id = ANY(''%s'')) fn

		LEFT JOIN

		(SELECT * FROM finalized_cte WHERE row_num = 1) fn1

		using(product_id,s0_id, s1_id,recommendation_date)

		LEFT JOIN (select * from finalized_override_cte WHERE row_num = 1) fn2

		using(product_id,s0_id, s1_id,recommendation_date)





    ',table_name, table_name,var_promo_id, var_start_date, var_end_date,var_promo_id, var_start_date, var_end_date, arr_scenario_id::varchar);



    -- Print the query

    RAISE NOTICE '%', query;



    -- Execute the query

    EXECUTE query ;

	raise notice '%', table_name;

END;

$procedure$
;
