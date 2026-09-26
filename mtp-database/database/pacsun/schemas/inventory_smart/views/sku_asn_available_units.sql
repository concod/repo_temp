--liquibase formatted sql
--changeset Parmanand:add-sku_asn_available_units_v4 runOnChange:true stripComments:false splitStatements:false 
--rollback: SELECT 1
DROP VIEW IF EXISTS inventory_smart.sku_asn_available_units;
CREATE OR REPLACE VIEW inventory_smart.sku_asn_available_units
AS SELECT * FROM ((
SELECT
    dpc.article,
    dpc.product_code,
    dpc.pack_type_id,
    dpc.pack_description,
    dpc.size,
    SUM(COALESCE(dpc.units_in_pack, 1)::double precision * COALESCE(delta.available_qty::real, 0::real)) AS oh,
    0 AS it,
    0 AS oo,
    SUM(delta.available_qty) AS oh_eaches,
    0 AS oh_packs,
    delta.channel,
    delta.asn_id,
    delta.asn_code,
    delta.asn_code::text AS dc_code,
    coalesce(delta.requirement_date,delta.vi_date) as requirement_date,
    dpc.units_in_pack,
    'E'::text AS type,
    dpc.pack_type::text AS pack_type,
    NULL::integer AS number_of_allocations,
    delta.handling_type,
    delta.receiver_number,
    delta.vi_date,
    delta.active_asn_flag,
    NULL::text AS pre_pack
FROM inventory_smart.latest_asn_delta delta
JOIN inventory_smart.dc_pack_configuration dpc
  ON delta.pack_type_id::text = dpc.product_code::text
WHERE dpc.pack_type::text = 'eaches'
GROUP BY
    dpc.article, dpc.product_code, dpc.pack_type_id, dpc.pack_description, dpc.size,
    delta.channel, delta.asn_id, delta.asn_code, delta.dc_code, delta.requirement_date,
    dpc.units_in_pack, dpc.pack_type, delta.handling_type, delta.receiver_number, delta.vi_date, delta.active_asn_flag
)
UNION
(
SELECT
    dpc.article,
    dpc.product_code,
    dpc.pack_type_id,
    dpc.pack_description,
    dpc.size,
    SUM(COALESCE(dpc.units_in_pack, 1)::double precision * COALESCE(am.available_qty::real, 0::real)) AS oh,
    0 AS it,
    0 AS oo,
    SUM(am.available_qty) AS oh_eaches,
    0 AS oh_packs,
    am.channel,
    am.asn_id,
    am.asn_code,
    am.asn_code::text AS dc_code,
    am.requirement_date,
    dpc.units_in_pack,
    'E'::text AS type,
    dpc.pack_type::text AS pack_type,
    NULL::integer AS number_of_allocations,
    am.handling_type,
    am.receiver_number,
    am.vi_date,
    am.active_asn_flag,
    NULL::text AS pre_pack
FROM inventory_smart.asn_master am
JOIN inventory_smart.dc_pack_configuration dpc
  ON am.pack_type_id::text = dpc.product_code::text
WHERE dpc.pack_type::text = 'eaches'
  AND NOT EXISTS (
        SELECT 1
        FROM inventory_smart.latest_asn_delta delta
        WHERE delta.asn_code::text = am.asn_code::text
          AND delta.pack_type_id::text = am.pack_type_id::text
    )
GROUP BY
    dpc.article, dpc.product_code, dpc.pack_type_id, dpc.pack_description, dpc.size,
    am.channel, am.asn_id, am.asn_code, am.dc_code, am.requirement_date,
    dpc.units_in_pack, dpc.pack_type, am.handling_type, am.receiver_number, am.vi_date, am.active_asn_flag
)) as base
where base.active_asn_flag = TRUE;
