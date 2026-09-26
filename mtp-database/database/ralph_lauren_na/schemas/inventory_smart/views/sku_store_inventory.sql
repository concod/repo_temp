--liquibase formatted sql
--changeset liquibase:sku_store_inventory runOnChange:true stripComments:false splitStatements:false context:rl_capacity labels:MTP-18226
--comment: RL sync from VB - Capacity breach
--rollback: SELECT 1
DROP VIEW IF EXISTS inventory_smart.sku_store_inventory;
CREATE OR REPLACE VIEW inventory_smart.sku_store_inventory
AS SELECT li.store_code,
    li.channel,
    paf.l2_name,
    sum(li.oo) AS oo,
    sum(li.store_avail_oh)::bigint AS oh,
    sum(li.store_in_transit)::bigint AS it
   FROM inventory_smart.store_stock_drilldown li
     JOIN global.product_attributes_filter paf USING (product_code)
  WHERE li.store_code::text <> 'STB'::text
  GROUP BY li.store_code, li.channel, paf.l2_name;