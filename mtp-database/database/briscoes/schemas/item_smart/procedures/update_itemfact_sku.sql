--liquibase formatted sql
--changeset shrey.jaiswal@impactanalytics.co:update_itemfact_sku_2 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:update_itemfact_sku_initial_commit
--comment: initial changeset for update_itemfact_sku

DROP PROCEDURE IF EXISTS item_smart.update_itemfact_sku();
CREATE OR REPLACE PROCEDURE item_smart.update_itemfact_sku()
LANGUAGE plpgsql
AS $procedure$
BEGIN
    -- Truncate the target table
    TRUNCATE TABLE item_smart.itemfact_sku;

    -- Insert data from the source table
    INSERT INTO item_smart.itemfact_sku
    SELECT hierarchy_code int8,
        dept text ,    
        moq float8 ,
        moq_feed float8 ,
        moq_is_source_feed bool  ,
        lead_time float8 ,
        lead_time_feed float8 ,
        lead_time_is_source_feed bool,
        launch_date date,
        clearance_date date,
        exit_date date,
        launch_date_feed date,
        launch_date_is_source_feed bool,
        clearance_date_feed date,
        clearance_date_is_source_feed bool,
        exit_date_feed date,
        exit_date_is_source_feed bool
         
    FROM public.itemfact_sku_refreshed;

END;
$procedure$
;