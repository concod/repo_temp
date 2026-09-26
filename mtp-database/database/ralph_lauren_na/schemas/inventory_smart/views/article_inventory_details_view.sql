--liquibase formatted sql
--changeset surya.kuruvadi:article_inventory_details_view runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:article_inventory_details_view,MTP-111890
--comment: initial changeset for article inventory details for dc availability report, removed unnecessary columns, added current_available_quantity,MTP-111890,add quantity for rls
--rollback: SELECT 1
DROP VIEW IF EXISTS inventory_smart.article_inventory_details_view;
CREATE OR REPLACE VIEW inventory_smart.article_inventory_details_view AS WITH available_base as (
        SELECT paf.article,
            paf.size,
            dc.dc_code,
            saf.channel,
            sum(coalesce(delta.oh, 0)) as oh,
	        sum(coalesce(delta.it, 0)) as it,
	        sum(coalesce(delta.oo, 0)) as oo
        FROM inventory_smart.latest_inventory_delta delta
            JOIN global.product_attributes_filter paf ON delta.product_code::bigint = paf.product_code::bigint
            JOIN global.distribution_centres dc ON delta.store_code::integer = dc.name::integer
            JOIN global.store_attributes_filter saf ON delta.store_code::integer = saf.retail_facility_code::integer
        group by 1,2,3,4
        UNION ALL
        SELECT paf.article,
            paf.size,
            dc.dc_code,
            li.channel,
            sum(coalesce(li.oh, 0)) as oh,
	        sum(coalesce(li.it, 0)) as it,
	        sum(coalesce(li.oo, 0)) as oo
        FROM inventory_smart.latest_inventory li
            JOIN global.distribution_centres dc ON li.store_code::integer = dc.linked_store_code::integer
            JOIN global.product_attributes_filter paf USING (product_code)
        WHERE  NOT EXISTS (
                SELECT 1
                FROM inventory_smart.latest_inventory_delta delta
                    JOIN global.distribution_centres dc_1 ON dc_1.name::integer = delta.store_code::integer
                WHERE delta.product_code::bigint = li.product_code::bigint
                    AND dc_1.linked_store_code::text = li.store_code::text
            )
        group by 1,2,3,4
       
    ),
    available_details as (
        select article,
            size,
            dc_code,
            channel,
            oh,
            it,
            oo,
            oh + it + oo as quantity
        from available_base
    ),
    allocation_base AS (
        SELECT carfs.allocation_code,
            carfs.article,
            saf.channel,
            saf.store_code,
            js.items AS dc_code,
            js.value AS inventory_data,
            MAX(carfs.updated_at) AS updated_at,
            CASE WHEN carfs.created_at >= (CURRENT_DATE::timestamp without time zone - '23:59:00'::interval)
                AND carfs.created_at <= (CURRENT_DATE::timestamp without time zone + '23:59:00'::interval)
                AND (
                    DATE(pm.updated_at AT TIME ZONE 'US/Eastern') = (now() AT TIME ZONE 'US/Eastern')::date
                    OR (saf.channel = 'RLS' AND (pm.updated_at AT TIME ZONE 'US/Eastern') > ((now() AT TIME ZONE 'US/Eastern') - '02:00:00'::interval))
                    OR saf.channel = 'PFS'
                )
            THEN true ELSE false END AS passes_time_filter
        FROM inventory_smart.create_allocation_result_flat_gurobi carfs
            CROSS JOIN LATERAL jsonb_each_text(carfs.pack_dc_allocation) js(items, value)
            JOIN global.store_attributes_filter saf ON saf.store_code::text = carfs.store::text
            JOIN inventory_smart.plan_master pm ON carfs.allocation_code::text = pm.plan_code::text
        WHERE pm.status IN (2, 3)
            AND pm.is_deleted = false
            AND carfs.inventory_source = 'dc'
            AND EXISTS (
                SELECT 1
                FROM inventory_smart.plan_attributes pa
                WHERE pa.plan_code = pm.plan_code::text
                    AND pa.attribute_name = 'parent_allocation'
            )
        GROUP BY carfs.allocation_code,
            carfs.article,
            saf.channel,
            saf.store_code,
            js.items,
            js.value,
            carfs.created_at,
            pm.updated_at
    ),
    allocated_details as (
        SELECT article,
            dc_code::integer AS dc_code,
            pack_type_id,
            channel,
            pack_type_id AS size,
            SUM(CASE WHEN passes_time_filter THEN allocated_qty ELSE 0 END) AS quantity,
            SUM(allocated_qty) AS quantity_all
        FROM (
                SELECT allocation_code,
                    article,
                    dc_code,
                    channel,
                    store_code,
                    updated_at,
                    passes_time_filter,
                    unnest(
                        replace(
                            replace(
                                inventory_data::jsonb->>'packs_allocated',
                                '[',
                                '{'
                            ),
                            ']',
                            '}'
                        )::text []
                    ) AS pack_type_id,
                    unnest(
                        replace(
                            replace(
                                inventory_data::jsonb->>'packs_allocated_qty',
                                '[',
                                '{'
                            ),
                            ']',
                            '}'
                        )::double precision []
                    ) AS allocated_qty
                FROM allocation_base
            ) y
        GROUP BY article,
            dc_code::integer,
            pack_type_id,
            channel
    ),
    reserved_details as (
        select paf.article,
            --drq.pack_type_id as size,
            paf.size,
            drq.channel,
            drq.dc_code,
            SUM(drq.quantity) as total_quantity,
            SUM(CASE 
                WHEN drq.channel::text = 'RLS'::text 
                    AND drq.created_at > (now() - '02:00:00'::interval) THEN drq.quantity 
                ELSE 0 
            END) as last_2hr_quantity
        from inventory_smart.dc_reserve_quantity drq
            left join "global".product_attributes_filter paf on drq.product_code = paf.product_code
        WHERE (drq.channel::text = 'RLS'::text OR drq.channel::text = 'PFS'::text)
            GROUP BY paf.article, 
            --drq.pack_type_id, 
            paf.size,
            drq.channel,
            drq.dc_code
    )
select COALESCE(
        available_details.article,
        allocated_details.article,
        reserved_details.article
    ) as article,
    COALESCE(
        available_details.size,
        allocated_details.size,
        reserved_details.size
    ) as size,
    COALESCE(
        available_details.dc_code,
        allocated_details.dc_code,
        reserved_details.dc_code
    ) as dc_code,
    COALESCE(
        available_details.channel,
        allocated_details.channel,
        reserved_details.channel
    ) as channel,
    COALESCE(available_details.quantity, 0::numeric)::double precision - COALESCE(allocated_details.quantity, 0::double precision) - COALESCE(reserved_details.last_2hr_quantity, 0)::double precision AS current_available_quantity,
    COALESCE(available_details.quantity, 0) as available_quantity,
    COALESCE(allocated_details.quantity_all, 0) as allocated_quantity,
    COALESCE(reserved_details.total_quantity, 0) AS reserved_quantity
from available_details
    full join allocated_details on available_details.article = allocated_details.article
    and available_details.size = allocated_details.size
    and available_details.dc_code = allocated_details.dc_code
    full join reserved_details on available_details.article = reserved_details.article
    and available_details.size = reserved_details.size
    and available_details.dc_code = reserved_details.dc_code;