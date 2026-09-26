--liquibase formatted sql
--changeset aman.lakkoju:get_auto_allocation_summary_po_change runOnChange:true stripComments:false splitStatements:false context:MTP-97949 labels:MTP-97949
--comment: get_auto_allocation_summary_po_change
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.get_auto_allocation_summary();

CREATE OR REPLACE FUNCTION inventory_smart.get_auto_allocation_summary()
RETURNS TABLE (
    process_date TIMESTAMP WITH TIME ZONE,
    day VARCHAR(10),
    l0_name VARCHAR(255),
    l1_name VARCHAR(255),
    status VARCHAR(50),
    l2_name VARCHAR(255),
    l3_name VARCHAR(255),
    l4_name VARCHAR(255),
    l5_name VARCHAR(255),
    style_list_per_plan VARCHAR[],
    style_count_per_plan INTEGER,
    actual_allocated_style_list VARCHAR[],
    failed_style_list VARCHAR[],
    no_of_articles_failed INTEGER,
    no_of_allocation_plans_failed INTEGER,
    no_of_allocation_plans_successful INTEGER,
    no_of_articles_allocated INTEGER,
    allocated_qty INTEGER,
    forecast_demand_units INTEGER,
    available_qty INTEGER,
    inventory_source VARCHAR(50)
) LANGUAGE plpgsql
AS $function$
DECLARE
    v_gen_random_uuid text := gen_random_uuid()::varchar;
