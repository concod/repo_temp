--liquibase formatted sql
--changeset anujkumar.singh@impactanalytics.co:sku_store_inventory_1 runOnChange:true stripComments:false splitStatements:false context:vs_inventorysmart labels:VPP-265
--comment: view not relevant for VS
--rollback: SELECT 1
DROP VIEW IF EXISTS inventory_smart.sku_store_inventory;
CREATE OR REPLACE VIEW inventory_smart.sku_store_inventory
AS SELECT cast(null as varchar) as store_code,
    cast(null as varchar) as channel,
    cast(null as varchar) as l2_name,
    cast(null as int4) as oo,
    cast(null as int4) as  oh,
    cast(null as int4) as it ;
  