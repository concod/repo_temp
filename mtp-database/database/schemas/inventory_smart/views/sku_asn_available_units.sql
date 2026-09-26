-- liquibase formatted sql
--changeset liquibase:sku_asn_available_units_v1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: Updated changeset for sku_asn_available_units

DROP VIEW IF EXISTS inventory_smart.sku_asn_available_units;
CREATE OR REPLACE VIEW inventory_smart.sku_asn_available_units
AS SELECT dpc.article,
    dpc.product_code,
    dpc.pack_type_id,
    dpc.size,
    COALESCE(dpc.units_in_pack, 1)::double precision * COALESCE(am.available_qty::real, 0::real) AS oh,
    am.available_qty AS oh_packs,
    0 AS oh_eaches,
    am.channel,
    am.asn_code,
    am.asn_code::text as dc_code,
    am.requirement_date,
    dpc.units_in_pack,
    null::varchar as pack_description,
    'S'::text AS type,
    am.number_of_allocations
   FROM inventory_smart.asn_master am
     JOIN inventory_smart.dc_pack_configuration dpc USING (pack_type_id, article)
  WHERE dpc.pack_type::text = 'packs'::text
UNION
 SELECT dpc.article,
    dpc.product_code,
    dpc.pack_type_id,
    dpc.size,
    COALESCE(am.available_qty::real, 0::real) AS oh,
    0 AS oh_packs,
    am.available_qty AS oh_eaches,
    am.channel,
    am.asn_code,
    am.asn_code::text as dc_code,
    am.requirement_date,
    dpc.units_in_pack,
    null::varchar as pack_description,
    'E'::text AS type,
    am.number_of_allocations
   FROM inventory_smart.asn_master am
     JOIN inventory_smart.dc_pack_configuration dpc USING (pack_type_id, article)
  WHERE dpc.pack_type::text = 'eaches'::text
;