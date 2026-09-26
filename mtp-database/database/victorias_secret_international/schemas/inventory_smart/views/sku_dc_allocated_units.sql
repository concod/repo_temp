--liquibase formatted sql
--changeset ashish:sku_dc_allocated_units runOnChange:true stripComments:false splitStatements:false context:MTP-25749 labels:liquibase_project_start
--comment: On Board
--rollback: SELECT 1
DROP VIEW IF EXISTS inventory_smart.sku_dc_allocated_units;