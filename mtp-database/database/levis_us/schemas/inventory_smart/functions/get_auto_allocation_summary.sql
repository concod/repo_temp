--liquibase formatted sql
--changeset himansh.bhardwaj:get_auto_allocation_summary_3 runOnChange:true stripComments:false splitStatements:false context:MTP-97949 labels:MTP-105875
--comment: adding_batch_number
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.get_auto_allocation_summary(INTEGER);

CREATE OR REPLACE FUNCTION inventory_smart.get_auto_allocation_summary(p_batch_number INTEGER)
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
    batch_number INTEGER,
    -- article_list_per_plan VARCHAR[],
    -- article_count_per_plan INTEGER,
    actual_allocated_article_list VARCHAR[],
    failed_article_list VARCHAR[],
    no_of_articles_failed INTEGER,
    no_of_allocation_plans_failed INTEGER,
    no_of_allocation_plans_successful INTEGER,
    no_of_articles_allocated INTEGER,
    allocated_qty INTEGER,
    forecast_demand_units INTEGER,
    available_qty INTEGER
) LANGUAGE plpgsql
AS $function$
DECLARE
    v_gen_random_uuid text := gen_random_uuid()::varchar;
    v_current_date_partition text := To_char(now() AT TIME ZONE 'America/Los_Angeles', 'YYYYMMDD');
    v_table_name text := 'inventory_smart.create_allocation_result_flat_gurobi_' || v_current_date_partition;
BEGIN
    -- Create temporary tables
    CREATE TEMP TABLE plan_master_as ON COMMIT DROP AS (
        SELECT
            plan_code,
            CASE
                WHEN type = 2 AND inventory_smart.plan_master.status = 1 THEN 'Auto'
                WHEN inventory_smart.plan_master.status = 2 THEN 'Batched'
                ELSE NULL
            END as status_aa_ob
        FROM inventory_smart.plan_master
        WHERE CAST(To_char(created_at AT TIME ZONE 'America/Los_Angeles', 'YYYY-MM-DD') AS DATE) =
              CAST(now() AT TIME ZONE 'America/Los_Angeles' AS DATE)
              AND type = 2
              AND NOT is_deleted
    );

    -- Create gurobi_table using dynamic SQL with current date partition
    EXECUTE format('
        CREATE TEMP TABLE gurobi_table ON COMMIT DROP AS (
            SELECT carfg.*, pm.status_aa_ob
            FROM %s AS carfg
            JOIN plan_master_as pm ON pm.plan_code = carfg.allocation_code
            WHERE CAST(To_char(created_at AT TIME ZONE ''America/Los_Angeles'', ''YYYY-MM-DD'') AS DATE) =
                  CAST(now() AT TIME ZONE ''America/Los_Angeles'' AS DATE)
        )', v_table_name);

    CREATE TEMP TABLE filter_allocations_as ON COMMIT DROP AS (
        SELECT
            carfg.allocation_code,
            carfg.article,
            carfg.style,
            carfg.retail_size_cd,
            carfg.status_aa_ob,
            SUM(carfg.allocated_total) as allocated_total,
            SUM(carfg.original_forecast) as original_forecast,
            AVG(carfg.inv_avai) as inv_avai
        FROM gurobi_table carfg
        GROUP BY 1, 2, 3, 4, 5
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
                b.l0_name,
                b.l1_name,
                b.l2_name,
                a.status_aa_ob as status,
                a.article,
                c.batch_number,
                SUM(a.allocated_total) as allocated_total,
                SUM(a.original_forecast) as original_forecast,
                SUM(a.inv_avai) as inv_avai
            FROM filter_allocations_as a
            LEFT JOIN product_filters_as b USING(article)
            JOIN (
                SELECT
                    aai.l0_name,
                    aai.l1_name,
                    aai.l2_name,
                    aai.allocation_code,
                    aai.article_count_per_row,
                    aai.article_list,
                    aai.batch_number,
                    unnest(aai.article_list) as article
                FROM inventory_smart.auto_allocation_input aai
                WHERE aai.batch_number = p_batch_number
            ) c ON a.article = c.article
            WHERE c.article IN (
                SELECT DISTINCT article
                FROM gurobi_table
            )
            GROUP BY 1, 2, 3, 4, 5, 6, 7
    );

    CREATE TEMP TABLE failed_allocations_as ON COMMIT DROP AS (
        SELECT
            a.l0_name,
            a.l1_name,
            a.l2_name,
            'Failed' as status,
            a.allocation_code,
            a.article,
            a.batch_number
        FROM (
            SELECT
                aai.l0_name,
                aai.l1_name,
                aai.l2_name,
                aai.allocation_code,
                aai.article_count_per_row,
                aai.article_list,
                aai.batch_number,
                unnest(aai.article_list) as article
            FROM inventory_smart.auto_allocation_input aai
            WHERE aai.batch_number = p_batch_number
        ) a
        WHERE a.article NOT IN (
            SELECT DISTINCT article
            FROM gurobi_table
        )
        GROUP BY 1, 2, 3, 4, 5, 6, 7
    );

    -- Return the final result
    RETURN QUERY
    WITH final_data AS (
        SELECT
            (now() AT TIME ZONE 'America/Los_Angeles')::TIMESTAMPTZ as process_date,
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
            CAST(NULL AS VARCHAR(255)) as l3_name,
            CAST(NULL AS VARCHAR(255)) as l4_name,
            CAST(NULL AS VARCHAR(255)) as l5_name,
            COALESCE(a.batch_number,b.batch_number) as batch_number,
            -- CAST(coalesce(a.article_list, b.article_list) AS VARCHAR[]) as article_list_per_plan,
            -- CAST(coalesce(a.article_count_per_row, b.article_count_per_row) AS INTEGER) as article_count_per_plan,
            CAST(ARRAY_AGG(a.article) AS VARCHAR[]) as actual_allocated_article_list,
            CAST(ARRAY_AGG(b.article) AS VARCHAR[]) as failed_article_list,
            CAST(COUNT(DISTINCT CASE WHEN b.allocation_code IS NOT NULL THEN b.article END) AS INTEGER) as no_of_articles_failed,
            CAST(COUNT(DISTINCT CASE WHEN b.allocation_code IS NOT NULL THEN b.allocation_code END) AS INTEGER) as no_of_allocation_plans_failed,
            CAST(COUNT(DISTINCT CASE WHEN a.allocation_code IS NOT NULL THEN a.allocation_code END) AS INTEGER) as no_of_allocation_plans_successful,
            CAST(COUNT(DISTINCT CASE WHEN a.allocation_code IS NOT NULL THEN a.article END) AS INTEGER) as no_of_articles_allocated,
            CAST(SUM(CASE WHEN a.allocation_code IS NOT NULL THEN a.allocated_total ELSE 0 END) AS INTEGER) as allocated_qty,
            CAST(SUM(CASE WHEN a.allocation_code IS NOT NULL THEN a.original_forecast ELSE 0 END) AS INTEGER) as forecast_demand_units,
            CAST(SUM(a.inv_avai) AS INTEGER) as available_qty
        FROM allocation_base_as a
        FULL OUTER JOIN failed_allocations_as b ON a.allocation_code = b.allocation_code
        GROUP BY 1, 2, 3, 4, 5, 6, 7, 8, 9, 10
    )
    SELECT * FROM final_data;
    perform  global.sp_log(v_gen_random_uuid, 'inventory_smart.get_auto_allocation_summary', 'Before returning function value', 'Function completed successfully', jsonb_build_object('process_date', now() AT TIME ZONE 'America/Los_Angeles'));
    return;
END;
$function$;

