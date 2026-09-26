--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:pc_opt_create_discount_filter_finalized_stack runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: stacking changes for pc_opt_create_discount_filter_finalized_stack

DROP PROCEDURE if exists price_promo_opt.pc_opt_create_discount_filter_finalized_stack;
CREATE OR REPLACE PROCEDURE price_promo_opt.pc_opt_create_discount_filter_finalized_stack(IN var_promo_id integer, IN arr_scenario_id integer[])
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$

DECLARE



query varchar;

table_name varchar := format('price_promo_opt_temp.opt_stacked_discounts_table_%s_%s',var_promo_id, array_to_string(arr_scenario_id, '_'));

var_start_date date;

var_end_date date;

discount_table_name varchar := format('price_promo_opt_temp.opt_simulation_create_discount_filter_stack_%s_%s',var_promo_id, array_to_string(arr_scenario_id, '_'));


BEGIN

raise notice '%',table_name;



select start_date, end_date into var_start_date, var_end_date from price_promo.promo_master where promo_id = var_promo_id;



-- Construct the query

query := format('

		DROP TABLE IF EXISTS %s;

		CREATE UNLOGGED TABLE %s AS

		with finalized_cte  as  materialized



		(select sub1.*,row_number() over(partition by product_id,store_reco_level,recommendation_date order by priority_number) as row_num ,priority_number from (select promo_id, product_id,store_reco_level,recommendation_date,

		effective_discount, sales_units

		from price_promo.ps_recommended_finalized where promo_id in

		(select promo_id_return

		FROM price_promo_opt.fn_get_promos_finalized_stack(%s)

		)) sub1

		LEFT JOIN price_promo.ps_rules pr

		using(promo_id)

		where recommendation_date between %L and %L

		)

		,

		cte_2 AS materialized

		(SELECT * FROM (select promo_id as fin_1_promo_id, product_id,store_reco_level,recommendation_date, priority_number as priority_x_1

		, row_num , effective_discount AS ft1_effective_discount, sales_units as  sales_units_fin_1

		from finalized_cte where row_num = 1) ft1



		LEFT JOIN  (select promo_id fin_2_promo_id, product_id,store_reco_level,recommendation_date,

		priority_number as priority_x_2, row_num , effective_discount AS ft2_effective_discount, sales_units  as sales_units_fin_2

		from finalized_cte where row_num = 2) ft2

		USING(product_id,

		s0_id,

		s1_id,

		recommendation_date)),

		cte_3 as  materialized

			(

		SELECT

		 product_id,promo_id AS review_promo_id,scenario_id as review_scenario_id,

		s0_id,

		s1_id,

		date as recommendation_date,

		effective_discount effective_discount_review,

		priority_number as priority_y_1

		FROM

		%s prf

		left join price_promo.ps_rules using(promo_id)

		)





		SELECT

		product_id,store_reco_level, recommendation_date as date, review_scenario_id as scenario_id

		,

		CASE

		WHEN fin_1_fin_2 = 1 AND fin_1_review = 1 AND fin_2_review = 1 THEN

		(1 - (1 - effective_discount_fin_1 * 0.01)

		* (1 - effective_discount_fin_2 * 0.01)

		* (1 - effective_discount_review * 0.01)) * 100





		WHEN fin_1_fin_2 = 1  AND fin_2_review = 1 AND fin_1_review = 0 THEN

		GREATEST(

		(1 - (1 - effective_discount_fin_1 * 0.01)

		* (1 - effective_discount_fin_2 * 0.01)) * 100,



		(1 - (1 - effective_discount_review * 0.01)

		* (1 - effective_discount_fin_2 * 0.01)) * 100,



		GREATEST(effective_discount_fin_1, effective_discount_review))



		WHEN fin_1_fin_2 = 1 AND fin_1_review = 1 AND fin_2_review = 0 THEN

		GREATEST(

		(1 - (1 - effective_discount_fin_1 * 0.01)

		* (1 - effective_discount_fin_2 * 0.01)) * 100,



		(1 - (1 - effective_discount_fin_1 * 0.01)

		* (1 - effective_discount_review * 0.01)) * 100,



		GREATEST(effective_discount_fin_2, effective_discount_review))





		WHEN fin_1_fin_2 = 0 AND fin_1_review = 1 AND fin_2_review = 1 THEN

		GREATEST(

		GREATEST(effective_discount_fin_1, effective_discount_fin_2),

		(1 - (1 - effective_discount_fin_1 * 0.01)

		* (1 - effective_discount_review * 0.01)) * 100,



		(1 - (1 - effective_discount_fin_2 * 0.01)

		* (1 - effective_discount_review * 0.01)) * 100



		)







		WHEN fin_1_fin_2 = 0 AND fin_1_review = 0 AND fin_2_review = 1 THEN

		GREATEST(

		GREATEST(effective_discount_fin_1, effective_discount_fin_2),

		GREATEST(effective_discount_fin_1, effective_discount_review),

		(1 - (1 - effective_discount_fin_2 * 0.01)

		* (1 - effective_discount_review * 0.01)) * 100



		)





		WHEN fin_1_fin_2 = 0  AND fin_2_review = 0 AND fin_1_review = 1 THEN

		GREATEST(

		GREATEST(effective_discount_fin_1, effective_discount_fin_2),

		GREATEST(effective_discount_fin_2, effective_discount_review),

		(1 - (1 - effective_discount_fin_1 * 0.01)

		* (1 - effective_discount_review * 0.01)) * 100



		)





		WHEN fin_1_fin_2 = 1 AND fin_1_review = 0 AND fin_2_review = 0 THEN

		GREATEST(

		GREATEST(effective_discount_fin_1, effective_discount_review),

		(1 - (1 - effective_discount_fin_1 * 0.01)

		* (1 - effective_discount_fin_2 * 0.01)) * 100,



		GREATEST(effective_discount_fin_2, effective_discount_review))



		WHEN fin_1_fin_2 = 0 AND fin_1_review = 0 AND fin_2_review = 0 THEN

		GREATEST(effective_discount_fin_1, effective_discount_fin_2, effective_discount_review)

		END AS final_discount

		,

		CASE

		WHEN priority_y_1 = 7 THEN NULL



		WHEN (fin_1_review = 1 AND fin_2_review = 1) AND (priority_x_1 = 7 AND priority_x_2 = 7)  THEN

		CASE WHEN effective_discount_fin_1>effective_discount_fin_2 THEN sales_units_fin_1 ELSE sales_units_fin_2 END



		WHEN (fin_1_fin_2 = 1 AND fin_1_review = 1 AND fin_2_review = 1) AND (priority_x_1 = 7 OR priority_x_2 = 7)  THEN

		CASE WHEN priority_x_1 = 7 THEN sales_units_fin_1 ELSE sales_units_fin_2 END



		WHEN (fin_1_fin_2 = 1  AND fin_2_review = 1 AND fin_1_review = 0 ) AND (priority_x_2 = 7)  THEN

		sales_units_fin_2



		WHEN ( fin_1_fin_2 = 1 AND fin_1_review = 1 AND fin_2_review = 0) AND (priority_x_1 = 7) THEN

		sales_units_fin_1



		WHEN ( fin_1_fin_2 = 0 AND fin_1_review = 1 AND fin_2_review = 1 ) AND (priority_x_1 = 7 OR priority_x_2 = 7)  THEN

		CASE WHEN priority_x_1 = 7 THEN sales_units_fin_1 ELSE sales_units_fin_2 END



		WHEN (fin_1_fin_2 = 0 AND fin_1_review = 0 AND fin_2_review = 1) AND (priority_x_2 = 7) THEN

		sales_units_fin_2



		WHEN (fin_1_fin_2 = 0  AND fin_2_review = 0 AND fin_1_review = 1)AND (priority_x_1 = 7 )   THEN

		sales_units_fin_1



		WHEN (fin_1_fin_2 = 1 AND fin_1_review = 0 AND fin_2_review = 0)   THEN

		NULL



		WHEN (fin_1_fin_2 = 1 AND fin_1_review = 0 AND fin_2_review = 0)   THEN

		NULL





		END::numeric AS stacked_baseline_sales_units







		FROM

		(SELECT

		 review_scenario_id, priority_x_2,priority_y_1,priority_x_1, review_promo_id,fin_2_promo_id,

		fin_1_promo_id,product_id,store_reco_level,recommendation_date,sales_units_fin_1,sales_units_fin_2,

		COALESCE(ft1_effective_discount, 0) AS effective_discount_fin_1,

		COALESCE(ft2_effective_discount, 0) AS effective_discount_fin_2,

		COALESCE(effective_discount_review, 0) AS effective_discount_review,

		COALESCE(fin_1_fin_2::integer,0) fin_1_fin_2,

		COALESCE(fin_1_review::integer,0) fin_1_review,

		COALESCE(fin_2_review::integer,0) fin_2_review

		FROM

		cte_3 st



		LEFT JOIN cte_2

		USING(product_id,

		s0_id,

		s1_id,

		recommendation_date)



		LEFT JOIN (SELECT priority_x priority_x_1, priority_y priority_x_2 , is_stackable AS fin_1_fin_2

		FROM price_promo.tb_stacking_priority_rules) tspr1 USING (priority_x_1, priority_x_2)



		LEFT JOIN (SELECT priority_x priority_x_1, priority_y priority_y_1 , is_stackable AS fin_1_review

		FROM price_promo.tb_stacking_priority_rules) tspr2 USING (priority_x_1, priority_y_1)



		LEFT JOIN (SELECT priority_x priority_x_2, priority_y priority_y_1 , is_stackable AS fin_2_review

		FROM price_promo.tb_stacking_priority_rules) tspr3 USING (priority_x_2, priority_y_1)
		where ft1_effective_discount is not null or ft2_effective_discount is not null

		) sub1 WHERE effective_discount_fin_1 IS NOT null



',table_name, table_name,var_promo_id, var_start_date, var_end_date,discount_table_name);



-- Print the query

RAISE NOTICE '%', query;



-- Execute the query

EXECUTE query ;

raise notice '%', table_name;

END;

$procedure$
;
