--liquibase formatted sql
--changeset kamuju.mahaveer:sku_dc_allocated_units_v2 runOnChange:true stripComments:false splitStatements:false context:VS-160 labels:VS-260
--comment: Updated Views for VS
--rollback: SELECT 1
DROP VIEW IF EXISTS inventory_smart.sku_dc_allocated_units;
CREATE OR REPLACE VIEW inventory_smart.sku_dc_allocated_units
AS WITH allocation AS (
         SELECT y.allocation_code,
            y.article,
            y.dc_code::integer AS dc_code,
            y.pack_type_id,
            y.channel,
            y.pack_type_id AS size,
            y.updated_at,
            sum(y.allocated_qty) AS quantity
           FROM ( SELECT x.allocation_code,
                    x.article,
                    x.dc_code,
                    x.channel,
                    x.store_code,
                    x.updated_at,
                    unnest(replace(replace(x.inventory_data::jsonb ->> 'packs_allocated'::text, '['::text, '{'::text), ']'::text, '}'::text)::text[]) AS pack_type_id,
                    unnest(replace(replace(x.inventory_data::jsonb ->> 'packs_allocated_qty'::text, '['::text, '{'::text), ']'::text, '}'::text)::double precision[]) AS allocated_qty
                   FROM ( SELECT carfs.allocation_code,
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
                          WHERE (pm.status = ANY (ARRAY[2, 3])) AND pm.is_deleted = false AND carfs.inventory_source::text = 'dc'::text AND date((pm.created_at AT TIME ZONE 'America/New_York'::text)) = date((now() AT TIME ZONE 'America/New_York'::text)) AND carfs.created_at >= (date((now() AT TIME ZONE 'America/New_York'::text))::timestamp without time zone AT TIME ZONE 'America/New_York'::text) AND carfs.created_at <= ((date((now() AT TIME ZONE 'America/New_York'::text))::timestamp without time zone AT TIME ZONE 'America/New_York'::text) + '23:59:59'::interval)
                          GROUP BY carfs.allocation_code, carfs.article, saf.channel, saf.store_code, js.items, js.value) x) y
          GROUP BY y.allocation_code, y.article, (y.dc_code::integer), y.pack_type_id, y.channel, y.updated_at
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
   FROM allocation;