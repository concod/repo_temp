-- liquibase formatted sql
-- changeset akashkumar.rana@impactanalytics.co:remove_view_if_exists_modification_02 runOnChange:true stripComments:false splitStatements:false context:remove_view_if_exists_modification_02 labels:remove_view_if_exists_modification_02
-- comment: initial changeset for remove_view_if_exists_modification_02



-- PostgreSQL function to remove materialized view if it exists
-- This function checks if a materialized view exists in the 'size_smart' schema
-- and drops it if it exists
--
-- Usage: SELECT size_smart.remove_view_if_exists('view_name');
-- Returns: BOOLEAN (true if view was dropped, false if view didn't exist)
--
-- To deploy this function, run this SQL script in your PostgreSQL database


DROP FUNCTION IF EXISTS size_smart.remove_view_if_exists(TEXT);

CREATE OR REPLACE FUNCTION size_smart.remove_view_if_exists(view_name_param TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
security definer 
AS $$
DECLARE
    clean_view_name TEXT;
    view_existed BOOLEAN := FALSE;
BEGIN
    -- Remove schema prefix if it exists (e.g., 'size_smart.' -> '')
    clean_view_name := REPLACE(view_name_param, 'size_smart.', '');
    
    -- Check if the view exists before dropping (for return value)
    SELECT EXISTS(
        SELECT 1 FROM pg_matviews 
        WHERE schemaname = 'size_smart' 
        AND matviewname = clean_view_name
    ) INTO view_existed;
    
    -- Drop the materialized view (IF EXISTS handles non-existence gracefully)
    EXECUTE format('DROP MATERIALIZED VIEW IF EXISTS size_smart.%I', clean_view_name);
    
    -- Log the result
    IF view_existed THEN
        RAISE NOTICE 'Successfully dropped view: %', view_name_param;
    ELSE
        RAISE NOTICE 'Materialized view did not exist: %', view_name_param;
    END IF;
    
    RETURN view_existed;
    
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error and re-raise it
        RAISE EXCEPTION 'Error removing materialized view %: %', view_name_param, SQLERRM;
END;
$$;

-- Grant execute permission to the application role (adjust as needed for your setup)
-- GRANT EXECUTE ON FUNCTION size_smart.remove_view_if_exists(TEXT) TO your_app_role;
