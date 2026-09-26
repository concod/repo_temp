--liquibase formatted sql
--changeset chaitanyaprasad.reddy@impactanalytics.co:save_final_cluster_result_cna_2 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for save_final_cluster_results
--rollback: SELECT 1
DROP FUNCTION IF EXISTS cluster_smart.save_final_cluster_results(input integer, jsonb, jsonb);
CREATE OR REPLACE FUNCTION cluster_smart.save_final_cluster_results(input integer, jsonb, jsonb)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
declare
    _delete_query text;
    _query text;
    _query_attr text;
    _bucket_save_query text;
    _count int;
    _filled_param2 jsonb;
    _filled_param3 jsonb;
    _new_param2 jsonb;
    _new_param3 jsonb;
	_has_store bool;
begin
    raise notice '%', length($3::text);

    _filled_param2 := $2::jsonb;
    _filled_param3 := $3::jsonb;

    -- ================================================================
    -- STEP 0: Auto-fill empty channels in $2 and $3
    -- ================================================================
    WITH channels_to_fill AS (
        SELECT key AS channel
        FROM jsonb_each(_filled_param2)
        WHERE value = '{}'::jsonb
          AND key <> 'Online'
    ),
    prod AS (
        SELECT 
            substring(cluster_name, 1, length(cluster_name) - position(' ' in reverse(cluster_name))) AS channel,
            bucket_id AS attribute_bucket_id,
			cluster_name as attribute_bucket_label
--            substring(cluster_name, length(substring(cluster_name, 1, length(cluster_name) - position(' ' in reverse(cluster_name)))) + 2) AS attribute_bucket_label
        FROM cluster_smart.plan_cluster_bucket_map
        WHERE cluster_plan_code = $1
          AND special_classification = 'product'
          AND is_optimal = true
    ),
    perf AS (
        SELECT
            substring(cluster_name, 1, length(cluster_name) - position(' ' in reverse(cluster_name))) AS channel,
            bucket_id AS performance_bucket_id,
            substring(cluster_name, length(substring(cluster_name, 1, length(cluster_name) - position(' ' in reverse(cluster_name)))) + 2) AS performance_bucket_label
        FROM cluster_smart.plan_cluster_bucket_map
        WHERE cluster_plan_code = $1
          AND special_classification = 'performance'
          AND is_optimal = true
    ),
    store AS (
        SELECT DISTINCT
            sf.channel,
            pcb.bucket_id AS store_bucket_id,
            substring(pcb.cluster_name, length(sf.channel) + 2) AS store_bucket_label
        FROM cluster_smart.plan_cluster_bucket_map pcb
        JOIN cluster_smart.plan_cluster_bucket_map_attributes pcbma
            ON pcb.cluster_bucket_code = pcbma.cluster_bucket_code
            AND pcbma.attribute_name = 'store_code'
        JOIN global.store_attributes_filter sf
            ON pcbma.attribute_value = sf.store_code
        WHERE pcb.cluster_plan_code = $1
          AND pcb.special_classification = 'store'
    ),
    combinations AS (
        SELECT
            ctf.channel,
            p.attribute_bucket_id,
            pf.performance_bucket_id,
			p.attribute_bucket_label,
			s.store_bucket_label,
			pf.performance_bucket_label,
            concat(
                p.attribute_bucket_label,
                pf.performance_bucket_label,
                CASE WHEN s.store_bucket_label IS NOT NULL THEN ' ' || s.store_bucket_label ELSE '' END
            ) AS cluster_suffix,
            s.store_bucket_id
        FROM channels_to_fill ctf
        LEFT JOIN prod p  ON p.channel  = ctf.channel
        LEFT JOIN perf pf ON pf.channel = ctf.channel
        LEFT JOIN store s ON s.channel  = ctf.channel
        WHERE concat(
            p.attribute_bucket_label,
            pf.performance_bucket_label,
            CASE WHEN s.store_bucket_label IS NOT NULL THEN ' ' || s.store_bucket_label ELSE '' END
        ) IS NOT NULL
    ),
    param2_deduped AS (
        SELECT DISTINCT channel, attribute_bucket_id, performance_bucket_id
        FROM combinations
    )
    SELECT
        (
            SELECT jsonb_object_agg(
                channel,
                jsonb_strip_nulls(jsonb_build_object(
                    'attribute_bucket_id',   attribute_bucket_id,
                    'performance_bucket_id', performance_bucket_id
                ))
            )
            FROM param2_deduped
        ),
        jsonb_object_agg(
            cluster_suffix,
            jsonb_strip_nulls(jsonb_build_object(
                'attribute_bucket_id',   attribute_bucket_label,
                'performance_bucket_id', performance_bucket_label,
                'store_bucket_id',       store_bucket_label
            ))
        )
    INTO _new_param2, _new_param3
    FROM combinations;

    _filled_param2 := _filled_param2 || coalesce(_new_param2, '{}'::jsonb);
    _filled_param3 := _filled_param3 || coalesce(_new_param3, '{}'::jsonb);

    SELECT jsonb_object_agg(key, value) INTO _filled_param2
    FROM jsonb_each(_filled_param2) WHERE value <> '{}'::jsonb;

    SELECT jsonb_object_agg(key, value) INTO _filled_param3
    FROM jsonb_each(_filled_param3) WHERE value <> '{}'::jsonb;

    RAISE NOTICE 'Filled param2: %', _filled_param2;
    RAISE NOTICE 'Filled param3: %', _filled_param3;

    -- ================================================================
    -- STEP 1: Count keys in filled $3
    -- ================================================================
    SELECT count(*) INTO _count FROM jsonb_each(_filled_param3);

    -- ================================================================
    -- STEP 2: Delete stale records for this plan
    -- ================================================================
    EXECUTE 'DELETE FROM cluster_smart.plan_cluster_final WHERE cluster_plan_code = $1'
    USING $1;
    RAISE NOTICE 'Deleted existing records for cluster plan: %', $1;

    -- ================================================================
    -- STEP 3: Insert into plan_cluster_final
    -- No JSON embedded in SQL string — passed via USING $2
    -- ================================================================
    IF _count > 0 THEN
       _query := '
    INSERT INTO cluster_smart.plan_cluster_final
        (cluster_plan_code, attribute_value, cluster_name)
    SELECT
        $1,
        jsonb_build_object(''cluster_display_name'', a.key) AS attribute_value,
        trim(
            coalesce(a.value->>''attribute_bucket_id'', '''') ||
            coalesce(a.value->>''performance_bucket_id'', '''') ||
            '' '' ||
            coalesce(a.value->>''store_bucket_id'', '''')
        ) AS cluster_name
    FROM jsonb_each($2) AS a
';
        RAISE NOTICE 'plan cluster final insert: %', _query;
        EXECUTE _query USING $1, _filled_param3;

    ELSE
        _query := '
            INSERT INTO cluster_smart.plan_cluster_final
                (cluster_name, cluster_plan_code)
            SELECT DISTINCT
                concat(prd.cluster_name, perf.cluster_name, store_attr.store_cluster_name) AS cluster_name,
                prd.cluster_plan_code
            FROM
            (
                SELECT pcb.cluster_plan_code, pcb.cluster_name, pcbma.attribute_value AS store_code, bucket_id AS prod_bucket_id
                FROM cluster_smart.plan_cluster_bucket_map pcb
                JOIN cluster_smart.plan_cluster_bucket_map_attributes pcbma
                    ON pcb.cluster_bucket_code = pcbma.cluster_bucket_code
                WHERE cluster_plan_code = $1
                  AND special_classification = ''product''
                  AND pcbma.attribute_name = ''store_code''
            ) prd
            JOIN
            (
                SELECT pcb.cluster_plan_code, reverse(split_part(pcb.cluster_name, '' '', 1)) AS cluster_name,
                       pcbma.attribute_value AS store_code, bucket_id AS perf_bucket_id
                FROM cluster_smart.plan_cluster_bucket_map pcb
                JOIN cluster_smart.plan_cluster_bucket_map_attributes pcbma
                    ON pcb.cluster_bucket_code = pcbma.cluster_bucket_code
                WHERE cluster_plan_code = $1
                  AND special_classification = ''performance''
                  AND pcbma.attribute_name = ''store_code''
            ) perf
                ON prd.cluster_plan_code = perf.cluster_plan_code
               AND prd.store_code = perf.store_code
            JOIN "global".store_attributes_filter sa
                ON prd.store_code = sa.store_code
            LEFT JOIN
            (
                SELECT pcb.cluster_plan_code, pcbma.attribute_value AS store_code,
                       substring(pcb.cluster_name, (length(channel)+1)) AS store_cluster_name
                FROM "cluster_smart".plan_cluster_bucket_map pcb
                JOIN "cluster_smart".plan_cluster_bucket_map_attributes pcbma
                    ON pcb.cluster_bucket_code = pcbma.cluster_bucket_code
                JOIN (SELECT store_code, channel FROM "global".store_attributes_filter) AS channel
                    ON pcbma.attribute_value = channel.store_code
                WHERE cluster_plan_code = $1
                  AND special_classification = ''store''
                  AND pcbma.attribute_name = ''store_code''
            ) store_attr
                ON prd.cluster_plan_code = store_attr.cluster_plan_code
               AND prd.store_code = store_attr.store_code
            JOIN
            (
                SELECT a.key AS channel,
                       jsonb(a.value)->>''performance_bucket_id'' AS perf_bucket_id,
                       jsonb(a.value)->>''attribute_bucket_id''   AS prod_bucket_id
                FROM jsonb_each_text($2) AS a
            ) AS bucket
            USING (channel, perf_bucket_id, prod_bucket_id)
        ';
        EXECUTE _query USING $1, _filled_param2;
        RAISE NOTICE 'plan cluster final insert (dynamic): %', _query;

    END IF;

    -- ==================================================


    -- selected_attribute is a varchar (e.g. list of clustering dimensions); if it contains "store", require store classification in HAVING count below
    SELECT EXISTS (
        SELECT 1
        FROM cluster_smart.cluster_plan_attributes cpa
        WHERE cpa.cluster_plan_code = $1
          AND cpa.attribute_name = 'selected_attribute'
          AND cpa.attribute_value ILIKE '%store%'
    ) INTO _has_store;

		_query_attr := '
INSERT INTO cluster_smart.plan_cluster_store_final
(cluster_code_id, attribute_name, attribute_value)

WITH input AS (
    SELECT
        pcf.cluster_code_id,
        pcf.cluster_name,
        p2.key AS channel,

       
        p2.value->>''attribute_bucket_id''   AS prod_bucket_id,
        p2.value->>''performance_bucket_id'' AS perf_bucket_id,

        
        p3.value->>''attribute_bucket_id''   AS prod_cluster_name,
        concat(p2.key, '' '', p3.value->>''performance_bucket_id'') AS perf_cluster_name,
        concat(p2.key , '' '', p3.value->>''store_bucket_id'' )    AS store_cluster_name

    FROM cluster_smart.plan_cluster_final pcf

    JOIN jsonb_each($2) p2
        ON split_part(pcf.cluster_name, '' '', 1) = p2.key

    JOIN jsonb_each($3) p3
        ON p3.key = pcf.cluster_name

    WHERE pcf.cluster_plan_code = $1
),

base AS (
    SELECT
        i.cluster_code_id,
        pcbma.attribute_value AS store_code,
        pcb.special_classification

    FROM input i

    JOIN cluster_smart.plan_cluster_bucket_map pcb
        ON pcb.cluster_plan_code = $1

    JOIN cluster_smart.plan_cluster_bucket_map_attributes pcbma
        ON pcb.cluster_bucket_code = pcbma.cluster_bucket_code
       AND pcbma.attribute_name = ''store_code''

    WHERE
    (
        pcb.special_classification = ''product''
        AND pcb.bucket_id::text = i.prod_bucket_id
        AND pcb.cluster_name = i.prod_cluster_name
    )
    OR
    (
        pcb.special_classification = ''performance''
        AND pcb.bucket_id::text = i.perf_bucket_id
        AND pcb.cluster_name = i.perf_cluster_name
    )
    OR
    (
        pcb.special_classification = ''store''
        AND pcb.cluster_name = i.store_cluster_name
    )
)

SELECT
    cluster_code_id,
    ''store_code'',
    store_code
FROM base

WHERE EXISTS (
    SELECT 1
    FROM cluster_smart.plan_cluster_grade_attributes ga
    WHERE ga.cluster_plan_code = $1
      AND ga.special_classification = ''performance''
      AND ga.store_code = base.store_code
)

GROUP BY cluster_code_id, store_code
HAVING COUNT(DISTINCT special_classification) = ' || CASE WHEN _has_store THEN 3 ELSE 2 END || '';

EXECUTE _query_attr USING $1, _filled_param2, _filled_param3;
		raise notice ' % ', _query_attr;
		--execute _query_attr;
		execute 'update cluster_smart.plan_cluster_bucket_map set is_optimal = false, is_final= false
		          where cluster_plan_code = '|| $1 ||' ;';

	_bucket_save_query := '
UPDATE cluster_smart.plan_cluster_bucket_map pcbm
SET is_final = true,
    is_optimal = true
FROM (
    SELECT
        j.key AS channel,
        (j.value->>''attribute_bucket_id'') AS prod_bucket_id,
        (j.value->>''performance_bucket_id'') AS perf_bucket_id
    FROM jsonb_each($2) AS j
) bucket
WHERE pcbm.cluster_plan_code = $1

AND (
    -- PRODUCT
    (
        pcbm.special_classification = ''product''
        AND pcbm.bucket_id::text = bucket.prod_bucket_id
        AND split_part(pcbm.cluster_name, '' '', 1) = bucket.channel
    )

    OR

    -- PERFORMANCE
    (
        pcbm.special_classification = ''performance''
        AND pcbm.bucket_id::text = bucket.perf_bucket_id
        AND split_part(pcbm.cluster_name, '' '', 1) = bucket.channel
    )
)
';

EXECUTE _bucket_save_query USING $1, _filled_param2;
    end $function$
;