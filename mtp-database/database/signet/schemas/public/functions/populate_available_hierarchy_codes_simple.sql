--liquibase formatted sql
--changeset srinivasgowda.sg@impactanalytics.co:serial_reset runOnChange:true stripComments:false splitStatements:false context:serial_reset labels:liquibase_project_start
--comment: populate_available_hierarchy_codes_simple 

DROP FUNCTION IF EXISTS public.populate_available_hierarchy_codes_simple(int4, int4);

CREATE OR REPLACE FUNCTION public.populate_available_hierarchy_codes_simple(batch_size integer DEFAULT 100000, max_range integer DEFAULT 1000000000)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
DECLARE
    inserted_count INTEGER := 0;
    total_gaps INTEGER;
BEGIN
    RAISE NOTICE 'Starting populate_available_hierarchy_codes_simple...';
    RAISE NOTICE 'Parameters: batch_size=%, max_range=%', batch_size, max_range;
    
    -- **Step 1: Cleanup**
    RAISE NOTICE 'Step 1: Truncating existing available_hierarchy_codes table...';
    TRUNCATE TABLE inventory_smart.available_hierarchy_codes RESTART IDENTITY;
    RAISE NOTICE 'Table truncated successfully';
    
    -- **Step 2: Count total gaps**
    WITH gaps AS (
        SELECT 
            hierarchy_code + 1 AS gap_start,
            LEAD(hierarchy_code, 1, max_range) OVER (ORDER BY hierarchy_code) - 1 AS gap_end
        FROM global.product_hierarchies_filter
        WHERE hierarchy_code < max_range
    )
    SELECT COUNT(*) INTO total_gaps
    FROM gaps g
    WHERE g.gap_end > g.gap_start;
    
    RAISE NOTICE 'Step 2: Found % gaps in hierarchy_code sequence (range < %)', total_gaps, max_range;
    
    -- **Step 3: Insert ALL gap IDs in one operation**
    RAISE NOTICE 'Step 3: Inserting all available hierarchy_codes in single batch...';
    
    INSERT INTO inventory_smart.available_hierarchy_codes (hierarchy_code)
    WITH gaps AS (
        SELECT 
            hierarchy_code + 1 AS gap_start,
            LEAD(hierarchy_code, 1, max_range) OVER (ORDER BY hierarchy_code) - 1 AS gap_end
        FROM global.product_hierarchies_filter
        WHERE hierarchy_code < max_range
    ),
    all_gap_ids AS (
        SELECT generate_series(g.gap_start, g.gap_end) AS hierarchy_code
        FROM gaps g
        WHERE g.gap_end > g.gap_start
        LIMIT batch_size
    )
    SELECT hierarchy_code
    FROM all_gap_ids
    ON CONFLICT (hierarchy_code) DO NOTHING;
    
    -- **Step 4: Get final count**
    GET DIAGNOSTICS inserted_count = ROW_COUNT;
    
    RAISE NOTICE 'Function completed successfully!';
    RAISE NOTICE 'Total gaps found: %', total_gaps;
    RAISE NOTICE 'Total hierarchy_codes inserted: %', inserted_count;
    
    RETURN inserted_count;
END;
$function$
;
