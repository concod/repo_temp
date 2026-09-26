--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:pc_calculate_total_promo_inventory runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_calculate_total_promo_inventory

DROP PROCEDURE IF EXISTS price_promo_opt.pc_calculate_total_promo_inventory ;
CREATE OR REPLACE PROCEDURE price_promo_opt.pc_calculate_total_promo_inventory(IN promo_id_input integer, OUT total_inventory_count integer)
 LANGUAGE plpgsql
AS $procedure$

BEGIN

    -- Initialize the output variable

    total_inventory_count := 0;



    -- Calculate total inventory using GROUP BY and concatenated IDs, handling NULLs

    SELECT COALESCE(SUM(li.total_inventory), 0) INTO total_inventory_count

    FROM global.tb_latest_inventory li

    WHERE concat(COALESCE(li.product_id::TEXT, ''), COALESCE(li.store_id::TEXT, '')) IN (

        SELECT concat(COALESCE(p.product_id::TEXT, ''), COALESCE(s.store_id::TEXT, ''))

        FROM price_promo.fn_fetch_products_for_promo(promo_id_input) p

        CROSS JOIN price_promo.fn_fetch_stores_for_promo(promo_id_input) s

    )AND li.date = CURRENT_DATE - 2;



    -- The total inventory count is now stored in the OUT parameter

END;

$procedure$
;
