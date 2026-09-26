--liquibase formatted sql
--changeset shreyan.haldankar:sync_change runOnChange:true stripComments:false splitStatements:false context:MTP-64814 labels:MTP-65913
--comment: MTP-65913 exclude 15 min feed for PFS channel
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
           FROM ( SELECT x.allocation_code,
                    x.article,
                    x.dc_code,
                    x.channel,
                    x.store_code,
                    x.updated_at,
                    unnest(replace(replace(x.inventory_data::jsonb ->> 'packs_allocated'::text, '['::text, '{'::text), ']'::text, '}'::text)::text[]) AS pack_type_id,
                    unnest(replace(replace(x.inventory_data::jsonb ->> 'packs_allocated_qty'::text, '['::text, '{'::text), ']'::text, '}'::text)::double precision[]) AS allocated_qty
                  FROM (
                     select
                        carfs.allocation_code,
                        carfs.article,
                        saf.channel,
                        saf.store_code,
                        js.items as dc_code,
                        js.value as inventory_data,
                        max(carfs.updated_at) as updated_at
                     from
                        inventory_smart.create_allocation_result_flat_gurobi carfs
                     cross join lateral jsonb_each_text(carfs.pack_dc_allocation) js(items,value)
                     join global.store_attributes_filter saf on
                        saf.store_code::text = carfs.store::text
                     join inventory_smart.plan_master pm on
                        carfs.allocation_code::text = pm.plan_code::text
                     where
                        carfs.created_at >= (CURRENT_DATE::timestamp without time zone - '23:59:00'::interval)
                        and carfs.created_at <= (CURRENT_DATE::timestamp without time zone + '23:59:00'::interval)
                        and (pm.status = any (array[2,3]))
                        and pm.is_deleted = false
                        and carfs.inventory_source::text = 'dc'::text
                        and (
                              (
                                 saf.forecasting_channel = 'RLE'
                                 and date((pm.updated_at at TIME zone 'EST'::text)) = (now() at TIME zone 'EST'::text)::date
                              )
                              or 
                              (
                                 saf.channel = 'RLS'
                                 and saf.forecasting_channel <> 'RLE'
                                 and (pm.updated_at at TIME zone 'EST'::text) > ((now() at TIME zone 'EST'::text) - '02:00:00'::interval))
                                 or saf.channel='PFS'
                              )
                        and (exists (
                        select
                           1
                        from
                           inventory_smart.plan_attributes
                        where
                           plan_attributes.plan_code = pm.plan_code::text
                           and plan_attributes.attribute_name::text = 'parent_allocation'::text))
                     group by
                        carfs.allocation_code,
                        carfs.article,
                        saf.channel,
                        saf.store_code,
                        js.items,
                        js.value
                  ) x
                  ) y
            GROUP BY y.allocation_code, y.article, (y.dc_code::integer), y.pack_type_id, y.channel, y.updated_at
        ),packs AS (
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
             JOIN allocation USING (article, pack_type_id)
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
  WHERE NOT ((allocation.allocation_code::text, allocation.pack_type_id) IN ( SELECT packs.allocation_code,
            packs.pack_type_id
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