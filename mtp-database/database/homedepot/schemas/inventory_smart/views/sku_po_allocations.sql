--liquibase formatted sql
--changeset liquibase:sku_po_allocations runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for sku_po_allocations
--rollback: SELECT 1
DROP VIEW IF EXISTS inventory_smart.sku_po_allocations;
CREATE OR REPLACE VIEW inventory_smart.sku_po_allocations
AS SELECT 1;