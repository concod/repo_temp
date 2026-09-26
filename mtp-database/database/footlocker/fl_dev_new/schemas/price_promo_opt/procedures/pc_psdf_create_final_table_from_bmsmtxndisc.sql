--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:pc_psdf_create_final_table_from_bmsmtxndisc runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: stacking changes for pc_psdf_create_final_table_from_bmsmtxndisc

DROP PROCEDURE if exists price_promo_opt.pc_psdf_create_final_table_from_bmsmtxndisc;
CREATE OR REPLACE PROCEDURE price_promo_opt.pc_psdf_create_final_table_from_bmsmtxndisc(IN temp_table_name character varying, IN temp_disc_changes character varying, IN var_promo_id integer, IN var_scenario_id integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
DECLARE

start_time timestamp; end_time timestamp; query3_txn Text; 
min_basket_value float; offer_value float; offer_y_type text; 

begin


    SELECT 
        (json_element.value->>'offer_x_value')::float,
        (json_element.value->>'offer_y_value')::float,
        json_element.value->>'offer_y_type'
    INTO 
        min_basket_value, offer_value, offer_y_type
    FROM price_promo.ps_scenario_discounts psd
    CROSS JOIN LATERAL jsonb_each(psd.scenario_data) AS json_element
    WHERE psd.promo_id = var_promo_id
      AND (json_element.value->>'scenario_id')::int = var_scenario_id
    LIMIT 1;


if offer_y_type = 'percent_off' then 

-- Compose the query
query3_txn := format(
$sql$
DROP TABLE IF EXISTS %s;
CREATE UNLOGGED TABLE %s AS

WITH base AS (
    SELECT DISTINCT product_id, s1_id, c0_id, 
--customer_id, 
1 as phase
    FROM %s
),
 

basket_data AS (
    SELECT 
        b.*,
        COALESCE(
            (
                SELECT 
                    CASE 
                        WHEN brp.latest_base_price >= %s THEN 100.0
                        WHEN brp.latest_base_price < %s AND brp.weighted_avg_basket_value < %s THEN 
                            ((brp.txn_percent * brp.weighted_avg_basket_value) / nullif(%s,0)) * %s
                        WHEN brp.latest_base_price < %s AND brp.weighted_avg_basket_value >= %s THEN 
                            ((brp.txn_percent * brp.weighted_avg_basket_value) / nullif(%s,0)) * %s
                        ELSE 50
                    END
                FROM price_promo.tb_basket_redemption_product brp
                WHERE brp.product_id = b.product_id
                  AND brp.s1_id = 1
                  AND brp.c0_id = 1
                  AND brp.phase = 1
                LIMIT 1
            ),
        100) * 0.01 AS phase_multiplier
    FROM base b
)


				SELECT distinct
				    df.promo_id,
				    df.scenario_id,
				    df.product_id,
--				    df.l0_cid,
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
--				    -- derived metrics from first query logic
--				    (ph.phase_multiplier * df.calculated_incremental) / NULLIF(df.elasticity * df.baseline_sales * 0.01, 0)
--				        AS effective_discount,
--				
--				    df.cost,
--				    df.cost AS original_cost,
--				    df.current_price,
--				
--				    -- discounted_price calculation
--				    df.current_price * (100 - ((ph.phase_multiplier * df.calculated_incremental) /
--				       NULLIF(df.elasticity * df.baseline_sales * 0.01, 0))) * 0.01 AS discounted_price,
--				
--				    -- sales_units and baseline_sales_units
--				    df.baseline_sales + (df.calculated_incremental * ph.phase_multiplier) AS sales_units,
--				    df.baseline_sales AS baseline_sales_units,
--				
--				    df.rebate,
--				    df.shipping_cost,
--    
--    				df.offer_type_combined_display_name
ph.phase_multiplier as sf_penetration_factor
				FROM %s df
                INNER JOIN basket_data ph
                    ON df.product_id = ph.product_id
                    AND df.c0_id = ph.c0_id
--                    AND df.customer_id = ph.customer_id
                    AND df.s1_id = ph.s1_id
--                    AND df.phase = ph.phase
--            ) sub1


$sql$,
temp_table_name,       
temp_table_name,        
temp_disc_changes,

min_basket_value, 
min_basket_value, min_basket_value, min_basket_value, offer_value,
min_basket_value, min_basket_value, min_basket_value, offer_value,



temp_disc_changes
);

