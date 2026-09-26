--liquibase formatted sql
--changeset abhimanyu.j@impactanalytics.co:refresh_itemsmart_tables runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:refresh_itemsmart_tables_initial_commit
--comment: initial changeset for refresh_itemsmart_tables
--rollback: SELECT 1

DROP PROCEDURE if EXISTS item_smart.refresh_itemsmart_tables();

CREATE OR REPLACE PROCEDURE item_smart.refresh_itemsmart_tables()
 LANGUAGE plpgsql
AS $procedure$
BEGIN
    -- Delete data from each table in the correct order
    DELETE FROM item_smart.placeholders_info;
    DELETE FROM item_smart.new_skus;
    

     -- Delete dependent tables first
    DELETE FROM item_smart.master_plan_ledger;
    DELETE FROM item_smart.master_plan_status;

    -- Now delete the parent table
    DELETE FROM item_smart.master_plan_attributes;

    DELETE FROM item_smart.lf_master;
    DELETE FROM item_smart.op_master;
    DELETE FROM item_smart.master_plan_action_counts;

END;
$procedure$
;