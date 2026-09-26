--liquibase formatted sql
--changeset adesh:get_auto_allocation_summary runOnChange:true stripComments:false splitStatements:false context:MTP-97949 labels:MTP-97949
--comment: MTP-119046 - Add function to get auto allocation summary
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.get_auto_allocation_summary();

CREATE OR REPLACE FUNCTION inventory_smart.get_auto_allocation_summary()
RETURNS TABLE (
    "Buyer" VARCHAR(255),
    "Department" VARCHAR(255),
    "# of Master SKUs" BIGINT,
    "# of Auto Allocations" BIGINT,
    "Total Allocated Inv" BIGINT,
    "Post Allocation Inv" BIGINT,
    "DC ATA" BIGINT
) LANGUAGE plpgsql
AS $function$
DECLARE
    v_gen_random_uuid text := gen_random_uuid()::varchar;
BEGIN
    RETURN QUERY
    WITH pm AS (
        SELECT
            plan_code,
            CASE
                WHEN status = 1 THEN 'Created'
                WHEN status = 2 THEN 'Batched'
                WHEN status = 3 THEN 'Finalized'
                ELSE NULL
            END AS status_aa_ob
        FROM inventory_smart.plan_master
        WHERE CAST(TO_CHAR(created_at AT TIME ZONE 'America/Chicago', 'YYYY-MM-DD') AS DATE)
                  = CURRENT_DATE 
          AND type = 2
          AND NOT is_deleted
    ),

    raw_alloc AS (
        SELECT
            A.allocation_code,
            A.article,
            A.retail_size_cd,
            A.store,
            A.original_forecast,
            A.pack_dc_allocation,
            A.inventory_source,
            A.created_at,
            A.oh,
            A.it,
            A.oo,
            A.allocated_total
        FROM inventory_smart.create_allocation_result_flat_gurobi A
        WHERE allocation_code IN (
            SELECT DISTINCT plan_code FROM pm
        )
          AND allocated_total > 0
    ),

    product_filters AS (
        SELECT DISTINCT
            article,
            l2_name,
            l3_name,
            l4_name,
            product_description
        FROM global.product_attributes_filter A
        WHERE article IN (SELECT DISTINCT article FROM raw_alloc)
        GROUP BY
            article,
            l2_name,
            l3_name,
            l4_name,
            product_description
    ),

    filter_allocations AS (
        SELECT
            carfg.allocation_code,
            paf.l2_name AS buyer,
            paf.l3_name AS dept,
            paf.product_description,
            carfg.article,
            carfg.retail_size_cd AS size,
            carfg.store,
            carfg.original_forecast,
            carfg.pack_dc_allocation,
            carfg.allocated_total,
            carfg.oh,
            carfg.oo,
            carfg.it
        FROM raw_alloc AS carfg
        INNER JOIN product_filters paf
            ON paf.article = carfg.article
        INNER JOIN pm
            ON pm.plan_code = carfg.allocation_code
    ),

    allocation_base_pre AS (
        SELECT
            b.*,
            dc_code,
            pack_type_id,
            (pv.packs_available_qty #>> '{}')::INTEGER AS packs_available_qty
        FROM filter_allocations b
        CROSS JOIN LATERAL jsonb_each(COALESCE(b.pack_dc_allocation, '{}'::jsonb)) AS dc(dc_code, details)
        CROSS JOIN LATERAL jsonb_array_elements_text(details -> 'packs_allocated')
            WITH ORDINALITY AS pa(pack_type_id, idx)
        CROSS JOIN LATERAL jsonb_array_elements(details -> 'packs_available_qty')
            WITH ORDINALITY AS pv(packs_available_qty, idx3)
        WHERE pa.idx = pv.idx3
    ),

    allocation_base AS (
        SELECT
            a.*,
            a.packs_available_qty * COALESCE(b.units_in_pack, 1)::INTEGER AS available_qty
        FROM allocation_base_pre a
        JOIN inventory_smart.dc_pack_configuration b
            USING (article, pack_type_id, size)
    ),

    agg AS (
        SELECT
            a.buyer AS "Buyer",
            a.dept AS "Department",
            a.article AS "Master SKU",
            a.store AS "Store",
            a.product_description AS "Master SKU Description",
            a.allocation_code,
            SUM(a.allocated_total) AS "Allocated Qty",
            SUM(a.oh) + SUM(a.oo) + SUM(a.it) + SUM(a.allocated_total) AS "Post Allocation Inv",
            CAST(AVG(a.available_qty) AS INT) AS "DC ATA",
            CAST(TO_CHAR(NOW() AT TIME ZONE 'America/Chicago', 'YYYY-MM-DD') AS DATE) AS "Process Date"
        FROM allocation_base a
        LEFT JOIN pm c ON c.plan_code = a.allocation_code
        GROUP BY
            a.buyer,
            a.dept,
            a.article,
            a.store,
            a.product_description,
            a.allocation_code
    )

    SELECT 
        agg."Buyer"::VARCHAR(255),
        agg."Department"::VARCHAR(255),
        COUNT(DISTINCT agg."Master SKU") AS "# of Master SKUs",
        COUNT(DISTINCT agg.allocation_code) AS "# of Auto Allocations",
        SUM(agg."Allocated Qty")::BIGINT AS "Total Allocated Inv",
        SUM(agg."Post Allocation Inv")::BIGINT AS "Post Allocation Inv",
        SUM(agg."DC ATA")::BIGINT AS "DC ATA"
    FROM agg
    WHERE agg."Allocated Qty" > 0
    GROUP BY agg."Buyer", agg."Department";

    PERFORM global.sp_log(v_gen_random_uuid, 'inventory_smart.get_auto_allocation_summary', 'Before returning function value', 'Function completed successfully', jsonb_build_object('process_date', now() AT TIME ZONE 'America/Chicago'));
    RETURN;
END;
$function$;
