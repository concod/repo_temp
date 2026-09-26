--liquibase formatted sql
--changeset liquibase:sku_dc_reserved_units runOnChange:true stripComments:false splitStatements:false context:add article and size labels:fix view
--comment: add article and size , sum up quantity
--rollback: SELECT 1
DROP VIEW IF EXISTS inventory_smart.sku_dc_reserved_units;
CREATE OR REPLACE VIEW inventory_smart.sku_dc_reserved_units
AS SELECT 1;