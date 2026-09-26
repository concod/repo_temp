--liquibase formatted sql
--changeset liquibase:sku_dc_available_units runOnChange:true stripComments:false splitStatements:false ignore:false context:Release_1_1 labels:liquibase_project_start
--comment: initial changeset for sku_dc_available_units
--rollback: SELECT 1
DROP VIEW IF EXISTS inventory_smart.sku_dc_available_units;

--changeset liquibase:sku_dc_available_units_1 runOnChange:true stripComments:false splitStatements:false ignore:false context:Release_1_1 labels:liquibase_project_start
--comment: initial changeset for sku_dc_available_units_1
--rollback: SELECT 1

CREATE OR REPLACE VIEW inventory_smart.sku_dc_available_units
AS SELECT dpi.article,
    dpc.product_code,
    dpi.pack_type_id,
    dpc.pack_description,
    dpc.size,
    COALESCE(dpc.units_in_pack, 1::double precision) * COALESCE(dpi.oh_pack_qty, 0::real) AS oh,
    COALESCE(dpc.units_in_pack, 1::double precision) * COALESCE(dpi.it_pack_qty, 0::real) AS it,
    COALESCE(dpc.units_in_pack, 1::double precision) * COALESCE(dpi.oo_pack_qty, 0::real) AS oo,
    dpi.channel,
    dpi.dc_code,
    dpc.units_in_pack,
    dpi.oh_pack_qty AS oh_packs,
    dpi.oo_pack_qty AS oo_packs,
    dpi.it_pack_qty AS it_packs,
    dpc.pack_type,
    'E'::text AS type
   FROM inventory_smart.dc_pack_inventory dpi
     FULL JOIN inventory_smart.dc_pack_configuration dpc USING (pack_type_id, article, pack_type, product_code);