-- Optionally execute it
RAISE NOTICE 'Executing query3_txn: %', query3_txn;
EXECUTE query3_txn;


end if; 



if offer_y_type = 'dollar_off' then 

-- Compose the query
query3_txn := format(
$sql$
DROP TABLE IF EXISTS %s;
CREATE UNLOGGED TABLE %s AS

WITH base AS (
    SELECT DISTINCT product_id, s1_id, c0_id, 1 as phase
    FROM %s
),
 

basket_data AS (
    SELECT 
        b.*,
        COALESCE(
            (
                SELECT 
                    CASE 
                        WHEN brp.latest_base_price > %s THEN (%s / nullif(brp.weighted_avg_basket_value, 0)) * %s
                        WHEN brp.latest_base_price < %s AND brp.weighted_avg_basket_value > %s THEN 
                            (%s / nullif(brp.weighted_avg_basket_value, 0)) * %s
                        WHEN brp.latest_base_price < %s AND brp.weighted_avg_basket_value < %s THEN 
                            ((brp.txn_percent * brp.weighted_avg_basket_value) / nullif(%s,0)) * %s
                        ELSE 50
                    END
                FROM price_promo.tb_basket_redemption_product brp
                WHERE brp.product_id = b.product_id
                  AND brp.s1_id = 1
                  AND brp.c0_id = 1
                  AND brp.phase = 1
                LIMIT 1
            ),
        100)*0.01 AS phase_multiplier
    FROM base b
)



				SELECT distinct
				    df.promo_id,
				    df.scenario_id,
				    df.product_id,
--				    df.l0_cid,
--				    df.l1_cid,
--				    df.l2_cid,
				    df.l3_cid,
				    df.s1_id,
--				    df.s3_id,
--				    CONCAT(df.s0_id, '_', df.s3_id) AS store_hierarchy,
--				    df.customer_id,
				    df.c0_id,
--				    df.recommendation_date AS date,
--				    df.recommendation_date,
--				    df.phase,
--				    df.week_start_date,
--				    df.offer_type_id,
--				    df.offer_type,
--				    df.c0_id AS customer_type,
--				    df.calculated_discount,
--					df.elasticity, 
--				    -- derived metrics from first query logic
--				    (ph.phase_multiplier * df.calculated_incremental) / NULLIF(df.elasticity * df.baseline_sales * 0.01, 0)
--				        AS effective_discount,
--				
--				    df.cost,
--				    df.cost AS original_cost,
--				    df.current_price,
--				
--				    -- discounted_price calculation
--				    df.current_price * (100 - ((ph.phase_multiplier * df.calculated_incremental) /
--				       NULLIF(df.elasticity * df.baseline_sales * 0.01, 0))) * 0.01 AS discounted_price,
--				
--				    -- sales_units and baseline_sales_units
--				    df.baseline_sales + (df.calculated_incremental * ph.phase_multiplier) AS sales_units,
--				    df.baseline_sales AS baseline_sales_units,
--				
--				    df.rebate,
--				    df.shipping_cost,
--					df.offer_type_combined_display_name
ph.phase_multiplier as sf_penetration_factor
				FROM %s df
                INNER JOIN basket_data ph
                    ON df.product_id = ph.product_id
                    AND df.c0_id = ph.c0_id
--                    AND df.customer_id = ph.customer_id
                    AND df.s1_id = ph.s1_id
--                    AND df.phase = ph.phase



$sql$,
temp_table_name,       
temp_table_name,        
temp_disc_changes,

min_basket_value, min_basket_value, offer_value,
min_basket_value, min_basket_value, min_basket_value, offer_value,
min_basket_value, min_basket_value, min_basket_value, offer_value,



temp_disc_changes
);

-- Optionally execute it
RAISE NOTICE 'Executing query3_txn: %', query3_txn;
EXECUTE query3_txn;


end if; 

end;
$procedure$
;