BEGIN
    -- Create temporary tables
    CREATE TEMP TABLE plan_master_as ON COMMIT DROP AS (
        SELECT
            plan_code,
            CASE
                WHEN type in (2,12) AND inventory_smart.plan_master.status = 1 THEN 'Auto'
                WHEN inventory_smart.plan_master.status = 2 THEN 'Batched'
                ELSE NULL
            END as status_aa_ob,type
        FROM inventory_smart.plan_master
        WHERE CAST(To_char(created_at AT TIME ZONE 'America/New_York', 'YYYY-MM-DD') AS DATE) =
              CAST(now() AT TIME ZONE 'America/New_York' AS DATE)
              AND type in (2,12)
              AND NOT is_deleted
    );

    CREATE TEMP TABLE gurobi_table ON COMMIT DROP AS (
        SELECT carfg.*, pm.status_aa_ob,pm.type
        FROM inventory_smart.create_allocation_result_flat_gurobi AS carfg
        JOIN plan_master_as pm ON pm.plan_code = carfg.allocation_code
        WHERE CAST(To_char(created_at AT TIME ZONE 'America/New_York', 'YYYY-MM-DD') AS DATE) =
              CAST(now() AT TIME ZONE 'America/New_York' AS DATE)
    );

    CREATE TEMP TABLE filter_allocations_as ON COMMIT DROP AS (
        SELECT
            carfg.allocation_code,
            carfg.article,
            carfg.style,
            carfg.retail_size_cd,
            carfg.status_aa_ob,
            carfg.type,
            SUM(carfg.allocated_total) as allocated_total,
            SUM(carfg.original_forecast) as original_forecast,
            AVG(carfg.inv_avai) as inv_avai
        FROM gurobi_table carfg
        GROUP BY 1, 2, 3, 4, 5,6
    );

    CREATE TEMP TABLE product_filters_as ON COMMIT DROP AS (
        SELECT DISTINCT
            b.article,
            b.l0_name,
            b.l1_name,
            b.l2_name,
            b.l3_name,
            b.l4_name,
            b.l5_name
        FROM global.product_attributes_filter b
        WHERE EXISTS (
            SELECT 1
            FROM filter_allocations_as a
            WHERE a.article = b.article
        )
    );

    CREATE TEMP TABLE allocation_base_as ON COMMIT DROP AS (
        SELECT
            a.allocation_code,
            c.style_list,
            b.l0_name,
            b.l1_name,
            b.l2_name,
            b.l3_name,
            b.l4_name,
            b.l5_name,
            a.status_aa_ob as status,
            case when a.type = 2 then 'dc' when a.type = 12 then 'po' end as inventory_source,
            c.style_count_per_row,
            array_agg(DISTINCT a.style) as _allocated_style_list,
            COUNT(DISTINCT a.style) styles_allocated,
            SUM(a.allocated_total) as allocated_total,
            SUM(a.original_forecast) as original_forecast,
            SUM(a.inv_avai) as inv_avai
        FROM filter_allocations_as a
        LEFT JOIN product_filters_as b USING(article)
        LEFT JOIN (
            SELECT
                country l0_name,
                channel l1_name,
                brand l2_name,
                sbu l3_name,
                department l4_name,
                collection_total l5_name,
                allocation_code,
                style_count_per_row,
                style_list,
                unnest(style_list) style
            FROM inventory_smart.auto_allocation_input
        ) c ON a.article = concat(c.style, '-', c.l0_name, '-', c.l1_name)
        WHERE concat(c.style, '-', c.l0_name, '-', c.l1_name) IN (
            SELECT DISTINCT article
            FROM gurobi_table
        )
        GROUP BY 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11
    );

    CREATE TEMP TABLE failed_allocations_as ON COMMIT DROP AS (
        SELECT
            a.l0_name,
            a.l1_name,
            a.l2_name,
            a.l3_name,
            a.l4_name,
            a.l5_name,
            'Failed' as status,
            a.allocation_code,
            a.style_list,
            a.style_count_per_row,
            a.inventory_source,
            array_agg(a.style) as _failed_style_list,
            COUNT(DISTINCT a.style) as failed_styles
        FROM (
            SELECT
                country l0_name,
                channel l1_name,
                brand l2_name,
                sbu l3_name,
                department l4_name,
                collection_total l5_name,
                allocation_code,
                style_count_per_row,
                style_list,
                allocation_type as inventory_source,
                unnest(style_list) style
            FROM inventory_smart.auto_allocation_input
        ) a
        WHERE concat(a.style, '-', a.l0_name, '-', a.l1_name) NOT IN (
            SELECT DISTINCT article
            FROM gurobi_table
        )
        GROUP BY 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11
    );

    -- Return the final result
    RETURN QUERY
    WITH final_data AS (
        SELECT
            (now() AT TIME ZONE 'America/New_York')::TIMESTAMPTZ as process_date,
            CAST('Today' AS VARCHAR(10)) as day,
            coalesce(a.l0_name, b.l0_name) as l0_name,
            coalesce(a.l1_name, b.l1_name) as l1_name,
            CAST(CASE
                WHEN a.status IS NOT NULL AND b.status IS NULL THEN a.status
                WHEN a.status IS NOT NULL AND b.status IS NOT NULL THEN a.status
                WHEN a.status IS NULL AND b.status IS NOT NULL THEN 'Failed'
                ELSE NULL
            END AS VARCHAR(50)) as status,
            coalesce(a.l2_name, b.l2_name) as l2_name,
            coalesce(a.l3_name, b.l3_name) as l3_name,
            coalesce(a.l4_name, b.l4_name) as l4_name,
            coalesce(a.l5_name, b.l5_name) as l5_name,
            CAST(coalesce(a.style_list, b.style_list) AS VARCHAR[]) as style_list_per_plan,
            CAST(coalesce(a.style_count_per_row, b.style_count_per_row) AS INTEGER) as style_count_per_plan,
            _allocated_style_list as actual_allocated_style_list,
            _failed_style_list as failed_style_list,
            CAST(SUM(CASE WHEN b.allocation_code IS NOT NULL THEN b.failed_styles END) AS INTEGER) as no_of_articles_failed,
            CAST(COUNT(DISTINCT CASE WHEN b.allocation_code IS NOT NULL THEN b.allocation_code END) AS INTEGER) as no_of_allocation_plans_failed,
            CAST(COUNT(DISTINCT CASE WHEN a.allocation_code IS NOT NULL THEN a.allocation_code END) AS INTEGER) as no_of_allocation_plans_successful,
            CAST(SUM(DISTINCT CASE WHEN a.allocation_code IS NOT NULL THEN a.styles_allocated END) AS INTEGER) as no_of_articles_allocated,
            CAST(SUM(CASE WHEN a.allocation_code IS NOT NULL THEN a.allocated_total ELSE 0 END) AS INTEGER) as allocated_qty,
            CAST(SUM(CASE WHEN a.allocation_code IS NOT NULL THEN a.original_forecast ELSE 0 END) AS INTEGER) as forecast_demand_units,
            CAST(SUM(a.inv_avai) AS INTEGER) as available_qty,
            CAST(coalesce(a.inventory_source, b.inventory_source) AS VARCHAR) as inventory_source
        FROM allocation_base_as a
        FULL OUTER JOIN failed_allocations_as b ON a.allocation_code = b.allocation_code
        GROUP BY 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 21
    )
    SELECT * FROM final_data;
    perform  global.sp_log(v_gen_random_uuid, 'inventory_smart.get_auto_allocation_summary', 'Before returning function value', 'Function completed successfully', jsonb_build_object('process_date', now() AT TIME ZONE 'America/New_York'));
    return;
END;
$function$;

