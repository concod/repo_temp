--liquibase formatted sql
--changeset chaitanyaprasad.reddy@impactanalytics.co:cna_list_cluster_grade_breakdown_2 runOnChange:true stripComments:false splitStatements:false context:cna labels:liquibase_project_start
--comment: changeset for fixing query taking too long to run
--rollback: SELECT 1
DROP FUNCTION IF EXISTS cluster_smart.list_cluster_grade_breakdown(integer, integer, integer, text);
CREATE OR REPLACE FUNCTION cluster_smart.list_cluster_grade_breakdown(
    input integer,
    integer,
    integer,
    text
)
RETURNS TABLE(
    store_code character varying,
    store_name character varying,
    performance_cluster_name character varying,
    metrics jsonb,
    attribute_cluster_name character varying,
    store_cluster_name character varying,
    cluster_display_name text,
    is_highlight boolean
)
LANGUAGE plpgsql
AS $function$
    /*
        Function/Procedure name: cluster_smart.list_cluster_grade_breakdown
        No of input parameter: 4
        Parameter Description : $1 = plan code, $2 = attribute_bucket_id, $3 = performance_bucket_id, $4 = channels

        Purpose: This function been created to get cluster's store data
        Optimized with CTEs to eliminate 3.5M loop joins

        Calling Statement:
        select * from cluster_smart.list_cluster_grade_breakdown(44, 4, 6, '');
    */
DECLARE
    _query text := '';
    _channel_filter text := '';
