--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:generate_promo_scenario_report_stack runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: stacking changes for generate_promo_scenario_report_stack

DROP PROCEDURE if exists price_promo_opt.generate_promo_scenario_report_stack;
CREATE OR REPLACE PROCEDURE price_promo_opt.generate_promo_scenario_report_stack(IN base_table_name character varying, IN join_table_name character varying, IN var_is_intercept boolean DEFAULT false, IN pccd_table character varying DEFAULT NULL::character varying, IN final_stack_table_name character varying DEFAULT NULL::character varying)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$

DECLARE

    query varchar;

BEGIN

    -- Construct the query dynamically using the input table names

    query := format('

		DROP TABLE IF EXISTS %s_final;

		create UNLOGGED Table %s_final as


WITH base AS (
    SELECT
        a.promo_id,
        a.scenario_id,
        a.product_id,
        a.l0_cid, a.l1_cid, a.l2_cid, a.l3_cid,
        a.s0_id, a.s3_id, a.store_hierarchy,
        a.customer_id, a.c0_id,
        a.recommendation_date,
        a.phase,
        a.week_start_date,
        a.offer_type_id,
        a.offer_type,
        a.c0_id AS customer_type,
        a.calculated_discount,
        a.cost,
        a.cost AS original_cost,
        a.current_price,
        a.baseline_sales_units,
        coalesce(b.final_discount, a.effective_discount) as effective_discount,
		a.elasticity,
        a.rebate,
        a.shipping_cost,
		a.offer_type_combined_display_name,
        -- Check here
        CASE WHEN b.final_discount is null THEN a.sales_units 
        ELSE
        (baseline_sales_units + (baseline_sales_units*0.01*coalesce(b.final_discount, a.effective_discount)*elasticity))
        END AS sales_units,

        -- Discounted price calculation
        current_price * (1 - (0.01*coalesce(b.final_discount, a.effective_discount))) AS discounted_price
    FROM %s a
    LEFT JOIN %s b 
        ON a.product_id = b.product_id
        AND a.store_hierarchy = b.store_hierarchy
        AND a.customer_id = b.customer_id
        AND a.recommendation_date = b.date
        AND a.scenario_id = b.scenario_id
%s
)
SELECT 

	promo_id, scenario_id,
	product_id, 
	l0_cid, l1_cid, l2_cid, l3_cid, 
	s0_id, s3_id, concat(s0_id, ''_'', s3_id) as store_hierarchy,
	customer_id, c0_id,
	recommendation_date as date, recommendation_date, phase, week_start_date, 
	offer_type_id, offer_type, c0_id as customer_type,
	calculated_discount, 
	effective_discount, cost, cost as original_cost, current_price, discounted_price, 
	sales_units, baseline_sales_units, rebate, shipping_cost, offer_type_combined_display_name

FROM base;

    ', final_stack_table_name, final_stack_table_name, base_table_name,
 join_table_name, 

CASE WHEN pccd_table IS NOT NULL 
THEN format('INNER JOIN (select product_id, store_hierarchy::VARCHAR AS store_hierarchy, 
customer_id::INTEGER AS customer_id, recommendation_date from %s) pccd
 ON a.product_id = pccd.product_id
        AND a.store_hierarchy = pccd.store_hierarchy
        AND a.customer_id = pccd.customer_id
        AND a.recommendation_date = pccd.recommendation_date', pccd_table) ELSE '' END);



    -- Raise a notice for debugging (optional)
    RAISE NOTICE 'Executing query: %', query;
    EXECUTE query;

	EXECUTE format(
    'CREATE INDEX idx_%s ON %s_final USING btree(date)',
    split_part(final_stack_table_name, '.', 2),
    final_stack_table_name
);




END;

$procedure$
;

