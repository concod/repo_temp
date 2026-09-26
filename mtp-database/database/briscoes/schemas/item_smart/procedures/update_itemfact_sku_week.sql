--liquibase formatted sql
--changeset shrey.jaiswal@impactanalytics.co:update_itemfact_sku_week2 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:update_itemfact_sku_week_initial_commit
--comment: initial changeset for update_itemfact_sku_week
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS item_smart.update_itemfact_sku_week();
CREATE OR REPLACE PROCEDURE item_smart.update_itemfact_sku_week()
LANGUAGE plpgsql
AS $procedure$
BEGIN
    -- Truncate the target table
    TRUNCATE TABLE item_smart.itemfact_sku_week;

    -- Insert data from the source table
    INSERT INTO item_smart.itemfact_sku_week
    SELECT 
		
		hierarchy_code int8 ,
        dept text ,
        current_week float8 , 
        target_fwos float8 ,
        target_fwos_feed float8 , 
        target_fwos_is_source_feed bool

    FROM public.itemfact_sku_week_refreshed;

END;
$procedure$
;
