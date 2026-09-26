--liquibase formatted sql
--changeset srishti.kumari:populate_filters_from_access_hierarchy runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:populate_filters_from_access_hierarchy
--comment: extract product and store access hierarchy from access_hierarchy and append to existing filters column
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.populate_filters_from_access_hierarchy(integer[]);

CREATE OR REPLACE FUNCTION global.populate_filters_from_access_hierarchy(
    p_hierarchy_ids integer[] DEFAULT NULL
)
 RETURNS TABLE(
    updated_count bigint,
    execution_time_ms numeric
 )
 LANGUAGE plpgsql
AS $function$
DECLARE
    _start_time TIMESTAMP;
    _updated_count BIGINT := 0;
BEGIN
    _start_time := clock_timestamp();

    -- Create temp table to unnest access_hierarchy elements and extract hierarchy values
    CREATE TEMP TABLE temp_hierarchy_elements ON COMMIT DROP AS
    SELECT 
        uahm.hierarchy_id,
        elem.value->>'product_access_hierarchy' AS product_access_hierarchy,
        elem.value->>'store_access_hierarchy' AS store_access_hierarchy
    FROM global.user_access_hierarchy_mapping uahm
    CROSS JOIN LATERAL jsonb_array_elements(uahm.access_hierarchy) AS elem
    WHERE uahm.access_hierarchy IS NOT NULL 
    AND uahm.access_hierarchy != '[]'::jsonb
    AND (p_hierarchy_ids IS NULL OR uahm.hierarchy_id = ANY(p_hierarchy_ids))
    AND (elem.value ? 'product_access_hierarchy' OR elem.value ? 'store_access_hierarchy');

    -- Build new filter objects to append
    CREATE TEMP TABLE temp_new_filters ON COMMIT DROP AS
    SELECT 
        hierarchy_id,
        jsonb_agg(filter_obj) AS new_filters
    FROM (
        -- Product access hierarchy filter
        SELECT 
            hierarchy_id,
            1 AS sort_order,
            jsonb_build_object(
                'values', jsonb_agg(DISTINCT product_access_hierarchy ORDER BY product_access_hierarchy) FILTER (WHERE product_access_hierarchy IS NOT NULL),
                'operator', 'in',
                'dimension', 'product',
                'filter_type', 'cascaded',
                'attribute_name', 'product_access_hierarchy'
            ) AS filter_obj
        FROM temp_hierarchy_elements
        WHERE product_access_hierarchy IS NOT NULL
        GROUP BY hierarchy_id

        UNION ALL

        -- Store access hierarchy filter
        SELECT 
            hierarchy_id,
            2 AS sort_order,
            jsonb_build_object(
                'values', jsonb_agg(DISTINCT store_access_hierarchy ORDER BY store_access_hierarchy) FILTER (WHERE store_access_hierarchy IS NOT NULL),
                'operator', 'in',
                'dimension', 'store',
                'filter_type', 'cascaded',
                'attribute_name', 'store_access_hierarchy'
            ) AS filter_obj
        FROM temp_hierarchy_elements
        WHERE store_access_hierarchy IS NOT NULL
        GROUP BY hierarchy_id
    ) AS all_filters
    WHERE filter_obj->>'values' != 'null'
    GROUP BY hierarchy_id;

    -- Update the filters column by appending new filters to existing ones
    UPDATE global.user_access_hierarchy_mapping uahm
    SET 
        filters = COALESCE(uahm.filters, '[]'::jsonb) || COALESCE(tnf.new_filters, '[]'::jsonb),
        updated_at = now()
    FROM temp_new_filters tnf
    WHERE uahm.hierarchy_id = tnf.hierarchy_id;

    GET DIAGNOSTICS _updated_count = ROW_COUNT;

    RAISE NOTICE 'Completed in % ms. Appended hierarchy filters to % records', 
                 EXTRACT(MILLISECONDS FROM clock_timestamp() - _start_time),
                 _updated_count;

    RETURN QUERY SELECT 
        _updated_count,
        EXTRACT(MILLISECONDS FROM clock_timestamp() - _start_time)::numeric;

EXCEPTION 
    WHEN OTHERS THEN
        RAISE NOTICE 'Error in populate_filters_from_access_hierarchy: %', SQLERRM;
        RAISE;
END;
$function$
;



