--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:pc_simulation_create_discount_filter_finalized_stack_date runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: stacking changes for pc_simulation_create_discount_filter_finalized_stack_date

DROP PROCEDURE if exists price_promo_opt.pc_simulation_create_discount_filter_finalized_stack_date;
CREATE OR REPLACE PROCEDURE price_promo_opt.pc_simulation_create_discount_filter_finalized_stack_date(IN var_promo_id integer, IN arr_scenario_id integer[], IN var_filter_date date, IN var_pccd_table character varying DEFAULT NULL::character varying)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$

DECLARE

query varchar;

-- Per-date output table: simulation_stacked_discounts_table_{promo}_{scenario}_{YYYYMMDD}
table_name varchar := format('price_promo_opt_temp.simulation_stacked_discounts_table_%s_%s_%s',
    var_promo_id, array_to_string(arr_scenario_id, '_'), to_char(var_filter_date, 'YYYYMMDD'));

-- Base discount filter table (created by Step 1, contains all dates)
discount_table_name varchar := format('price_promo_opt_temp.scenario_disc_filter_date_stack_%s_%s',
    var_promo_id, array_to_string(arr_scenario_id, '_'));

var_start_date date;

var_end_date date;

promo_id_list_stack varchar;


BEGIN

-- Purpose: PER-DATE version - Creates stacked discount table for a SINGLE date.
-- Called from Python in parallel for each date to speed up stacked flow.
-- Example: CALL price_promo_opt.pc_simulation_create_discount_filter_finalized_stack_date(540, ARRAY[1129], '2026-03-08');

raise notice 'Creating per-date stacked discounts for date: % into table: %', var_filter_date, table_name;

SELECT COALESCE(
  '(' || string_agg(promo_id_return::text, ',') || ')',
  '(-1)'
) into promo_id_list_stack
FROM price_promo_opt.fn_get_promos_finalized_stack(var_promo_id);

select start_date, end_date into var_start_date, var_end_date from price_promo.promo_master where promo_id = var_promo_id;

