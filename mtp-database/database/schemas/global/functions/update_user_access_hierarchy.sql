--liquibase formatted sql
--changeset srishti.kumari:update_user_access_hierarchy runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:update_user_access_hierarchy
--comment: bulk update stored procedure for access_hierarchy
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.update_user_access_hierarchy(integer[]);

CREATE OR REPLACE FUNCTION global.update_user_access_hierarchy(
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

    CREATE TEMP TABLE temp_unnested_elements ON COMMIT DROP AS
    SELECT 
        uahm.hierarchy_id,
        elem.ordinality - 1 as elem_index,
        elem.value as elem_data,
        elem.value->>'l0_name' AS l0_name,
        elem.value->>'l1_name' AS l1_name,
        elem.value->>'l2_name' AS l2_name,
        elem.value->>'product_channel_name' AS product_channel_name,
        elem.value->>'channel' AS channel,
        elem.value->>'store_channel_description' AS store_channel_description
    FROM global.user_access_hierarchy_mapping uahm
    CROSS JOIN LATERAL jsonb_array_elements(uahm.access_hierarchy) WITH ORDINALITY AS elem
    WHERE uahm.access_hierarchy IS NOT NULL 
    AND uahm.access_hierarchy != '[]'::jsonb
    AND (p_hierarchy_ids IS NULL OR uahm.hierarchy_id = ANY(p_hierarchy_ids))
    AND NOT EXISTS (
        SELECT 1 
        FROM jsonb_array_elements(uahm.access_hierarchy) AS e
        WHERE (e ? 'product_access_hierarchy') 
            OR (e ? 'store_access_hierarchy')
    );
    
    CREATE TEMP TABLE temp_product_matches ON COMMIT DROP AS
	SELECT DISTINCT ON (tne.hierarchy_id, tne.elem_index)
        tne.hierarchy_id, 
        tne.elem_index, 
        paf.product_access_hierarchy
	FROM temp_unnested_elements tne
	LEFT JOIN global.product_attributes_filter paf
	  ON paf.l0_name = tne.l0_name
	 AND paf.l1_name = tne.l1_name
	 AND paf.l2_name = tne.l2_name
	 AND paf.product_channel_name = tne.product_channel_name;
    
    
    CREATE TEMP TABLE temp_store_matches ON COMMIT DROP AS
    SELECT DISTINCT ON (tne.hierarchy_id, tne.elem_index)
        tne.hierarchy_id,
        tne.elem_index,
        saf.store_access_hierarchy
    FROM temp_unnested_elements tne
    LEFT JOIN global.store_attributes_filter saf
        ON saf.channel = tne.channel
        AND saf.store_channel_description = tne.store_channel_description
    WHERE saf.store_access_hierarchy IS NOT NULL
    ORDER BY tne.hierarchy_id, tne.elem_index;
    
    
    CREATE TEMP TABLE temp_enriched_elements ON COMMIT DROP AS
    SELECT 
        tue.hierarchy_id,
        tue.elem_index,
        tue.elem_data 
            || COALESCE(jsonb_build_object('product_access_hierarchy', tpm.product_access_hierarchy), '{}'::jsonb)
            || COALESCE(jsonb_build_object('store_access_hierarchy', tsm.store_access_hierarchy), '{}'::jsonb)
        as enriched_elem
    FROM temp_unnested_elements tue
    LEFT JOIN temp_product_matches tpm ON tue.hierarchy_id = tpm.hierarchy_id AND tue.elem_index = tpm.elem_index
    LEFT JOIN temp_store_matches tsm ON tue.hierarchy_id = tsm.hierarchy_id AND tue.elem_index = tsm.elem_index;
    
    
    CREATE TEMP TABLE temp_aggregated_hierarchy ON COMMIT DROP AS
    SELECT 
        hierarchy_id,
        jsonb_agg(enriched_elem ORDER BY elem_index) as new_access_hierarchy
    FROM temp_enriched_elements
    GROUP BY hierarchy_id;
    
    
    UPDATE global.user_access_hierarchy_mapping uahm
    SET 
        access_hierarchy = tah.new_access_hierarchy,
        updated_at = now()
    FROM temp_aggregated_hierarchy tah
    WHERE uahm.hierarchy_id = tah.hierarchy_id;
    
    GET DIAGNOSTICS _updated_count = ROW_COUNT;
    
    RAISE NOTICE 'Completed in % ms. Updated % hierarchy records', 
                 EXTRACT(MILLISECONDS FROM clock_timestamp() - _start_time),
                 _updated_count;
    
    RETURN QUERY SELECT 
        _updated_count,
        EXTRACT(MILLISECONDS FROM clock_timestamp() - _start_time)::numeric;
    
EXCEPTION 
    WHEN OTHERS THEN
        RAISE NOTICE 'Error in update_user_access_hierarchy: %', SQLERRM;
        RAISE;
END;
$function$
;

