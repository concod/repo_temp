
-- liquibase formatted sql
-- changeset akashkumar.rana@impactanalytics.co:create_indexes runOnChange:true stripComments:false splitStatements:false context:create_indexes labels:create_indexes
-- comment: initial changeset for create_indexes




-- PostgreSQL function to create optimized indexes on materialized views
-- This function creates all necessary indexes for efficient querying of the materialized view
-- that was previously handled in Rust code
--
-- Usage: SELECT size_smart.create_indexes(size_profile_id, view_name);
-- Parameters:
--   - size_profile_id_param: INTEGER - The size profile ID (used for index naming)
--   - view_name_param: TEXT - The name of the materialized view to create indexes on
-- Returns: JSONB - Object containing success status and details about created indexes
--
-- Return format:
-- {
--   "success": boolean,           // Overall success status
--   "total_indexes": integer,     // Total number of indexes attempted
--   "created_count": integer,     // Number of successfully created indexes
--   "failed_count": integer,      // Number of failed index creations
--   "created_indexes": [string],  // Array of successfully created index names
--   "failed_indexes": [string],   // Array of failed index names with error messages
--   "view_name": string,          // The view name that was processed
--   "size_profile_id": integer    // The size profile ID that was processed
-- }
--
-- The function creates both B-tree and GIN indexes for optimal query performance:
-- - B-tree indexes: l0_name+l1_name, size_range_id, rule_id, rule_tag, ruleset_id
-- - GIN indexes: escalation_level, size_range, attributes, timeline
--
-- All indexes are created with CONCURRENTLY to avoid blocking other operations
-- and IF NOT EXISTS to handle cases where indexes already exist
--
-- To deploy this function, run this SQL script in your PostgreSQL database

DROP FUNCTION IF EXISTS size_smart.create_indexes(INTEGER, TEXT);
CREATE OR REPLACE FUNCTION size_smart.create_indexes(
    size_profile_id_param INTEGER,
    view_name_param TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
security definer 
AS $$
DECLARE
    index_statements TEXT[];
    statement TEXT;
    success_count INTEGER := 0;
    error_count INTEGER := 0;
    results JSONB := '{"success": true, "created_indexes": [], "failed_indexes": []}'::JSONB;
    created_indexes TEXT[] := ARRAY[]::TEXT[];
    failed_indexes TEXT[] := ARRAY[]::TEXT[];
    error_message TEXT;
BEGIN
    -- Define all index creation statements
    index_statements := ARRAY[
        format('CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_%s_l0_l1 ON %s (l0_name, l1_name)', 
               size_profile_id_param, view_name_param),
        format('CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_%s_size_range_id ON %s (size_range_id)', 
               size_profile_id_param, view_name_param),
        format('CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_%s_rule_id ON %s (rule_id)', 
               size_profile_id_param, view_name_param),
        format('CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_%s_rule_tag ON %s (rule_tag)', 
               size_profile_id_param, view_name_param),
        format('CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_%s_ruleset_id ON %s (ruleset_id)', 
               size_profile_id_param, view_name_param),
        format('CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_%s_escalation_levels ON %s USING GIN (escalation_level)', 
               size_profile_id_param, view_name_param),
        format('CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_%s_size_ranges ON %s USING GIN (size_range)', 
               size_profile_id_param, view_name_param),
        format('CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_%s_attributes ON %s USING GIN (attributes)', 
               size_profile_id_param, view_name_param),
        format('CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_%s_timelines ON %s USING GIN (timeline)', 
               size_profile_id_param, view_name_param)
    ];
    
    -- Execute each index creation statement
    FOREACH statement IN ARRAY index_statements
    LOOP
        BEGIN
            EXECUTE statement;
            success_count := success_count + 1;
            
            -- Extract index name from the statement for reporting
            created_indexes := array_append(created_indexes, 
                regexp_replace(statement, '.*IF NOT EXISTS ([^ ]+) ON.*', '\1'));
            
            RAISE NOTICE 'Successfully created index: %', statement;
            
        EXCEPTION
            WHEN OTHERS THEN
                error_count := error_count + 1;
                error_message := SQLERRM;
                
                -- Extract index name from the failed statement
                failed_indexes := array_append(failed_indexes, 
                    regexp_replace(statement, '.*IF NOT EXISTS ([^ ]+) ON.*', '\1') || ' (' || error_message || ')');
                
                RAISE WARNING 'Failed to create index: % - Error: %', statement, error_message;
                -- Continue with other indexes even if one fails
        END;
    END LOOP;
    
    -- Build result object
    results := jsonb_build_object(
        'success', CASE WHEN error_count = 0 THEN true ELSE false END,
        'total_indexes', array_length(index_statements, 1),
        'created_count', success_count,
        'failed_count', error_count,
        'created_indexes', to_jsonb(created_indexes),
        'failed_indexes', to_jsonb(failed_indexes),
        'view_name', view_name_param,
        'size_profile_id', size_profile_id_param
    );
    
    -- Log final result
    RAISE NOTICE 'Index creation completed for view %: % successful, % failed', 
                 view_name_param, success_count, error_count;
    
    RETURN results;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error creating indexes for view %: %', view_name_param, SQLERRM;
END;
$$;

-- Grant execute permission to the application role (adjust as needed for your setup)
-- GRANT EXECUTE ON FUNCTION size_smart.create_indexes(INTEGER, TEXT) TO your_app_role;
