--liquibase formatted sql
--changeset siddharth.bajpai@impactanalytics.co:tb_latest_inventory_20251216_2 runAlways:true stripComments:false splitStatements:false context:tb_latest_inventory labels:tb_latest_inventory
--comment: tb_latest_inventory
DROP VIEW IF EXISTS "global".tb_latest_inventory;
CREATE OR REPLACE VIEW "global".tb_latest_inventory
AS SELECT s0_id,
    s0_name,
    s1_id,
    s1_name,
    store_id,
    style_cuq,
    product_id,
    clearance_indicator,
    date,
    oh,
    it,
    oo,
    vendor_oo,
    dc_oh,
    dc_it,
    dc_oo,
    total_inventory,
    clearance_indicator_rf,
    lifecycle_indicator_rf,
    st,
    age,
    clearance_eligible,
    version_code
   FROM global.tb_latest_inventory_version t1
  WHERE version_code = global.get_table_version('global.tb_latest_inventory_version'::text);