-- Construct the query - same logic as original but filtered to single date
query := format('

		DROP TABLE IF EXISTS %s;

		CREATE UNLOGGED TABLE %s AS

		with 
		cte_3 as  materialized  (

		SELECT

		 product_id,promo_id AS review_promo_id,scenario_id as review_scenario_id,

store_reco_level, customer_reco_level,

		effective_discount effective_discount_review,

		priority_number as priority_y_1

		FROM

		%s prf



		left join price_promo.ps_rules using(promo_id)

		%s 

),
		finalized_cte  as   materialized



		(select sub1.*,row_number() over(partition by product_id,store_reco_level, customer_reco_level,recommendation_date order by effective_discount desc) as row_num ,priority_number 
		from (select promo_id, product_id,store_reco_level, customer_reco_level,recommendation_date,

		effective_discount, sales_units

		from price_promo.ps_recommended_finalized where promo_id in

		%s 
		AND recommendation_date = %L 
		and product_id in (select distinct product_id from cte_3)
		)sub1

		LEFT JOIN price_promo.ps_rules pr

		using(promo_id)


		)

		,

		cte_2 AS  materialized

		(SELECT * FROM (select promo_id as fin_1_promo_id, product_id,store_reco_level, customer_reco_level,recommendation_date, priority_number as priority_x_1

		, row_num , effective_discount AS ft1_effective_discount, sales_units as  sales_units_fin_1

		from finalized_cte where row_num = 1) ft1



		LEFT JOIN  (select promo_id fin_2_promo_id, product_id,store_reco_level, customer_reco_level,recommendation_date,

		priority_number as priority_x_2, row_num , effective_discount AS ft2_effective_discount, sales_units  as sales_units_fin_2

		from finalized_cte where row_num = 2) ft2

		USING(product_id,

store_reco_level, customer_reco_level,

		recommendation_date))

		




		SELECT

		product_id,store_reco_level, customer_reco_level, recommendation_date as date, review_scenario_id as scenario_id

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

		WHEN priority_y_1 = 1 THEN NULL



		WHEN (fin_1_review = 1 AND fin_2_review = 1) AND (priority_x_1 = 1 AND priority_x_2 = 1)  THEN

		CASE WHEN effective_discount_fin_1>effective_discount_fin_2 THEN sales_units_fin_1 ELSE sales_units_fin_2 END



		WHEN (fin_1_fin_2 = 1 AND fin_1_review = 1 AND fin_2_review = 1) AND (priority_x_1 = 1 OR priority_x_2 = 1)  THEN

		CASE WHEN priority_x_1 = 1 THEN sales_units_fin_1 ELSE sales_units_fin_2 END



		WHEN (fin_1_fin_2 = 1  AND fin_2_review = 1 AND fin_1_review = 0 ) AND (priority_x_2 = 1)  THEN

		sales_units_fin_2



		WHEN ( fin_1_fin_2 = 1 AND fin_1_review = 1 AND fin_2_review = 0) AND (priority_x_1 = 1) THEN

		sales_units_fin_1



		WHEN ( fin_1_fin_2 = 0 AND fin_1_review = 1 AND fin_2_review = 1 ) AND (priority_x_1 = 1 OR priority_x_2 = 1)  THEN

		CASE WHEN priority_x_1 = 1 THEN sales_units_fin_1 ELSE sales_units_fin_2 END



		WHEN (fin_1_fin_2 = 0 AND fin_1_review = 0 AND fin_2_review = 1) AND (priority_x_2 = 1) THEN

		sales_units_fin_2



		WHEN (fin_1_fin_2 = 0  AND fin_2_review = 0 AND fin_1_review = 1)AND (priority_x_1 = 1 )   THEN

		sales_units_fin_1



		WHEN (fin_1_fin_2 = 1 AND fin_1_review = 0 AND fin_2_review = 0)   THEN

		NULL



		WHEN (fin_1_fin_2 = 1 AND fin_1_review = 0 AND fin_2_review = 0)   THEN

		NULL





		END::numeric AS stacked_baseline_sales_units,
		max_discount_priority_1,max_discount_priority_2







		FROM

		(SELECT

		 review_scenario_id, priority_x_2,priority_y_1,priority_x_1, review_promo_id,fin_2_promo_id,

		fin_1_promo_id,product_id,store_reco_level, customer_reco_level,recommendation_date,sales_units_fin_1,sales_units_fin_2,

		COALESCE(ft1_effective_discount, 0) AS effective_discount_fin_1,

		COALESCE(ft2_effective_discount, 0) AS effective_discount_fin_2,

		COALESCE(effective_discount_review, 0) AS effective_discount_review,

		COALESCE(fin_1_fin_2::integer,0) fin_1_fin_2,

		COALESCE(fin_1_review::integer,0) fin_1_review,

		COALESCE(fin_2_review::integer,0) fin_2_review,

GREATEST(
    CASE WHEN priority_x_1 = 1 THEN ft1_effective_discount ELSE 0 END,
    CASE WHEN priority_x_2 = 1 THEN ft2_effective_discount ELSE 0 END,
    CASE WHEN priority_y_1 = 1 THEN effective_discount_review ELSE 0 END
) AS max_discount_priority_1,

GREATEST(
    CASE WHEN priority_x_1 = 2 THEN ft1_effective_discount ELSE 0 END,
    CASE WHEN priority_x_2 = 2 THEN ft2_effective_discount ELSE 0 END,
    CASE WHEN priority_y_1 = 2 THEN effective_discount_review ELSE 0 END
) AS max_discount_priority_2

		FROM

		cte_3 st



		LEFT JOIN cte_2

		USING(product_id,

store_reco_level, customer_reco_level)

%s



		LEFT JOIN (SELECT priority_x priority_x_1, priority_y priority_x_2 , is_stackable AS fin_1_fin_2

		FROM price_promo.tb_stacking_priority_rules) tspr1 USING (priority_x_1, priority_x_2)



		LEFT JOIN (SELECT priority_x priority_x_1, priority_y priority_y_1 , is_stackable AS fin_1_review

		FROM price_promo.tb_stacking_priority_rules) tspr2 USING (priority_x_1, priority_y_1)



		LEFT JOIN (SELECT priority_x priority_x_2, priority_y priority_y_1 , is_stackable AS fin_2_review

		FROM price_promo.tb_stacking_priority_rules) tspr3 USING (priority_x_2, priority_y_1)

		) sub1 WHERE effective_discount_fin_1 IS NOT null



',table_name,                    -- %1 DROP TABLE
table_name,                      -- %2 CREATE TABLE
discount_table_name,             -- %3 FROM base table
CASE WHEN var_pccd_table IS NOT NULL THEN format('INNER JOIN (select distinct product_id, store_reco_level::VARCHAR AS store_reco_level, customer_reco_level::VARCHAR AS customer_reco_level from %s) pccd USING(product_id, store_reco_level, customer_reco_level)', var_pccd_table) ELSE '' END,  -- %4 pccd join in cte_3
promo_id_list_stack,             -- %5 WHERE promo_id in (finalized_cte)
var_filter_date,                 -- %6 AND recommendation_date = (finalized_cte)
CASE WHEN var_pccd_table IS NOT NULL THEN format('INNER JOIN (select product_id, store_reco_level::VARCHAR AS store_reco_level, customer_reco_level::VARCHAR AS customer_reco_level, recommendation_date from %s) pccd USING(product_id, store_reco_level, customer_reco_level, recommendation_date)', var_pccd_table) ELSE '' END  -- %7 pccd join bottom
);

-- Print the query
RAISE NOTICE '%', query;

RAISE NOTICE 'Before enable_nestloop=%', current_setting('enable_nestloop', true);
PERFORM set_config('enable_nestloop', 'off', true);
RAISE NOTICE 'enable_nestloop=%', current_setting('enable_nestloop', true);

-- Execute the query
EXECUTE query ;

raise notice 'Per-date stacked discounts created: %', table_name;

END;

$procedure$
;
