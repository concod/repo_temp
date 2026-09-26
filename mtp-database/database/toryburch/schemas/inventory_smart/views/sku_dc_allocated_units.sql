--liquibase formatted sql
--changeset liquibase:suba.nataraj runOnChange:true stripComments:false splitStatements:false context:MTP-20089-3 labels:liquibase_project_start
--comment: MTP-20089-3
--rollback: SELECT 1
DROP VIEW IF EXISTS inventory_smart.sku_dc_allocated_units;