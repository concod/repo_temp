--liquibase formatted sql
--changeset liquibase:order_batching_create_cache_table runOnChange:true stripComments:false splitStatements:false context:MTP-116384 labels:MTP-116384
--comment: SP for order batching create cache table | removed only because of sync issue | creating unlooged table | adding security definer | adding now() instead of current_date
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.order_batching_create_cache_table(TEXT, TEXT, INTEGER[], TEXT);
CREATE OR REPLACE FUNCTION inventory_smart.order_batching_create_cache_table(
    p_cache_key TEXT,
    p_l0_name TEXT DEFAULT NULL,
    p_type_array INTEGER[] DEFAULT NULL,
    p_tenant_timezone TEXT DEFAULT 'UTC'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    v_table_name TEXT;
    v_l0_name_filter TEXT := '';
    v_type_filter TEXT := '';
    v_created_at_filter TEXT := '';
    v_insert_query TEXT;
BEGIN
    -- Validate cache_key
    IF p_cache_key IS NULL OR p_cache_key = '' THEN
        RAISE EXCEPTION 'cache_key cannot be null or empty';
    END IF;
    
    -- Sanitize cache_key to prevent SQL injection (alphanumeric and underscore)
    IF NOT (p_cache_key ~ '^[a-zA-Z0-9_]+$') THEN
        RAISE EXCEPTION 'Invalid cache_key format,alphanumeric characters and underscores are allowed';
    END IF;
    
    v_table_name := 'cache_result_' || p_cache_key;
    
    -- Check if table already exists
    IF EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'cache' 
        AND table_name = v_table_name
    ) THEN
        -- Table already exists, skip rest of the operations
        raise notice 'Table already exists: %', v_table_name;
        RETURN;
    END IF;
    
    -- Create table structure (we know it doesn't exist at this point)
    EXECUTE format('
        CREATE TABLE cache.%I (
            allocation_code TEXT PRIMARY KEY,
            l0_name TEXT
        )',
        v_table_name
    );
    
    -- Build l0_name filter if provided
    IF p_l0_name IS NOT NULL AND p_l0_name != '' THEN
        v_l0_name_filter := format('AND plan_code LIKE %L', '%' || p_l0_name || '%');
    END IF;
    
    -- Build type filter if provided
    IF p_type_array IS NOT NULL AND array_length(p_type_array, 1) > 0 THEN
        v_type_filter := format('AND type = ANY(%L)', p_type_array);
    END IF;
    
    -- Build created_at filter for today's date in tenant timezone
    v_created_at_filter := format(
        'AND (created_at AT TIME ZONE %L)::date = (now() AT TIME ZONE %L)::date',
        p_tenant_timezone,
        p_tenant_timezone
    );
    
    -- Insert data for this l0_name (ON CONFLICT handles duplicates)
    -- Use parameterized query to prevent SQL injection
    v_insert_query := format('
        INSERT INTO cache.%I (allocation_code, l0_name)
        SELECT pm.plan_code AS allocation_code,
               %L AS l0_name
        FROM inventory_smart.plan_master pm
        WHERE pm.status = 2
          AND pm.is_deleted = false
          %s
          %s
          %s
        ON CONFLICT (allocation_code) DO NOTHING',
        v_table_name,
        COALESCE(p_l0_name, ''),
        v_l0_name_filter,
        v_type_filter,
        v_created_at_filter
    );
    raise notice 'v_insert_query: %', v_insert_query;
    EXECUTE v_insert_query;
    
END;
$function$;


