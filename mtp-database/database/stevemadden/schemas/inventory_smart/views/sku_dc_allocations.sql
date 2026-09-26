--liquibase formatted sql
--changeset ashish:sku_dc_allocations runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for sku_dc_allocations
--rollback: SELECT 1
DROP VIEW IF EXISTS inventory_smart.sku_dc_allocations;
