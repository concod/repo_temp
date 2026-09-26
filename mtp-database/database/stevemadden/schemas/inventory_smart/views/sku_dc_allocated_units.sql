--liquibase formatted sql
--changeset liquibase:sku_dc_allocated_units runOnChange:true stripComments:false splitStatements:false context:MTP-20089 labels:liquibase_project_start
--comment: MTP-20089
--rollback: SELECT 1
DROP VIEW IF EXISTS inventory_smart.sku_dc_allocated_units;
CREATE OR REPLACE VIEW inventory_smart.sku_dc_allocated_units
AS
WITH allocation AS (
   SELECT y.allocation_code,
          y.article,
          y.dc_code::integer AS dc_code,
          y.pack_type_id,
          y.channel,
          y.pack_type_id AS size,
          y.updated_at,
          SUM(y.allocated_qty) AS quantity
   FROM (
      SELECT x.allocation_code,
             x.article,
             x.dc_code,
             x.channel,
             x.store_code,
             x.updated_at,
             unnest(replace(replace(x.inventory_data::jsonb ->> 'packs_allocated'::text, '['::text, '{'::text), ']'::text, '}'::text)::text[]) AS pack_type_id,
             unnest(replace(replace(x.inventory_data::jsonb ->> 'packs_allocated_qty'::text, '['::text, '{'::text), ']'::text, '}'::text)::double precision[]) AS allocated_qty
      FROM (
         SELECT carfs.allocation_code,
                carfs.article,
                saf.channel,
                saf.store_code,
                js.items AS dc_code,
                js.value AS inventory_data,
                max(carfs.updated_at) AS updated_at
         FROM inventory_smart.create_allocation_result_flat_gurobi carfs
         CROSS JOIN LATERAL jsonb_each_text(carfs.pack_dc_allocation) js(items, value)
         JOIN global.store_attributes_filter saf ON saf.store_code::text = carfs.store::text
         JOIN inventory_smart.plan_master pm ON carfs.allocation_code::text = pm.plan_code::text
         WHERE date((carfs.created_at AT TIME ZONE 'EST'::text)) = (now() AT TIME ZONE 'EST'::text)::date AND (pm.status = ANY (ARRAY[2, 3])) AND pm.is_deleted = false AND carfs.source::text = 'dc'::text
         GROUP BY carfs.allocation_code, carfs.article, saf.channel, saf.store_code, js.items, js.value
      ) x
   ) y
   GROUP BY y.allocation_code, y.article, (y.dc_code::integer), y.pack_type_id, y.channel, y.updated_at
)
,packs AS (
   SELECT allocation.allocation_code,
          dpc.article,
          allocation.dc_code,
          dpc.pack_type_id,
          allocation.channel,
          dpc.size,
          allocation.updated_at,
          allocation.quantity * dpc.units_in_pack::double precision AS quantity,
          allocation.quantity packs_allocated
   FROM inventory_smart.dc_pack_configuration dpc
   JOIN allocation USING (article, pack_type_id)
)
SELECT 
       allocation.allocation_code,
       allocation.article,
       allocation.dc_code,
       allocation.pack_type_id,
       allocation.channel,
       allocation.size,
       allocation.quantity,
       allocation.quantity as eaches_allocated,
       0 as packs_allocated,
       allocation.updated_at
FROM allocation
WHERE NOT ((allocation.allocation_code, allocation.pack_type_id) IN ( SELECT packs.allocation_code, packs.pack_type_id FROM packs))
UNION
SELECT packs.allocation_code,
       packs.article,
       packs.dc_code,
       packs.pack_type_id,
       packs.channel,
       packs.size,
       packs.quantity,
       0 as eaches_allocated,
       packs_allocated,
       packs.updated_at
FROM packs;