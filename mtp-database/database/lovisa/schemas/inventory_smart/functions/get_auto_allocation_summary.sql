--liquibase formatted sql
--changeset swapnil.bhange:get_auto_allocation_summary_v9 runOnChange:true stripComments:false splitStatements:false context:MTP-1 labels:get_auto_allocation_summary_v9
--comment: get_auto_allocation_summary_v9
--rollback: SELECT 1


DROP FUNCTION IF EXISTS inventory_smart.get_auto_allocation_summary(INTEGER);

CREATE OR REPLACE FUNCTION inventory_smart.get_auto_allocation_summary(p_batch_number integer)
 RETURNS TABLE(process_date timestamp with time zone, day character varying, l0_name character varying, status character varying, range_name character varying, batch_number integer, actual_allocated_article_list character varying[], failed_article_list character varying[], no_of_articles_failed integer, no_of_allocation_plans_failed integer, no_of_allocation_plans_successful integer, no_of_articles_allocated integer, allocated_qty integer, forecast_demand_units integer, available_qty integer)
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_gen_random_uuid TEXT := gen_random_uuid()::varchar;
BEGIN
    ----------------------------------------------------------------------
    -- TEMP 1: PLAN MASTER
    ----------------------------------------------------------------------
    CREATE TEMP TABLE plan_master_as ON COMMIT DROP AS
    SELECT
        plan_code,
        CASE
            WHEN type = 2 AND plan_master.status = 1 THEN 'Auto'
            WHEN plan_master.status = 2 THEN 'Batched'
            ELSE NULL
        END AS status_aa_ob
    FROM inventory_smart.plan_master
    WHERE (created_at AT TIME ZONE 'Australia/Melbourne')::date = (now() AT TIME ZONE 'Australia/Melbourne')::date
      AND type = 2
      AND NOT is_deleted;

  	----------------------------------------------------------------------
	-- TEMP 2: GUROBI RESULT (FROM PARENT TABLE - NO PARTITIONS)
	----------------------------------------------------------------------
		CREATE TEMP TABLE gurobi_table ON COMMIT DROP AS
		SELECT
    		carfg.*,
    		pm.status_aa_ob
		FROM inventory_smart.create_allocation_result_flat_gurobi carfg
		JOIN plan_master_as pm
    		ON pm.plan_code = carfg.allocation_code
		WHERE (carfg.created_at AT TIME ZONE 'Australia/Melbourne')::date = (now() AT TIME ZONE 'Australia/Melbourne')::date;


    ----------------------------------------------------------------------
    -- TEMP 3: FILTERED ALLOCATIONS
    ----------------------------------------------------------------------
    CREATE TEMP TABLE filter_allocations_as ON COMMIT DROP AS
    SELECT
        allocation_code,
        article,
        status_aa_ob,
        SUM(allocated_total) AS allocated_total,
        SUM(original_forecast) AS original_forecast,
        AVG(inv_avai) AS inv_avai
    FROM gurobi_table
    GROUP BY 1, 2, 3;

    ----------------------------------------------------------------------
    -- TEMP 4: PRODUCT FILTERS
    ----------------------------------------------------------------------
    CREATE TEMP TABLE product_filters_as ON COMMIT DROP AS
    SELECT DISTINCT
        b.article,
        b.l0_name,
        b.l1_name,
        b.l2_name,
        b.l3_name,
        b.l4_name,
        b.range_name
    FROM global.product_attributes_filter b
    WHERE EXISTS (
        SELECT 1 FROM filter_allocations_as a WHERE a.article = b.article
    );

    ----------------------------------------------------------------------
    -- TEMP 5: SUCCESSFUL ALLOCATIONS
    ----------------------------------------------------------------------
    CREATE TEMP TABLE allocation_base_as ON COMMIT DROP AS
    SELECT
        a.allocation_code,
        b.l0_name,
        b.l1_name,
        b.l2_name,
        b.l3_name,
        b.range_name,
        a.status_aa_ob AS status,
        a.article,
        c.batch_number,
        SUM(a.allocated_total) AS allocated_total,
        SUM(a.original_forecast) AS original_forecast,
        SUM(a.inv_avai) AS inv_avai
    FROM filter_allocations_as a
    LEFT JOIN product_filters_as b USING (article)
    JOIN (
        SELECT
            aai.allocation_code,
            aai.article_list,
            aai.batch_number,
            unnest(aai.article_list) AS article
        FROM inventory_smart.auto_allocation_input aai
        WHERE aai.batch_number = p_batch_number
    ) c ON a.article = c.article        -- OPTION A confirmed: direct match
    WHERE c.article IN (SELECT DISTINCT article FROM gurobi_table)
    GROUP BY 1,2,3,4,5,6,7,8,9;

    ----------------------------------------------------------------------
    -- TEMP 6: FAILED ALLOCATIONS
    ----------------------------------------------------------------------
    CREATE TEMP TABLE failed_allocations_as ON COMMIT DROP AS
    SELECT
        paf.l0_name,
        paf.l1_name,
        paf.l2_name,
        paf.l3_name,
        paf.range_name,
        'Failed' AS status,
        a.allocation_code,
        a.article,
        a.batch_number
    FROM (
        SELECT
            aai.allocation_code,
            aai.article_list,
            aai.batch_number,
            unnest(aai.article_list) AS article
        FROM inventory_smart.auto_allocation_input aai
        WHERE aai.batch_number = p_batch_number
    ) a
    JOIN global.product_attributes_filter paf USING (article)
    WHERE NOT EXISTS ( SELECT 1 FROM gurobi_table g WHERE g.article = a.article);

    ----------------------------------------------------------------------
    -- FINAL RESULT (MATCHED TO CARTERS STRUCTURE)
    ----------------------------------------------------------------------
   RETURN QUERY
    WITH final_data AS (
        SELECT
            (now() AT TIME ZONE 'Australia/Melbourne')::timestamptz AS process_date,
            'Today'::VARCHAR(10) AS day,
            COALESCE(a.l0_name, b.l0_name) AS l0_name,
            CASE
                WHEN a.status IS NOT NULL AND b.status IS NULL THEN a.status
                WHEN a.status IS NOT NULL AND b.status IS NOT NULL THEN a.status
                WHEN a.status IS NULL AND b.status IS NOT NULL THEN 'Failed'
                ELSE NULL
            END::VARCHAR(50) AS status,
            COALESCE(a.range_name, b.range_name) AS range_name,
            COALESCE(a.batch_number, b.batch_number) AS batch_number,

            ARRAY_AGG(a.article) FILTER (WHERE a.article IS NOT NULL)::VARCHAR[] AS actual_allocated_article_list,
            ARRAY_AGG(b.article) FILTER (WHERE b.article IS NOT NULL)::VARCHAR[] AS failed_article_list,

            COUNT(DISTINCT b.article)::INTEGER AS no_of_articles_failed,
            COUNT(DISTINCT b.allocation_code)::INTEGER AS no_of_allocation_plans_failed,
            COUNT(DISTINCT a.allocation_code)::INTEGER AS no_of_allocation_plans_successful,
            COUNT(DISTINCT a.article)::INTEGER AS no_of_articles_allocated,

            SUM(a.allocated_total)::INTEGER AS allocated_qty,
            SUM(a.original_forecast)::INTEGER AS forecast_demand_units,
            SUM(a.inv_avai)::INTEGER AS available_qty

        FROM allocation_base_as a
        FULL OUTER JOIN failed_allocations_as b
            ON a.allocation_code = b.allocation_code
        GROUP BY 3,4,5,6
    )
    SELECT * FROM final_data
    ;

    ----------------------------------------------------------------------
    -- LOG ENTRY
    ----------------------------------------------------------------------
    PERFORM global.sp_log(
        v_gen_random_uuid,
        'inventory_smart.get_auto_allocation_summary',
        'Before returning function value',
        'Function completed successfully',
        jsonb_build_object('process_date', now() AT TIME ZONE 'Australia/Melbourne')
    );

END;
$function$
;