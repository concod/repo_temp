--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:pc_calculate_total_promo_inventory runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: stacking changes for pc_calculate_total_promo_inventory

DROP PROCEDURE if exists price_promo_opt.pc_calculate_total_promo_inventory;
CREATE OR REPLACE PROCEDURE price_promo_opt.pc_calculate_total_promo_inventory(IN promo_id_input integer, OUT total_inventory_count integer)
 LANGUAGE plpgsql
AS $procedure$
-- Purpose – Calculates the total inventory available for a promotion by combining latest inventory and future purchase orders
-- 
-- Example – CALL price_promo_opt.pc_calculate_total_promo_inventory(123, inventory_count);
-- 
-- Other Functions Used:
-- * fn_fetch_products_for_promo - Gets the list of products associated with the promotion
-- * fn_fetch_stores_for_promo - Gets the list of stores associated with the promotion
-- 
-- Tables Used:
-- * price_promo.promo_master - Used to get the promotion start date
-- * global.tb_latest_inventory - Contains the current inventory levels
-- * global.tb_future_inventory_po - Contains future purchase orders
-- 
-- Returns – An OUT parameter (total_inventory_count) containing the sum of current inventory and future POs

DECLARE
    promo_start_date DATE;
    latest_inventory_sum INTEGER := 0;
    future_po_sum INTEGER := 0;
    max_inventory_date DATE;
BEGIN
    -- Get the promo start date
    SELECT start_date
    INTO promo_start_date
    FROM price_promo.promo_master
    WHERE promo_id = promo_id_input;

    -- Get the max date from inventory table
    SELECT MAX(date)
    INTO max_inventory_date
    FROM global.tb_latest_inventory;
    
    -- Sum of total_inventory from tb_latest_inventory using the max date
    SELECT SUM(COALESCE(li.oh, 0)) + SUM(COALESCE(li.it, 0))
    INTO latest_inventory_sum
    FROM global.tb_latest_inventory li
    WHERE li.product_id IN (
        SELECT product_id
        FROM price_promo.fn_fetch_products_for_promo(promo_id_input)
    )
    AND li.date = max_inventory_date;

    -- Sum of ordered_quantity from tb_future_inventory_po where po_date < promo start_date
    SELECT COALESCE(SUM(fpo.ordered_quantity), 0)
    INTO future_po_sum
    FROM global.tb_future_inventory_po fpo
    WHERE fpo.product_id IN (
        SELECT product_id
        FROM price_promo.fn_fetch_products_for_promo(promo_id_input)
    )
    AND fpo.po_date < promo_start_date;

    -- Total inventory count = latest + future PO
    total_inventory_count := latest_inventory_sum + future_po_sum;
END;
$procedure$



;