--liquibase formatted sql
--changeset rajat.choudhary:sku_dc_reserved_units runOnChange:true stripComments:false splitStatements:false context:add article and size labels:003
--comment: added packs_reserved column
--rollback: SELECT 1
DROP VIEW IF EXISTS inventory_smart.sku_dc_reserved_units;
CREATE OR REPLACE VIEW inventory_smart.sku_dc_reserved_units
AS
SELECT 
	drq.product_code,
    drq.product_code as pack_type_id,
    paf.article,
    paf.size,
    drq.dc_code,
    drq.type,
    drq.channel,
    sum(drq.quantity) AS quantity,
    floor((drq.quantity / b.units_in_pack)::double precision) AS packs_reserved
FROM inventory_smart.dc_reserve_quantity drq
JOIN global.product_attributes_filter paf USING (product_code)
JOIN 
( 
	SELECT DISTINCT 
		split_part(dpc.pack_type_id::text, '_'::text, 2) AS primary_sku,
        CASE WHEN dpc.article::text = dpc.pack_type_id::text THEN dpc.units_in_pack ELSE 1 END AS units_in_pack
    FROM inventory_smart.dc_pack_configuration dpc
) b 
ON split_part(drq.product_code::text, '_'::text, 2) = b.primary_sku
GROUP BY drq.product_code, paf.article, paf.size, drq.dc_code, drq.type, drq.channel, drq.quantity, b.units_in_pack;