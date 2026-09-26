--liquibase formatted sql
--changeset nikhil.shet@impactanalytics.co:pc_psdf_create_final_table_from_free_installation runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_psdf_create_final_table_from_free_installation

DROP PROCEDURE IF EXISTS price_promo_opt.pc_psdf_create_final_table_from_free_installation ;
CREATE OR REPLACE PROCEDURE price_promo_opt.pc_psdf_create_final_table_from_free_installation(IN temp_table_name character varying, IN var_promo_id integer, IN var_scenario_id integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
DECLARE

start_time timestamp; end_time timestamp; query3_free_installation Text;

begin

query3_free_installation := format(
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
    df.elasticity,

    -- derived metrics from first query logic
    0 AS effective_discount,

    df.cost,
    df.cost AS original_cost,
    df.current_price,

    -- discounted_price calculation
    df.current_price AS discounted_price,

    -- sales_units and baseline_sales_units
    df.baseline_sales + (
        df.baseline_sales * c.final_redemption * b.cross_elasticity * df.calculated_discount / 100
    ) AS sales_units,
    df.baseline_sales AS baseline_sales_units,

    df.rebate,
    df.shipping_cost,

    df.offer_type_combined_display_name
FROM %s_forecast df
INNER JOIN price_promo.tb_installs_master_table b
    ON df.product_id = b.main_sku
INNER JOIN price_promo.tb_installs_redemption c
    ON df.phase = c.phase
   AND b.hierarchy_code = c.hierarchy_code


$sql$,
temp_table_name, temp_table_name,
temp_table_name
);

RAISE NOTICE 'Executing query3_free_installation: %', query3_free_installation;
EXECUTE query3_free_installation;

end;
$procedure$
;
