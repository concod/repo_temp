--liquibase formatted sql
--changeset liquibase:get_downstream_attributes_date_default_null runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for get_downstream_attributes
--
-- USAGE: inventory_smart.get_downstream_attributes(
--   p_allocation_codes varchar[] DEFAULT NULL,
--   p_attribute_codes  varchar[] DEFAULT NULL,
--   p_date             date      DEFAULT NULL,
--   p_types            varchar[] DEFAULT NULL,
--   p_auto_finalized   boolean   DEFAULT NULL,
--   p_auto_released    boolean   DEFAULT NULL
-- ) RETURNS jsonb
--
-- Behavior
-- * Aggregates attribute_name values for each attribute_code on the given date (default: current date in tenant timezone)
-- * Normalizes attribute_name strings by stripping outer { } or [ ] and splitting by comma
-- * Trims quotes/spaces and de-duplicates elements per attribute_code
-- * Returns a single JSONB object: { attribute_code: '{\'v1\', \'v2\', ...}', ... }
--
-- Filtering Rules
-- * Any array parameter (p_allocation_codes, p_attribute_codes, p_types):
--     - NULL or empty array => ignored (no filtering)
--     - Non-empty array     => record must match ANY of the values
-- * p_date: defaults to current date in tenant timezone when NULL
-- * p_auto_finalized / p_auto_released: when NULL ignored; otherwise exact match
--
-- Examples
-- 1) No filters (today):
--    SELECT inventory_smart.get_downstream_attributes();
--
-- 2) Filter by allocation codes:
--    SELECT inventory_smart.get_downstream_attributes(ARRAY['ALC3002','ALC3003']);
--
-- 3) Filter by attribute codes only:
--    SELECT inventory_smart.get_downstream_attributes(NULL, ARRAY['summary_file','alloc_rollup']);
--
-- 4) Specific date:
--    SELECT inventory_smart.get_downstream_attributes(NULL, NULL, DATE '2025-09-05');
--
-- 5) Filter by types (e.g., 'auto', 'manual'):
--    SELECT inventory_smart.get_downstream_attributes(NULL, NULL, CURRENT_DATE, ARRAY['auto']);
--
-- 6) Filter by booleans:
--    SELECT inventory_smart.get_downstream_attributes(
--      NULL, NULL, CURRENT_DATE, NULL,
--      p_auto_finalized := true,
--      p_auto_released  := false
--    );
--
-- 7) Combined filters:
--    SELECT inventory_smart.get_downstream_attributes(
--      p_allocation_codes := ARRAY['ALC3002'],
--      p_attribute_codes  := ARRAY['summary_file'],
--      p_date             := CURRENT_DATE,
--      p_types            := ARRAY['auto'],
--      p_auto_finalized   := true,
--      p_auto_released    := false
--    );
--
-- 8) Empty arrays are ignored (treated like no filter):
--    SELECT inventory_smart.get_downstream_attributes(NULL, NULL, CURRENT_DATE, ARRAY[]::varchar[]);
--
--rollback: SELECT '{}'::jsonb;

DROP FUNCTION IF EXISTS inventory_smart.get_downstream_attributes(
    varchar[],
    varchar[],
    date,
    varchar[],
    boolean,
    boolean
);

CREATE OR REPLACE FUNCTION inventory_smart.get_downstream_attributes(
    p_allocation_codes varchar[] DEFAULT NULL,
    p_attribute_codes varchar[] DEFAULT NULL,
    p_date date DEFAULT NULL,
    p_types varchar[] DEFAULT NULL,
    p_auto_finalized boolean DEFAULT NULL,
    p_auto_released boolean DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
AS $function$
DECLARE
    v_result jsonb;
    v_time_zone text;
BEGIN
    -- Get tenant time zone from global.tenant_attributes_master, default to 'EST'
    SELECT COALESCE(
        (SELECT COALESCE((attribute_value::jsonb -> 'value' ->> 'time_zone'), 'EST')
         FROM global.tenant_attribute_master
         WHERE name = 'tenant_time_config'
           AND status = TRUE
         LIMIT 1),
        'EST'
    )
    INTO v_time_zone;
    
    RAISE NOTICE 'Time zone picked: %', v_time_zone;

    -- Early return: if any provided array filter is explicitly empty-like, return {}.
    -- Empty-like means the array is non-NULL and contains no meaningful values (only NULLs/empty strings/'NULL').
    IF p_allocation_codes IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM unnest(p_allocation_codes) v
        WHERE btrim(v) <> '' AND upper(btrim(v)) <> 'NULL'
    ) THEN
        RETURN '{}'::jsonb;
    END IF;

    IF p_attribute_codes IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM unnest(p_attribute_codes) v
        WHERE btrim(v) <> '' AND upper(btrim(v)) <> 'NULL'
    ) THEN
        RETURN '{}'::jsonb;
    END IF;

    IF p_types IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM unnest(p_types) v
        WHERE btrim(v) <> '' AND upper(btrim(v)) <> 'NULL'
    ) THEN
        RETURN '{}'::jsonb;
    END IF;

    RAISE NOTICE 'Date being used: %', COALESCE(p_date, date(now() AT TIME ZONE v_time_zone));
    
    WITH filtered AS (
        SELECT *
        FROM inventory_smart.downstream_files_attributes d
        WHERE (d."timestamp" AT TIME ZONE v_time_zone)::date = COALESCE(p_date, date(now() AT TIME ZONE v_time_zone))
          AND (p_allocation_codes IS NULL OR cardinality(p_allocation_codes) = 0 OR d.allocation_code = ANY(p_allocation_codes))
          AND (p_attribute_codes IS NULL OR cardinality(p_attribute_codes) = 0 OR d.attribute_code = ANY(p_attribute_codes))
          AND (p_types IS NULL OR cardinality(p_types) = 0 OR d.type = ANY(p_types))
          AND (p_auto_finalized IS NULL OR d.auto_finalized = p_auto_finalized)
          AND (p_auto_released IS NULL OR d.auto_released = p_auto_released)
    ), codes AS (
        SELECT DISTINCT attribute_code
        FROM filtered
    ), exploded AS (
        SELECT
            d.attribute_code,
            (
              CASE
                WHEN upper(btrim(regexp_replace(token, '[''"]', '', 'g'))) = 'NULL' THEN NULL
                WHEN btrim(regexp_replace(token, '[''"]', '', 'g')) = '' THEN NULL
                ELSE btrim(regexp_replace(token, '[''"]', '', 'g'))
              END
            ) AS elem
        FROM filtered d
        CROSS JOIN LATERAL regexp_split_to_table(
            -- Remove exactly one leading { or [ and exactly one trailing } or ] if present
            regexp_replace(
                regexp_replace(COALESCE(d.attribute_name, ''), '^[\[{]', ''),
                '[\]}]$', ''
            ),
            ','
        ) AS token
    ), distinct_elems AS (
        SELECT DISTINCT attribute_code, elem
        FROM exploded
        WHERE elem IS NOT NULL
    ), aggregated AS (
        SELECT
            attribute_code,
            '{' || string_agg(quote_literal(elem), ', ' ORDER BY elem) || '}' AS aggregated_value
        FROM distinct_elems
        GROUP BY attribute_code
    ), final AS (
        SELECT c.attribute_code, COALESCE(a.aggregated_value, '{}') AS aggregated_value
        FROM codes c
        LEFT JOIN aggregated a USING (attribute_code)
    )
    SELECT COALESCE(jsonb_object_agg(attribute_code, aggregated_value), '{}'::jsonb)
      INTO v_result
      FROM final;

    RETURN v_result;
END
$function$;
