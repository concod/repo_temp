--liquibase formatted sql
--changeset liquibase:sku_po_allocated_units runOnChange:true stripComments:false splitStatements:false context:po_release labels:po
--comment: add product_code in View differently for eaches and packs
--rollback: SELECT 1
DROP VIEW IF EXISTS inventory_smart.sku_po_allocated_units;
CREATE OR REPLACE VIEW inventory_smart.sku_po_allocated_units
AS WITH allocation AS (
         SELECT y.article,
            y.dc_code,
            y.pack_type_id,
            y.channel,
            y.pack_type_id AS size,
            y.updated_at,
            sum(y.allocated_qty) AS quantity
           FROM ( SELECT x.article,
                    x.dc_code,
                    x.channel,
                    x.store_code,
                    x.updated_at,
                    unnest(replace(replace(x.inventory_data::jsonb ->> 'packs_allocated'::text, '['::text, '{'::text), ']'::text, '}'::text)::text[]) AS pack_type_id,
                    unnest(replace(replace(x.inventory_data::jsonb ->> 'packs_allocated_qty'::text, '['::text, '{'::text), ']'::text, '}'::text)::double precision[]) AS allocated_qty
                   FROM ( SELECT carfs.article,
                            saf.channel,
                            saf.store_code,
                            js.items AS dc_code,
                            js.value AS inventory_data,
                            max(carfs.updated_at) AS updated_at
                           FROM inventory_smart.create_allocation_result_flat_gurobi carfs
                             CROSS JOIN LATERAL jsonb_each_text(carfs.pack_dc_allocation) js(items, value)
                             JOIN global.store_attributes_filter saf ON saf.store_code::text = carfs.store::text
                             JOIN inventory_smart.plan_master pm ON carfs.allocation_code::text = pm.plan_code::text
                          WHERE date((carfs.created_at AT TIME ZONE 'EST'::text)) = (now() AT TIME ZONE 'EST'::text)::date AND (pm.status = ANY (ARRAY[2, 3])) AND pm.is_deleted = false AND carfs.source::text = 'po'::text
                          GROUP BY carfs.article, saf.channel, saf.store_code, js.items, js.value) x) y
          GROUP BY y.article, y.dc_code, y.pack_type_id, y.channel, y.updated_at
        ), packs AS (
         SELECT dpc.article,
            allocation.dc_code,
            dpc.pack_type_id,
            allocation.channel,
            dpc.size,
            dpc.product_code,
            allocation.updated_at,
            allocation.quantity * dpc.units_in_pack::double precision AS quantity,
            allocation.quantity AS packs_allocated
           FROM inventory_smart.dc_pack_configuration dpc
             JOIN allocation USING (article, pack_type_id)
        )
 SELECT allocation.article,
    allocation.dc_code,
    allocation.pack_type_id,
    allocation.channel,
    allocation.size,
    pmf.product_code,
    allocation.quantity,
    allocation.quantity AS eaches_allocated,
    0 AS packs_allocated,
    allocation.updated_at
   FROM allocation
     JOIN global.product_attributes_filter pmf USING (size, article)
  WHERE NOT (allocation.pack_type_id IN ( SELECT packs.pack_type_id
           FROM packs))
UNION
 SELECT packs.article,
    packs.dc_code,
    packs.pack_type_id,
    packs.channel,
    packs.size,
    packs.product_code,
    packs.quantity,
    0 AS eaches_allocated,
    packs.packs_allocated,
    packs.updated_at
   FROM packs;