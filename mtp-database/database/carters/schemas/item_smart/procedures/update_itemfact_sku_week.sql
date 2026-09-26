--liquibase formatted sql
--changeset sonika.baheti@impactanalytics.co:update_itemfact_sku_week2 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:update_itemfact_sku_week_initial_commit
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
		
		hierarchy_code numeric ,
        dept text ,
        current_week INT4  , 
        target_fwos float4 ,
        target_fwos_feed float4 , 
        target_fwos_is_source_feed bool,
        reco_rcpt_week_flag bool 

    FROM public.itemfact_sku_week_refreshed;

END;
$procedure$
;
