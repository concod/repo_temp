--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:pc_simulation_create_discount_filter_finalized_stack runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_simulation_create_discount_filter_finalized_stack

DROP PROCEDURE IF EXISTS price_promo_opt.pc_simulation_create_discount_filter_finalized_stack ;
CREATE OR REPLACE PROCEDURE price_promo_opt.pc_simulation_create_discount_filter_finalized_stack(IN var_promo_id integer, IN arr_scenario_id integer[], IN pccd_table character varying DEFAULT NULL::character varying)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
DECLARE

query varchar;
table_name varchar := format('price_promo_opt_temp.simulation_stacked_discounts_table_%s_%s',var_promo_id, array_to_string(arr_scenario_id, '_'));
discount_table_name varchar := format('price_promo_opt_temp.promo_scenario_discount_filter_%s_%s',var_promo_id, array_to_string(arr_scenario_id, '_'));
var_start_date date;
var_end_date date;

promo_id_list_stack varchar;




BEGIN
raise notice '%',table_name;

SELECT COALESCE(
  '(' || string_agg(promo_id_return::text, ',') || ')',
  '(-1)'
) into promo_id_list_stack
FROM price_promo_opt.fn_get_promos_finalized_stack(var_promo_id);



select start_date, end_date into var_start_date, var_end_date from price_promo.promo_master where promo_id = var_promo_id;
IF pccd_table IS NOT NULL THEN
    EXECUTE format('SELECT min(recommendation_date) start_date, max(recommendation_date) end_date FROM %s', pccd_table)
    INTO var_start_date, var_end_date;
END IF;

-- Construct the query
query := format('
		DROP TABLE IF EXISTS %s;
		CREATE UNLOGGED TABLE %s AS
		with 
cte_3 as    (
		SELECT
		 promo_id AS review_promo_id,
		 scenario_id as review_scenario_id,
		 product_id, store_hierarchy, customer_id,
		 date as recommendation_date,
		 effective_discount as effective_discount_review,
		 priority_number as priority_y_1
		FROM
		%s prf

		left join price_promo.ps_rules using(promo_id)
		%s

		WHERE
		scenario_id = ANY(%L)
)
,

finalized_cte  as   materialized 
        (
        select sub1.*,
        row_number() over(partition by product_id, store_hierarchy, customer_id, recommendation_date, priority_number order by effective_discount desc) as row_num ,
        priority_number 
        from 
            (
            select promo_id, product_id,store_hierarchy,ps_recommended_finalized.customer_id,
            recommendation_date, effective_discount, sales_units
            FROM price_promo.ps_recommended_finalized 
            where promo_id in %s AND recommendation_date between %L and %L 
            and product_id in (select distinct product_id from cte_3)
            ) sub1
		LEFT JOIN price_promo.ps_rules pr
		using(promo_id)
		)
		,
		cte_2 AS
		(
		SELECT * 
		FROM 
            (
            SELECT promo_id as fin_1_promo_id, product_id, store_hierarchy,
			finalized_cte.customer_id, recommendation_date, 
            priority_number as priority_x_1, row_num , 
			effective_discount AS ft1_effective_discount, 
			sales_units as sales_units_fin_1
		    FROM 
            finalized_cte where row_num = 1 and priority_number = 1
            ) ft1

		LEFT JOIN  
            (
            SELECT promo_id fin_2_promo_id, product_id,store_hierarchy,finalized_cte.customer_id,recommendation_date,
            priority_number as priority_x_2, row_num , 
			effective_discount AS ft2_effective_discount, 
			sales_units as sales_units_fin_2
            from finalized_cte where row_num = 1 and priority_number = 2
            ) ft2

            USING(product_id,store_hierarchy, customer_id,recommendation_date)   
        )


		SELECT
		product_id, store_hierarchy, sub1.customer_id, 
		recommendation_date as date, review_scenario_id as scenario_id
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


		END::numeric AS stacked_baseline_sales_units



		FROM
		(SELECT
		 review_scenario_id, priority_x_2,priority_y_1,priority_x_1, review_promo_id,fin_2_promo_id,
		fin_1_promo_id,product_id,store_hierarchy,st.customer_id,recommendation_date,sales_units_fin_1,sales_units_fin_2,
		COALESCE(ft1_effective_discount, 0) AS effective_discount_fin_1,
		COALESCE(ft2_effective_discount, 0) AS effective_discount_fin_2,
		COALESCE(effective_discount_review, 0) AS effective_discount_review,
		COALESCE(fin_1_fin_2::integer,0) fin_1_fin_2,
		COALESCE(fin_1_review::integer,0) fin_1_review,
		COALESCE(fin_2_review::integer,0) fin_2_review
		FROM
		cte_3 st

		LEFT JOIN cte_2
		USING(product_id, store_hierarchy, customer_id, recommendation_date)

		LEFT JOIN (SELECT priority_x priority_x_1, priority_y priority_x_2 , is_stackable AS fin_1_fin_2
		FROM price_promo.tb_stacking_priority_rules) tspr1 USING (priority_x_1, priority_x_2)

		LEFT JOIN (SELECT priority_x priority_x_1, priority_y priority_y_1 , is_stackable AS fin_1_review
		FROM price_promo.tb_stacking_priority_rules) tspr2 USING (priority_x_1, priority_y_1)

		LEFT JOIN (SELECT priority_x priority_x_2, priority_y priority_y_1 , is_stackable AS fin_2_review
		FROM price_promo.tb_stacking_priority_rules) tspr3 USING (priority_x_2, priority_y_1)
		where ft1_effective_discount is not null or ft2_effective_discount is not null
		) sub1 --WHERE effective_discount_fin_1 IS NOT null

',table_name, table_name, 

 discount_table_name,

CASE WHEN pccd_table IS NOT NULL 
THEN format('INNER JOIN (select product_id, store_hierarchy::VARCHAR AS store_hierarchy, 
customer_id::INTEGER AS customer_id, recommendation_date date from %s) pccd
USING(product_id, store_hierarchy,customer_id,date)', pccd_table) ELSE '' END,
arr_scenario_id, promo_id_list_stack, var_start_date, var_end_date);

-- Print the query
RAISE NOTICE '%', query;

-- Execute the query
EXECUTE query ;
raise notice '%', table_name;
END;
$procedure$
;
