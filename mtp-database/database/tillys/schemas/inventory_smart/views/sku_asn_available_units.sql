-- liquibase formatted sql
--changeset liquibase:sku_asn_available_units_v2 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_starts
--comment: Updated changeset for sku_asn_available_units_v2

DROP VIEW IF EXISTS inventory_smart.sku_asn_available_units;

CREATE OR REPLACE VIEW inventory_smart.sku_asn_available_units
AS SELECT article,
    product_code,
    pack_type_id,
    pack_description,
    size,
    oh,
    it,
    oo,
    oh_eaches,
    oh_packs,
    channel,
    asn_id,
    asn_code,
    dc_code,
    requirement_date,
    units_in_pack,
    type,
    pack_type,
    number_of_allocations,
    pre_pack,
    active_asn_flag
   FROM ( SELECT dpc.article,
            dpc.product_code,
            dpc.pack_type_id,
            dpc.pack_description,
            dpc.size,
            sum(COALESCE(dpc.units_in_pack, 1)::double precision * COALESCE(am.available_qty::real, 0::real)) AS oh,
            0 AS it,
            0 AS oo,
            sum(am.available_qty) AS oh_eaches,
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
            NULL::text AS pre_pack,
            am.active_asn_flag
           FROM inventory_smart.asn_master am
             JOIN inventory_smart.dc_pack_configuration dpc USING (pack_type_id, article)
          WHERE dpc.pack_type::text = 'eaches'::text
          GROUP BY dpc.article, dpc.product_code, dpc.pack_type_id, dpc.pack_description, dpc.size, am.channel, am.asn_id, am.asn_code, am.dc_code, am.requirement_date, dpc.units_in_pack, dpc.pack_type, am.active_asn_flag
        UNION
         SELECT dpc.article,
            dpc.product_code,
            dpc.pack_type_id,
            dpc.pack_description,
            dpc.size,
            sum(COALESCE(dpc.units_in_pack, 1)::double precision * COALESCE(am.available_qty::real, 0::real)) AS oh,
            0 AS it,
            0 AS oo,
            sum(am.available_qty) AS oh_eaches,
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
            NULL::text AS pre_pack,
            am.active_asn_flag
           FROM inventory_smart.asn_master am
             JOIN inventory_smart.dc_pack_configuration dpc USING (pack_type_id, article)
          WHERE dpc.pack_type::text = 'eaches'::text AND NOT (EXISTS ( SELECT 1
                   FROM inventory_smart.asn_master am_1
                  WHERE am_1.asn_code::text = am_1.asn_code::text AND am_1.pack_type_id::text = am_1.pack_type_id::text))
          GROUP BY dpc.article, dpc.product_code, dpc.pack_type_id, dpc.pack_description, dpc.size, am.channel, am.asn_id, am.asn_code, am.dc_code, am.requirement_date, dpc.units_in_pack, dpc.pack_type, am.active_asn_flag) base
  WHERE active_asn_flag = true;