--liquibase formatted sql
--changeset mahaveer:get_auto_allocation_summary_v2 runOnChange:true stripComments:false splitStatements:false context:MTP-97949 labels:MTP-97949
--comment: MTP-97949 - Updated function to get auto allocation summary
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.get_auto_allocation_summary();

CREATE OR REPLACE FUNCTION inventory_smart.get_auto_allocation_summary()
RETURNS TABLE(completion_time text, brand character varying, choice_count integer)
LANGUAGE plpgsql
AS $function$
DECLARE
    v_gen_random_uuid text := gen_random_uuid()::varchar;
BEGIN
    -- Set timezone
    SET TIME ZONE 'America/New_York';

    -- Step 1: Today's plan_master
    CREATE TEMP TABLE temp_plan_master ON COMMIT DROP AS
    SELECT
        plan_code,
        CASE
            WHEN type = 2 AND status = 1 THEN 'Success - Non Finalised'
            WHEN status = 3 THEN 'Success - Finalized'
            ELSE NULL
        END AS status
    FROM inventory_smart.plan_master
    WHERE type = 2
      AND NOT is_deleted
      AND created_at >= timezone('America/New_York', date_trunc('day', now()))
      AND created_at < timezone('America/New_York', date_trunc('day', now()) + interval '1 day');

    CREATE INDEX idx_temp_plan_master_code ON temp_plan_master(plan_code);

    -- Step 2: Today's gurobi_table
    CREATE TEMP TABLE temp_gurobi_table ON COMMIT DROP AS
    SELECT
        carfg.article,
        carfg.allocation_code,
        pm.status
    FROM inventory_smart.create_allocation_result_flat_gurobi AS carfg
    JOIN temp_plan_master pm ON pm.plan_code = carfg.allocation_code
    WHERE carfg.created_at >= timezone('America/New_York', date_trunc('day', now()))
      AND carfg.created_at < timezone('America/New_York', date_trunc('day', now()) + interval '1 day')
    	and carfg.allocated_total > 0
    group by 1,2,3;

    CREATE INDEX idx_temp_gurobi_article ON temp_gurobi_table(article);

    -- Step 3: Failed allocations
    CREATE TEMP TABLE temp_failed_articles ON COMMIT DROP AS
    SELECT a.article
    FROM inventory_smart.auto_allocation_input AS iai
    CROSS JOIN UNNEST(iai.article_list) AS a(article)
    LEFT JOIN temp_gurobi_table g ON g.article = a.article
    WHERE g.article IS NULL
    GROUP BY a.article;

    CREATE INDEX idx_temp_failed_article ON temp_failed_articles(article);

    -- Step 4: Product filters
    CREATE TEMP TABLE temp_product_filters ON COMMIT DROP AS
    SELECT article, l0_name
    FROM global.product_attributes_filter
    GROUP BY article, l0_name;

    CREATE INDEX idx_temp_product_filters_article ON temp_product_filters(article);

    -- Step 5: Final aggregation and return
    RETURN QUERY
    SELECT 
        TO_CHAR(now(), 'YYYY-MM-DD HH24:MI:SS TZ') AS completion_time,
        paf.l0_name AS brand,
        SUM(base.choice_count)::int4 AS choice_count
    FROM (
        SELECT article, status, 1 AS choice_count
        FROM temp_gurobi_table

        UNION ALL

        SELECT article, 'Failed'::varchar(50) AS status, 1 AS choice_count
        FROM temp_failed_articles
    ) base
    JOIN temp_product_filters paf ON paf.article = base.article
    WHERE base.status <> 'Failed'
    GROUP BY paf.l0_name;

    -- Step 6: Logging
    PERFORM global.sp_log(
        v_gen_random_uuid,
        'inventory_smart.get_auto_allocation_summary',
        'Before returning function value',
        'Function completed successfully',
        jsonb_build_object(
            'completion_time', (now() at TIME zone 'America/New_York')::timestamp with time zone,
            'status', 'Success'::varchar(50),
            'choice_count', 0::integer
        )
    );

END;
$function$;
