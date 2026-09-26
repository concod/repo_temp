--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:pc_psdf_create_simpleoffer_final_table runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_psdf_create_simpleoffer_final_table

DROP PROCEDURE IF EXISTS price_promo_opt.pc_psdf_create_simpleoffer_final_table ;
CREATE OR REPLACE PROCEDURE price_promo_opt.pc_psdf_create_simpleoffer_final_table(IN temp_table_name character varying)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
DECLARE

start_time timestamp; end_time timestamp; query2 Text; 

begin


query2 := format(
$sql$

DROP TABLE IF EXISTS %s;
CREATE UNLOGGED TABLE %s AS

SELECT
    df.promo_id,
    df.scenario_id,
    df.product_id,
    df.l0_cid,
    df.l1_cid,
    df.l2_cid,
    df.l3_cid,
    df.s0_id,
    df.s3_id,
    CONCAT(df.s0_id, '_', df.s3_id) AS store_hierarchy,
    df.customer_id,
    df.c0_id,
    df.recommendation_date AS date,
    df.recommendation_date,
    df.phase,
    df.week_start_date,
    df.offer_type_id,
    df.offer_type,
    df.c0_id AS customer_type,
    df.calculated_discount,

    -- baseline sales derived directly from sim + splits
    sim.baseline_sales_units * dsplit.day_split_ratio * ssplit.store_split_ratio AS baseline_sales_units,
--    sim.baseline_sales_units AS baseline_sales_units,

    -- elasticity used in further calculations
    sim.elasticity,
    df.cost,
    df.cost AS original_cost,
    df.current_price,

    -- effective_discount and discounted_price (phase_multiplier = 1)
    (1 * (
        (sim.baseline_sales_units * dsplit.day_split_ratio * ssplit.store_split_ratio) *
        (0.01 * df.calculated_discount) * sim.elasticity
     )) / NULLIF(sim.elasticity * (
        sim.baseline_sales_units * dsplit.day_split_ratio * ssplit.store_split_ratio
     ) * 0.01, 0) AS effective_discount,

    df.current_price * (100 - (
        (1 * (
            (sim.baseline_sales_units * dsplit.day_split_ratio * ssplit.store_split_ratio) *
            (0.01 * df.calculated_discount) * sim.elasticity
        )) / NULLIF(sim.elasticity * (
            sim.baseline_sales_units * dsplit.day_split_ratio * ssplit.store_split_ratio
        ) * 0.01, 0)
    )) * 0.01 AS discounted_price,

    -- sales units (baseline + incremental)
    (sim.baseline_sales_units * dsplit.day_split_ratio * ssplit.store_split_ratio) +
    (
        (sim.baseline_sales_units * dsplit.day_split_ratio * ssplit.store_split_ratio) *
        (0.01 * df.calculated_discount) * sim.elasticity
    ) AS sales_units,

    df.rebate,
    df.shipping_cost,
	df.offer_type_combined_display_name
FROM %s_base df
INNER JOIN %s_tmp_simulation sim
    ON df.product_id = sim.product_id
   AND df.s0_id = sim.s0_id
   AND df.week_start_date = sim.week_start_date
   AND df.customer_id = sim.customer_id
INNER JOIN %s_tmp_day_split_ratio dsplit
    ON df.product_id = dsplit.product_id
   AND df.s0_id = dsplit.s0_id
   AND df.c0_id = dsplit.c0_id
   AND df.recommendation_date = dsplit.recommendation_date
INNER JOIN %s_tmp_store_split_ratio ssplit
    ON df.product_id = ssplit.product_id
   AND df.week_start_date = ssplit.week_start_date
   AND df.c0_id = ssplit.c0_id
   AND df.s0_id = ssplit.s0_id
   AND df.s3_id = ssplit.s3_id
$sql$, 
temp_table_name, temp_table_name,
temp_table_name, temp_table_name,  temp_table_name,  temp_table_name
);

RAISE NOTICE 'Query Forecast: %', query2;
EXECUTE query2; 

	


end;
$procedure$
;
