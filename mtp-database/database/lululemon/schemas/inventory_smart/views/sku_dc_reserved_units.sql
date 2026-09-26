--liquibase formatted sql
--changeset liquibase:sku_dc_reserved_units runOnChange:true stripComments:false splitStatements:false context:add article and size labels:fix view
--comment: add article and size , sum up quantity
--rollback: SELECT 1
DROP VIEW IF EXISTS inventory_smart.sku_dc_reserved_units;
--rollback: SELECT 1

--changeset liquibase:sku_dc_reserved_units_1 runOnChange:true stripComments:false splitStatements:false context:add article and size labels:fix view
--comment: add article and size , sum up quantity
--rollback: SELECT 1

CREATE OR REPLACE VIEW inventory_smart.sku_dc_reserved_units
AS SELECT dpc.product_code,
    dpc.article,
    dpc.size,
    drq.dc_code,
    drq.type,
    drq.channel,
    drq.pack_type_id,
    COALESCE(drq.quantity, 0)::double precision * COALESCE(dpc.units_in_pack, 1::double precision) AS quantity
   FROM inventory_smart.dc_pack_reserve_quantity drq
     JOIN inventory_smart.dc_pack_configuration dpc USING (pack_type_id, article);