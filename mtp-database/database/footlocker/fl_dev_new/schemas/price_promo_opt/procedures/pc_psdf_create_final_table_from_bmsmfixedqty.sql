--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:pc_psdf_create_final_table_from_bmsmfixedqty runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: stacking changes for pc_psdf_create_final_table_from_bmsmfixedqty

DROP PROCEDURE if exists price_promo_opt.pc_psdf_create_final_table_from_bmsmfixedqty;
CREATE OR REPLACE PROCEDURE price_promo_opt.pc_psdf_create_final_table_from_bmsmfixedqty(IN temp_table_name character varying, IN temp_disc_changes character varying, IN var_promo_id integer, IN var_scenario_id integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
DECLARE

start_time timestamp; end_time timestamp; query3_fq Text;
offer_x_value float; offer_y_value float; offer_y_type text;

begin

	SELECT 
        (json_element.value->>'offer_x_value')::float,
        (json_element.value->>'offer_y_value')::float,
        json_element.value->>'offer_y_type'
    INTO 
        offer_x_value, offer_y_value, offer_y_type
    FROM price_promo.ps_scenario_discounts psd
    CROSS JOIN LATERAL jsonb_each(psd.scenario_data) AS json_element
    WHERE psd.promo_id = var_promo_id
      AND (json_element.value->>'scenario_id')::int = var_scenario_id
    LIMIT 1;

query3_fq := format(
$sql$
DROP TABLE IF EXISTS %s;
CREATE UNLOGGED TABLE %s AS

WITH base AS (
    SELECT DISTINCT product_id, l0_cid, l3_cid, s1_id, c0_id, offer_x_value AS buy_qty, subq.phase
    FROM %s
    CROSS JOIN (
select distinct
    CASE 
        WHEN EXTRACT(MONTH FROM recommendation_date) BETWEEN 3 AND 5 THEN 1
        WHEN EXTRACT(MONTH FROM recommendation_date) BETWEEN 6 AND 7 THEN 2
        WHEN EXTRACT(MONTH FROM recommendation_date) BETWEEN 8 AND 9 THEN 3
        WHEN EXTRACT(MONTH FROM recommendation_date) IN (10, 11, 12, 1, 2) THEN 4
    END AS phase 
    FROM (
        SELECT generate_series(pm.start_date, pm.end_date, '1 day')::date AS recommendation_date
        FROM price_promo.promo_master pm
        WHERE pm.promo_id = %s 
    ) sub1
    INNER JOIN global.tb_fiscal_date_mapping tfdm ON sub1.recommendation_date = tfdm.date) subq
),

redemption_data AS (
    SELECT base.*,
        CASE 
            WHEN base.c0_id = 1 THEN (
                COALESCE(
                    (
                        SELECT c.final_redemption_qty
                        FROM price_promo.tb_fixed_qty_redemption_class c
                        WHERE c.l3_cid = base.l3_cid
                          AND c.c0_id = 1
                          AND c.s1_id = base.s1_id
                          AND c.phase = base.phase
                          AND c.qty_bucket = base.buy_qty
                        LIMIT 1
                    ),
                    0.2
                )
            )
            ELSE 1.0
        END AS phase_multiplier
    FROM base
)

				SELECT distinct
				    df.promo_id,
				    df.scenario_id,
				    df.product_id,
				    df.l0_cid,
--				    df.l1_cid,
--				    df.l2_cid,
				    df.l3_cid,
				    df.s1_id,
				    df.c0_id,
--				    CONCAT(df.s0_id, '_', df.s3_id) AS store_hierarchy,
--				    df.customer_id,
--				    df.c0_id,
--				    df.recommendation_date AS date,
--				    df.recommendation_date,
--				    df.phase,
--				    df.week_start_date,
--				    df.offer_type_id,
--				    df.offer_type,
--				    df.c0_id AS customer_type,
--				    df.calculated_discount,
--					df.elasticity,
--				
--				    -- derived metrics from first query logic
--				    (rd.phase_multiplier  * df.calculated_incremental) / NULLIF(df.elasticity * df.baseline_sales * 0.01, 0)
--				        AS effective_discount,
--				
--				    df.cost,
--				    df.cost AS original_cost,
--				    df.current_price,
--				
--				    -- discounted_price calculation
--				    df.current_price * (100 - ((rd.phase_multiplier * df.calculated_incremental) /
--				       NULLIF(df.elasticity * df.baseline_sales * 0.01, 0))) * 0.01 AS discounted_price,
--				
--				    -- sales_units and baseline_sales_units
--				    df.baseline_sales + (df.calculated_incremental * rd.phase_multiplier) AS sales_units,
--				    df.baseline_sales AS baseline_sales_units,
--				
--				    df.rebate,
--				    df.shipping_cost,
--    
--    				df.offer_type_combined_display_name
					rd.phase_multiplier AS sf_penetration_factor
				FROM %s df
    INNER JOIN redemption_data rd
    ON df.product_id = rd.product_id
    AND df.s1_id = rd.s1_id
    AND df.c0_id = rd.c0_id
--	and df.customer_id = rd.customer_id


$sql$,
temp_table_name, temp_table_name, temp_disc_changes, 
var_promo_id, temp_disc_changes

);

RAISE NOTICE 'Executing query3_fq: %', query3_fq;
EXECUTE query3_fq;

end;
$procedure$
;

