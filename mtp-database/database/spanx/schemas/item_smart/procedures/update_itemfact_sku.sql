--liquibase formatted sql
--changeset abhimanyu.j@impactanalytics.co:update_itemfact_sku runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:update_itemfact_sku_initial_commit
--comment: initial changeset for update_itemfact_sku
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS item_smart.update_itemfact_sku();
CREATE OR REPLACE PROCEDURE item_smart.update_itemfact_sku()
LANGUAGE plpgsql
AS $procedure$
BEGIN
    TRUNCATE TABLE item_smart.itemfact_sku;

    INSERT INTO item_smart.itemfact_sku (
        dept,
        hierarchy_code,
        launch_date,
        launch_date_feed,
        launch_date_is_source_feed,
        exit_date,
        exit_date_feed,
        exit_date_is_source_feed,
        lead_time,
        lead_time_feed,
        lead_time_is_source_feed,
        clearance_date,
        clearance_date_feed,
        clearance_date_is_source_feed
    )
    SELECT
        dept,
        hierarchy_code,
        launch_date,
        launch_date_feed,
        launch_date_is_source_feed,
        exit_date,
        exit_date_feed,
        exit_date_is_source_feed,
        lead_time,
        lead_time_feed,
        lead_time_is_source_feed,
        clearance_date,
        clearance_date_feed,
        clearance_date_is_source_feed
    FROM public.itemfact_sku_refreshed;
END;
$procedure$;