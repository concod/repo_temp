--liquibase formatted sql
--changeset liquibase:sku_dc_allocated_units_dg runOnChange:true stripComments:false splitStatements:false context:MTP-20089 labels:liquibase_project_start
--comment: MTP-20089
--rollback: SELECT 1
DROP VIEW IF EXISTS inventory_smart.sku_dc_allocated_units;
CREATE OR REPLACE VIEW inventory_smart.sku_dc_allocated_units
AS
select * from inventory_smart.dc_pack_configuration;