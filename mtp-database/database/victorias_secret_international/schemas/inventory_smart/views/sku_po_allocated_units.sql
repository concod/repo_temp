--liquibase formatted sql
--changeset ashish:sku_po_allocated_units runOnChange:true stripComments:false splitStatements:false context:po_release labels:po
--comment: On Board
--rollback: SELECT 1
DROP VIEW IF EXISTS inventory_smart.sku_po_allocated_units;
