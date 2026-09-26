--liquibase formatted sql
--changeset hari.krishna@impactanalytics.co:create_oms_tbl_ord_approved_recomnd runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:item_smart_initial_commit_ph-new-sku-1
--comment: initial changeset for create_oms_tbl_ord_approved_recomnd
--rollback: SELECT 1

DROP PROCEDURE IF EXISTS  item_smart.create_oms_tbl_ord_approved_recomnd();

CREATE OR REPLACE PROCEDURE item_smart.create_oms_tbl_ord_approved_recomnd()
 LANGUAGE plpgsql
AS $procedure$
DECLARE
    v_sql text;
BEGIN
v_sql:='Drop table if exists item_smart.oms_orders_approved';
execute v_sql;
v_sql:='Drop table if exists item_smart.oms_orders_recommended';
execute v_sql;
    -- oms_orders_approved
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'item_smart'
          AND table_name = 'oms_orders_approved'
    ) THEN
        v_sql := 'CREATE TABLE item_smart.oms_orders_approved AS 
                  SELECT * FROM inventory_smart.oms_orders_approved';
        RAISE NOTICE '%', v_sql;
        EXECUTE v_sql;
    END IF;

    -- oms_orders_recommended
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'item_smart'
          AND table_name = 'oms_orders_recommended'
    ) THEN
        v_sql := 'CREATE TABLE item_smart.oms_orders_recommended AS 
                  SELECT * FROM inventory_smart.oms_orders_recommended';
        RAISE NOTICE '%', v_sql;
        EXECUTE v_sql;
    END IF;

END;
$procedure$
;
