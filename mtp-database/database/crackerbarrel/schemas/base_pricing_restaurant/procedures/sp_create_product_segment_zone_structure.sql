--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:sp_create_product_segment_zone_structure runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for sp_create_product_segment_zone_structure

DROP PROCEDURE IF EXISTS base_pricing_restaurant.sp_create_product_segment_zone_structure;

CREATE OR REPLACE PROCEDURE base_pricing_restaurant.sp_create_product_segment_zone_structure()
 LANGUAGE plpgsql
AS $procedure$
BEGIN
    -- Insert new product-segment combinations that don't already exist
    INSERT INTO base_pricing_restaurant.bp_product_customer_segment_prices (
        product_id,
        segment_id,
        zone_structure_id
    )
    SELECT 
        p.product_id,
        s.segment_id,
        NULL as zone_structure_id  -- Default NULL zone structure
    FROM 
        (SELECT DISTINCT product_id FROM base_pricing_restaurant.bp_product_master WHERE active = TRUE) p
    CROSS JOIN 
        (SELECT segment_id FROM base_pricing_restaurant.bp_customer_segment_master WHERE is_active = TRUE) s
    WHERE NOT EXISTS (
        SELECT 1 
        FROM base_pricing_restaurant.bp_product_customer_segment_prices existing
        WHERE existing.product_id = p.product_id
        AND existing.segment_id = s.segment_id
    );
    
    -- Log the number of rows inserted
    RAISE NOTICE 'Inserted % new product-segment combinations', FOUND;
END;
$procedure$
;
