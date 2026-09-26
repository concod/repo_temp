--liquibase formatted sql
--changeset aniruddh.singh:sku_asn_available_units_v3 runOnChange:true stripComments:false splitStatements:false context:adding pack_type as eaches labels:liquibase_project_start
--comment: adding pack_type as eaches
--rollback: SELECT 1
DROP VIEW IF EXISTS inventory_smart.sku_asn_available_units;
CREATE OR REPLACE VIEW inventory_smart.sku_asn_available_units
AS SELECT dpc.article,
    dpc.product_code,
    dpc.pack_type_id,
    dpc.pack_description,
    dpc.size,
    sum(COALESCE(dpc.units_in_pack, 1)::double precision * COALESCE(pm.available_qty::real, 0::real)) AS oh,
    0 AS it,
    0 AS oo,
    sum(pm.available_qty) AS oh_eaches,
    0 AS oh_packs,
    pm.channel,
    pm.asn_id AS asn_code,
    pm.asn_id AS dc_code,
    pm.requirement_date,
    dpc.units_in_pack,
    'E'::text AS type,
    dpc.pack_type::text AS pack_type,
    pm.number_of_allocations
   FROM inventory_smart.asn_master pm
     JOIN inventory_smart.dc_pack_configuration dpc USING (pack_type_id, article)
  WHERE dpc.pack_type::text = 'eaches'::text
  GROUP BY dpc.article, dpc.product_code, dpc.pack_type_id, dpc.pack_description, dpc.size, 0::integer, pm.channel, pm.asn_id, pm.requirement_date, dpc.units_in_pack, 'E'::text, pm.number_of_allocations, dpc.pack_type;