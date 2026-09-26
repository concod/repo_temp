--liquibase formatted sql
--changeset yashraj.jha@impactanalytics.co:sync_all_hierarchy_labels runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for sync_all_hierarchy_labels

DROP PROCEDURE IF EXISTS base_pricing_restaurant.sync_all_hierarchy_labels;

CREATE OR REPLACE PROCEDURE base_pricing_restaurant.sync_all_hierarchy_labels()
 LANGUAGE plpgsql
AS $procedure$
DECLARE
    updated_count INTEGER := 0;
BEGIN
    RAISE NOTICE 'Starting hierarchy synchronization...';
    
    -- Sync Product Hierarchies
    CALL base_pricing_restaurant.sync_product_hierarchy_labels();
    
    -- Sync Store Hierarchies  
    CALL base_pricing_restaurant.sync_store_hierarchy_labels();
    
    RAISE NOTICE 'All hierarchy synchronizations completed.';
END;
$procedure$
;
