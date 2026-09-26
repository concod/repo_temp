--liquibase formatted sql
--changeset srishti.kumari:update_user_access_hierarchy_id runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:update_user_access_hierarchy_id
--comment: Update access_hierarchy to add id field using same concatenation logic as urm_hierarchies_aggregate_source
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.update_user_access_hierarchy_id(integer[]);

CREATE OR REPLACE FUNCTION global.update_user_access_hierarchy_id(
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

    -- Step 1: Unnest access_hierarchy elements with their indices
    CREATE TEMP TABLE temp_unnested_elements ON COMMIT DROP AS
    SELECT 
        uahm.hierarchy_id,
        elem.ordinality - 1 as elem_index,
        elem.value as elem_data,
        COALESCE(elem.value->>'product_access_hierarchy', '') AS product_access_hierarchy,
        COALESCE(elem.value->>'product_channel_name', '') AS product_channel_name,
        COALESCE(elem.value->>'l0_name', '') AS l0_name,
        COALESCE(elem.value->>'l1_name', '') AS l1_name,
        COALESCE(elem.value->>'l2_name', '') AS l2_name,
        COALESCE(elem.value->>'channel', '') AS channel,
        COALESCE(elem.value->>'store_channel_description', '') AS store_channel_description,
        COALESCE(elem.value->>'store_access_hierarchy', '') AS store_access_hierarchy
    FROM global.user_access_hierarchy_mapping uahm
    CROSS JOIN LATERAL jsonb_array_elements(uahm.access_hierarchy) WITH ORDINALITY AS elem
    WHERE uahm.access_hierarchy IS NOT NULL 
    AND uahm.access_hierarchy != '[]'::jsonb
    AND (p_hierarchy_ids IS NULL OR uahm.hierarchy_id = ANY(p_hierarchy_ids));

    -- Step 2: Generate id using the same concatenation order as urm_hierarchies_aggregate_source
    -- Order: product_access_hierarchy, product_channel_name, l0_name, l1_name, l2_name, channel, store_channel_description, store_access_hierarchy
    CREATE TEMP TABLE temp_enriched_elements ON COMMIT DROP AS
    SELECT 
        tue.hierarchy_id,
        tue.elem_index,
        tue.elem_data || jsonb_build_object(
            'id', 
            CONCAT(
                tue.product_access_hierarchy,
                tue.product_channel_name,
                tue.l0_name,
                tue.l1_name,
                tue.l2_name,
                tue.channel,
                tue.store_channel_description,
                tue.store_access_hierarchy
            )
        ) as enriched_elem
    FROM temp_unnested_elements tue;

    -- Step 3: Aggregate enriched elements back to JSONB array
    CREATE TEMP TABLE temp_aggregated_hierarchy ON COMMIT DROP AS
    SELECT 
        hierarchy_id,
        jsonb_agg(enriched_elem ORDER BY elem_index) as new_access_hierarchy
    FROM temp_enriched_elements
    GROUP BY hierarchy_id;

    -- Step 4: Update user_access_hierarchy_mapping with the new access_hierarchy
    UPDATE global.user_access_hierarchy_mapping uahm
    SET 
        access_hierarchy = tah.new_access_hierarchy,
        updated_at = now()
    FROM temp_aggregated_hierarchy tah
    WHERE uahm.hierarchy_id = tah.hierarchy_id;

    GET DIAGNOSTICS _updated_count = ROW_COUNT;

    RAISE NOTICE 'Completed in % ms. Updated % hierarchy records with generated id', 
                 EXTRACT(MILLISECONDS FROM clock_timestamp() - _start_time),
                 _updated_count;

    RETURN QUERY SELECT 
        _updated_count,
        EXTRACT(MILLISECONDS FROM clock_timestamp() - _start_time)::numeric;

EXCEPTION 
    WHEN OTHERS THEN
        RAISE NOTICE 'Error in update_user_access_hierarchy_id: %', SQLERRM;
        RAISE;
END;
$function$
;

