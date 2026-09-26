-- liquibase formatted sql
-- changeset liquibase:sku_po_allocated_units_logic_fix runOnChange:true stripComments:false splitStatements:false context:MTP-76183 labels:MTP-76183-allocated units fix
-- comment: sku_po_allocated_units_logic_fix

DROP VIEW IF EXISTS inventory_smart.sku_po_allocated_units;
CREATE OR REPLACE VIEW inventory_smart.sku_po_allocated_units
AS WITH allocation AS (
         SELECT 
            y.allocation_code,
            y.article,
            y.dc_code,
            y.pack_type_id,
            y.channel,
            y.retail_size_cd AS size,
            y.updated_at,
            sum(y.allocated_qty) AS quantity
           FROM ( SELECT x.allocation_code,
                    x.article,
                    x.retail_size_cd,
                    x.dc_code,
                    x.channel,
                    x.store_code,
                    x.updated_at,
                    unnest(replace(replace(x.inventory_data::jsonb ->> 'packs_allocated'::text, '['::text, '{'::text), ']'::text, '}'::text)::text[]) AS pack_type_id,
                    unnest(replace(replace(x.inventory_data::jsonb ->> 'packs_allocated_qty'::text, '['::text, '{'::text), ']'::text, '}'::text)::double precision[]) AS allocated_qty
                   FROM ( 
                        SELECT 
                            carfs.allocation_code,
                            carfs.article,
                            carfs.retail_size_cd,
                            saf.channel,
                            saf.store_code,
                            js.items AS dc_code,
                            js.value AS inventory_data,
                            max(carfs.updated_at) AS updated_at
                           FROM inventory_smart.create_allocation_result_flat_gurobi carfs
                             CROSS JOIN LATERAL jsonb_each_text(carfs.pack_dc_allocation) js(items, value)
                             JOIN global.store_attributes_filter saf ON saf.store_code::text = carfs.store::text
                             JOIN inventory_smart.plan_master pm ON carfs.allocation_code::text = pm.plan_code::text
                          WHERE (
                                (pm.status = 3 AND pm.created_at BETWEEN 
                                    (date(now() AT TIME ZONE 'America/New_York')::timestamp AT TIME ZONE 'America/New_York') AND 
                                    (date(now() AT TIME ZONE 'America/New_York')::timestamp AT TIME ZONE 'America/New_York' + '23:59:59'::interval)
                                ) OR 
                                (pm.status = 2 AND pm.created_at BETWEEN 
                                    (date(now() AT TIME ZONE 'America/New_York')::timestamp AT TIME ZONE 'America/New_York' - INTERVAL '14 days') AND
                                    (date(now() AT TIME ZONE 'America/New_York')::timestamp AT TIME ZONE 'America/New_York' + '23:59:59'::interval)
                                )
                          )
                          AND pm.is_deleted = false AND carfs.source::text = 'po'::text
                          GROUP BY carfs.allocation_code, carfs.article, carfs.retail_size_cd, saf.channel, saf.store_code, js.items, js.value
                          ) x
                    GROUP BY allocation_code, article, retail_size_cd, dc_code, channel, store_code, updated_at, pack_type_id, allocated_qty
                ) y
          GROUP BY y.allocation_code, y.article, y.retail_size_cd, y.dc_code, y.pack_type_id, y.channel, y.updated_at
        ), packs AS (
         SELECT allocation.allocation_code,
            dpc.article,
            allocation.dc_code,
            dpc.pack_type_id,
            allocation.channel,
            dpc.size,
            allocation.updated_at,
            allocation.quantity * dpc.units_in_pack::double precision AS quantity,
            allocation.quantity AS packs_allocated
           FROM inventory_smart.dc_pack_configuration dpc
           JOIN allocation USING (article, pack_type_id,size)
           WHERE dpc.pack_type='packs'
        )
 SELECT allocation.allocation_code,
    allocation.article,
    allocation.dc_code,
    allocation.pack_type_id,
    allocation.channel,
    allocation.size,
    allocation.quantity,
    allocation.quantity AS eaches_allocated,
    0 AS packs_allocated,
    allocation.updated_at
   FROM allocation
   JOIN inventory_smart.dc_pack_configuration dpc USING (article, pack_type_id, size)
   WHERE NOT (allocation.pack_type_id IN ( SELECT packs.pack_type_id
           FROM packs))
UNION
 SELECT packs.allocation_code,
    packs.article,
    packs.dc_code,
    packs.pack_type_id,
    packs.channel,
    packs.size,
    packs.quantity,
    0 AS eaches_allocated,
    packs.packs_allocated,
    packs.updated_at
   FROM packs;