BEGIN
    -- Build channel filter dynamically
    IF length($4) > 0 THEN
        _channel_filter := 'AND saf.channel = ''' || $4 || '''';
    END IF;

    _query := '
        WITH store_filter AS (
            -- Materialized once, eliminates 3.5M loops
            SELECT store_code, channel, store_description as store_name
            FROM "global".store_attributes_filter saf
            WHERE 1=1 ' || _channel_filter || '
        ),
        perf_bucket AS (
            -- Materialized once instead of seq scan 2704 times
            SELECT
                cluster_bucket_code,
                cluster_name,
                bucket_attribute_value
            FROM cluster_smart.plan_cluster_bucket_map
            WHERE cluster_plan_code = ' || $1 || '
            AND bucket_id = ''' || $3 || '''
            AND special_classification = ''performance''
        ),
        prod_bucket AS (
            -- Materialized once
            SELECT
                cluster_bucket_code,
                cluster_name
            FROM cluster_smart.plan_cluster_bucket_map
            WHERE cluster_plan_code = ' || $1 || '
            AND special_classification = ''product''
            AND bucket_id = ''' || $2 || '''
        ),
        store_bucket AS (
            -- Materialized once, eliminates repeated store joins
            SELECT
                pcb.cluster_bucket_code,
                pcb.cluster_name,
                pcbma.attribute_value AS store_code,
                sf.channel
            FROM cluster_smart.plan_cluster_bucket_map pcb
            JOIN cluster_smart.plan_cluster_bucket_map_attributes pcbma
                ON pcb.cluster_bucket_code = pcbma.cluster_bucket_code
                AND pcbma.attribute_name = ''store_code''
            JOIN store_filter sf
                ON pcbma.attribute_value = sf.store_code
            WHERE pcb.cluster_plan_code = ' || $1 || '
            AND pcb.special_classification = ''store''
        ),
        grade_attrs AS (
            -- Materialized once for all attribute_names (dynamic)
            SELECT
                store_code,
                attribute_name,
                attribute_value
            FROM cluster_smart.plan_cluster_grade_attributes
            WHERE cluster_plan_code = ' || $1 || '
            AND special_classification = ''performance''
        ),
        highlight_buckets AS (
            -- Find is_highlight bucket codes once
            SELECT DISTINCT pcbma.cluster_bucket_code
            FROM cluster_smart.plan_cluster_bucket_map_attributes pcbma
            WHERE pcbma.attribute_name = ''is_highlight''
        ),
        highlight_perf AS (
            -- is_highlight for performance clusters
            SELECT
                pcm.cluster_name,
                pcma.attribute_name,
                pcma.attribute_value
            FROM cluster_smart.plan_cluster_bucket_map pcm
            JOIN cluster_smart.plan_cluster_bucket_map_attributes pcma
                ON pcm.cluster_bucket_code = pcma.cluster_bucket_code
            JOIN highlight_buckets hb
                ON pcm.cluster_bucket_code = hb.cluster_bucket_code
            WHERE pcm.cluster_plan_code = ' || $1 || '
            AND pcm.special_classification = ''performance''
            AND pcm.bucket_id = ''' || $3 || '''
            AND pcma.attribute_name != ''store_code''
        ),
        highlight_prod AS (
            -- is_highlight for product clusters
            SELECT
                pcm.cluster_name,
                pcma.attribute_name,
                pcma.attribute_value
            FROM cluster_smart.plan_cluster_bucket_map pcm
            JOIN cluster_smart.plan_cluster_bucket_map_attributes pcma
                ON pcm.cluster_bucket_code = pcma.cluster_bucket_code
            JOIN highlight_buckets hb
                ON pcm.cluster_bucket_code = hb.cluster_bucket_code
            WHERE pcm.cluster_plan_code = ' || $1 || '
            AND pcm.special_classification = ''product''
            AND pcm.bucket_id = ''' || $2 || '''
            AND pcma.attribute_name != ''store_code''
        ),
        main_data AS (
            -- Core data with channel filter pushed early
            SELECT
                a.attribute_value AS store_code,
                sf.channel,
                sf.store_name,
                pb.cluster_name AS performance_cluster_name,
                pb.bucket_attribute_value->>''upload_cluster_name'' AS upload_cluster_name,
                jsonb_object_agg(
                    ga.attribute_name,
                    ga.attribute_value
                ) AS metrics
            FROM cluster_smart.plan_cluster_bucket_map_attributes a
            JOIN cluster_smart.plan_cluster_bucket_map b
                ON a.cluster_bucket_code = b.cluster_bucket_code
                AND b.cluster_plan_code = ' || $1 || '
            JOIN perf_bucket pb
                ON a.cluster_bucket_code = pb.cluster_bucket_code
            -- Channel filter applied early via store_filter CTE
            JOIN store_filter sf
                ON a.attribute_value = sf.store_code
            JOIN grade_attrs ga
                ON ga.store_code = a.attribute_value
            GROUP BY
                a.attribute_value,
                sf.channel,
                sf.store_name,
                pb.cluster_name,
                pb.bucket_attribute_value->>''upload_cluster_name''
        ),
        cluster_display AS (
            -- Materialized once instead of looping 169 times
            SELECT
                trim(cluster_name) AS cluster_name,
                attribute_value->>''cluster_display_name'' AS cluster_display_name
            FROM cluster_smart.plan_cluster_final
            WHERE cluster_plan_code = ' || $1 || '
            GROUP BY 1, 2
        )
        SELECT
            md.store_code::character varying,
            md.store_name::character varying,
            md.performance_cluster_name::character varying,
            md.metrics,
            prod.cluster_name::character varying AS attribute_cluster_name,
            sb.cluster_name::character varying AS store_cluster_name,
            CASE
                WHEN cd.cluster_display_name IS NULL
                THEN md.upload_cluster_name
                ELSE cd.cluster_display_name
            END AS cluster_display_name,
            CASE
                WHEN hp.attribute_value = hprod.attribute_value THEN true
                ELSE false
            END AS is_highlight
        FROM main_data md
        -- Product cluster join
        JOIN cluster_smart.plan_cluster_bucket_map_attributes prod_attr
            ON prod_attr.attribute_value = md.store_code
        JOIN cluster_smart.plan_cluster_bucket_map prod
            ON prod.cluster_bucket_code = prod_attr.cluster_bucket_code
            AND prod.cluster_plan_code = ' || $1 || '
            AND prod.special_classification = ''product''
            AND prod.bucket_id = ''' || $2 || '''
        -- Store cluster
        LEFT JOIN store_bucket sb
            ON sb.store_code = md.store_code
        -- Highlight joins
        LEFT JOIN highlight_perf hp
            ON hp.cluster_name = md.performance_cluster_name
        LEFT JOIN highlight_prod hprod
            ON hprod.cluster_name = prod.cluster_name
        -- Cluster display name
        LEFT JOIN cluster_display cd
            ON cd.cluster_name = concat(
                prod.cluster_name,
                reverse(split_part(reverse(md.performance_cluster_name), '' '', 1)),
                substring(sb.cluster_name, length(sb.channel) + 1)
            )
        ORDER BY
            prod.cluster_name,
            md.performance_cluster_name,
            substring(sb.cluster_name, length(sb.channel) + 1),
            md.metrics->>''sales_retail'' DESC;
    ';

    RAISE NOTICE '%', _query;
    RETURN QUERY EXECUTE _query;
END;
$function$;
