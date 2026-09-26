--liquibase formatted sql
--changeset gauri.nair:po_master runOnChange:true stripComments:false splitStatements:false context:zdt-views labels:MTP-1
--comment: initial changeset for po_master
--rollback: SELECT 1
DROP TABLE IF EXISTS inventory_smart.po_master;
DROP VIEW IF EXISTS inventory_smart.po_master;

CREATE OR REPLACE VIEW inventory_smart.po_master
AS SELECT po_code,
    product_code,
    requirement_date,
    channel,
    allocated_qty,
    available_qty,
    dc_code,
    not_before_date
   FROM inventory_smart.po_master_version
  WHERE version_code = global.get_table_version('inventory_smart.po_master_version'::text);