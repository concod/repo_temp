--liquibase formatted sql
--changeset abhimanyu.j@impactanalytics.co:refresh_itemfact_tables runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:refresh_itemfact_tables_initial_commit
--comment: initial changeset for refresh_itemfact_tables
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS item_smart.refresh_itemfact_tables();
CREATE OR REPLACE PROCEDURE item_smart.refresh_itemfact_tables()
 LANGUAGE plpgsql
AS $procedure$
BEGIN
    DELETE FROM item_smart.itemfact_sku_week;
    DELETE FROM item_smart.itemfact_sku;

END;
$procedure$;