--liquibase formatted sql
--changeset sreevathsa.sp@impactanalytics.co:sku_dc_available_units_v1 runOnChange:true stripComments:false splitStatements:false context:MTP-96133 labels:MTP-96133
--comment: MTP-96133:initial changeset for sku_dc_available_units_v1
--rollback: SELECT 1
DROP VIEW IF EXISTS inventory_smart.sku_dc_available_units;

CREATE OR REPLACE VIEW inventory_smart.sku_dc_available_units
AS SELECT dpi.article,
    dpc.product_code,
    dpi.pack_type_id,
    dpc.pack_description,
    dpc.size,
    COALESCE(dpc.units_in_pack, 1) * COALESCE(dpi.oh_pack_qty, 0) AS oh,
    COALESCE(dpc.units_in_pack, 1) * COALESCE(dpi.it_pack_qty, 0) AS it,
    COALESCE(dpc.units_in_pack, 1) * COALESCE(dpi.oo_pack_qty, 0) AS oo,
    dpi.channel,
    dpi.dc_code,
    dpc.units_in_pack,
    dpi.oh_pack_qty AS oh_packs,
    dpi.oo_pack_qty AS oo_packs,
    dpi.it_pack_qty AS it_packs,
    dpc.pack_type,
    'E'::text AS type
   FROM inventory_smart.dc_pack_inventory dpi
     FULL JOIN inventory_smart.dc_pack_configuration dpc USING (pack_type_id, article, pack_type);

--liquibase formatted sql
--changeset adesh:sku_dc_available_units_v3 runOnChange:true stripComments:false splitStatements:false context:MTP-96133-update-sku_dc_available_units labels:MTP-96133-update
--comment: MTP-96133-cyclic-feed-update-get-it-oo-from-latest_inventory-in-sku_dc_available_units
--rollback: SELECT 1
DROP VIEW IF EXISTS inventory_smart.sku_dc_available_units;
CREATE OR REPLACE VIEW inventory_smart.sku_dc_available_units AS
SELECT
    paf.article,
    paf.product_code,
    paf.product_code AS pack_type_id,
    paf.size,
    delta.dc_available_qty AS oh,
    inv.it,
    inv.oo,
    saf.channel,
    saf.dc_code,
    1 AS units_in_pack,
    'E'::text AS type
FROM
    inventory_smart.latest_inventory_delta delta
JOIN global.store_attributes_filter saf
    ON delta.store_code = saf.store_code
JOIN global.product_attributes_filter paf
    ON delta.product_code = paf.product_code
LEFT JOIN inventory_smart.latest_inventory inv
    ON delta.product_code = inv.product_code AND delta.store_code = inv.store_code
WHERE
    paf.active
UNION
SELECT
    paf.article,
    paf.product_code,
    paf.product_code AS pack_type_id,
    paf.size,
    li.oh,
    li.it,
    li.oo,
    li.channel,
    dc.dc_code,
    1 AS units_in_pack,
    'E'::text AS type
FROM (
    SELECT
        latest_inventory.product_code,
        latest_inventory.store_code,
        latest_inventory.dc_available_qty as oh,
        latest_inventory.it,
        latest_inventory.oo,
        latest_inventory.channel
    FROM
        inventory_smart.latest_inventory
) li
JOIN global.distribution_centres dc
    ON li.store_code = dc.linked_store_code
JOIN global.product_attributes_filter paf
    USING (product_code)
WHERE
    paf.active
    AND NOT EXISTS (
        SELECT 1
        FROM inventory_smart.latest_inventory_delta delta
        JOIN global.distribution_centres dc_1
            ON dc_1.linked_store_code = delta.store_code
        WHERE
            delta.product_code = li.product_code
            AND dc_1.linked_store_code = li.store_code
    );