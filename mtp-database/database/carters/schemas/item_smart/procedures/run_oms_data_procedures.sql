--liquibase formatted sql
--changeset hari.krishna@impactanalytics.co:run_oms_data_procedures_1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:item_smart_initial_commit_ph-new-sku-1
--comment: initial changeset for run_oms_data_procedures
--rollback: SELECT 1

DROP PROCEDURE IF EXISTS item_smart.run_oms_data_procedures();

CREATE OR REPLACE PROCEDURE item_smart.run_oms_data_procedures()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
BEGIN
    -- Step 1: Ensure required OMS tables exist
    CALL item_smart.create_oms_tbl_ord_approved_recomnd();

    -- Step 2: Aggregate OMS data and update wp_master
    CALL item_smart.Update_wp_master_using_oms_tbls_ord_approved_recomnd();

    RAISE NOTICE 'Both OMS procedures executed successfully.';
END;
$procedure$
;
