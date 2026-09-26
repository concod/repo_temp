--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:pre_generate_promo_scenario_report_stack runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pre_generate_promo_scenario_report_stack

DROP PROCEDURE IF EXISTS price_promo_opt.pre_generate_promo_scenario_report_stack ;
CREATE OR REPLACE PROCEDURE price_promo_opt.pre_generate_promo_scenario_report_stack(IN base_table_name character varying, IN join_table_name character varying, IN var_is_intercept boolean DEFAULT false)
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
		a.offer_identifier,
		a.discount_filter,
		a.discount_level_value, 
        a.c0_id AS customer_type,
        a.calculated_discount,
        a.cost,
        a.cost AS original_cost,
        a.current_price,
        a.baseline_sales_units,
        coalesce(b.final_discount, a.effective_discount) as effective_discount,
		a.elasticity,
        a.rebate,
        a.shipping_cost
    FROM %s a
    LEFT JOIN %s b 
        ON a.product_id = b.product_id
        AND a.store_hierarchy = b.store_hierarchy
        AND a.customer_id = b.customer_id
        AND a.recommendation_date = b.date
        AND a.scenario_id = b.scenario_id
		AND a.offer_identifier = b.offer_identifier
),
calc AS (
    SELECT
        *,

		(baseline_sales_units*0.01*effective_discount*elasticity) as incremental_sales_units,

        -- Sales units
        (baseline_sales_units + (baseline_sales_units*0.01*effective_discount*elasticity)) AS sales_units,

        -- Discounted price calculation
        current_price * (1 - (0.01*effective_discount)) AS discounted_price
    FROM base
),
metrics AS (
    SELECT
        *,
        -- Revenue metrics
        discounted_price * sales_units AS revenue,
        (baseline_sales_units * current_price)::float8 AS baseline_revenue,
        ((sales_units * discounted_price) - (baseline_sales_units * current_price))::float8 AS incremental_revenue,

        -- Contribution margin (baseline)
        CASE 
            WHEN s0_id IN (1, 2) THEN (baseline_sales_units * (current_price - cost)) + (rebate * baseline_sales_units * cost)
            WHEN s0_id IN (3, 4) THEN (baseline_sales_units * (current_price - cost - shipping_cost)) + (rebate * baseline_sales_units * cost)
        END AS baseline_contribution_margin,

        -- Contribution margin (promo)
        CASE 
            WHEN s0_id IN (1, 2) THEN (sales_units * (current_price - cost)) + (rebate * sales_units * cost)
            WHEN s0_id IN (3, 4) THEN (sales_units * (current_price - cost - shipping_cost)) + (rebate * sales_units * cost)
        END AS contribution_margin,

        -- Margins
        (sales_units * (discounted_price - cost))::float8 AS margin,
        (baseline_sales_units * (current_price - cost))::float8 AS baseline_margin,
        ((sales_units * (discounted_price - cost)) - (baseline_sales_units * (current_price - cost)))::float8 AS incremental_margin,

        -- Promo spend
        (sales_units * (current_price - discounted_price)) AS promo_spend
    FROM calc
)
SELECT 	promo_id, scenario_id,
	product_id, 
	l0_cid, l1_cid, l2_cid, l3_cid, 
	s0_id, s3_id, store_hierarchy,
	customer_id, c0_id,
	recommendation_date as date, recommendation_date, phase, week_start_date, 
	offer_type_id, offer_type, offer_identifier, discount_level_value, c0_id as customer_type,
	discount_filter, calculated_discount, 
	effective_discount, cost, cost as original_cost, current_price,
	
	discounted_price, promo_spend, 
	sales_units, baseline_sales_units, (sales_units-baseline_sales_units) as incremental_sales_units,
	revenue, baseline_revenue, incremental_revenue, 
	baseline_contribution_margin, contribution_margin, 
	margin, baseline_margin, incremental_margin, 1 as currency_id, 0 as vat_percentage
FROM metrics;

    ', base_table_name, base_table_name, base_table_name,

 join_table_name);



    -- Raise a notice for debugging (optional)

    RAISE NOTICE 'Executing query: %', query;



    -- Execute the constructed query

    EXECUTE query;

END;

$procedure$
;
