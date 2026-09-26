--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:fn_update_competitor_mappings_debug_10 stripComments:false runOnChange:true splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.fn_update_competitor_mappings_debug_10

DROP FUNCTION IF EXISTS base_pricing.fn_update_competitor_mappings_debug;

CREATE OR REPLACE FUNCTION base_pricing.fn_update_competitor_mappings_debug(competitor_mappings jsonb, batch_size integer DEFAULT 1000)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
DECLARE
    total_updated INT := 0;
    current_batch JSONB;
    batch_start INT := 1;
    batch_end INT;
    batch_updates INT;
    update_sql TEXT;
    bucket_types TEXT[];
    current_bucket_name TEXT;
    item JSONB;
    match_count INT;
BEGIN
    -- Debug: Show input
    RAISE NOTICE 'Input JSON: %', competitor_mappings;
    
    -- Get bucket types
    SELECT array_agg(bc.bucket_name) INTO bucket_types
    FROM base_pricing.bp_bucket_config bc;
    RAISE NOTICE 'Bucket types: %', bucket_types;
    
    -- Process in batches
    batch_end := LEAST(jsonb_array_length(competitor_mappings), batch_size);
    
    WHILE batch_start <= jsonb_array_length(competitor_mappings) LOOP
        current_batch := competitor_mappings->(batch_start-1)->(batch_end-1);
        item := current_batch->0;
        
        -- Check for matching records
        EXECUTE 'SELECT COUNT(*) FROM base_pricing.bp_product_store_attributes_mapping
                WHERE product_id = $1
                AND channel_id = $2
                AND zone_structure = $3
                AND price_zone = $4'
        INTO match_count
        USING (item->>'product_id')::INT8, 
              (item->>'channel_id')::INT4,
              item->>'zone_structure',
              item->>'price_zone';
        
        RAISE NOTICE 'Found % matching records for product_id=%, channel_id=%, zone_structure=%, price_zone=%',
            match_count,
            item->>'product_id',
            item->>'channel_id',
            item->>'zone_structure',
            item->>'price_zone';
            
        -- Build dynamic SQL
        update_sql := 'WITH batch AS (SELECT '
                   || '(item->>''product_id'')::INT8 AS product_id, '
                   || '(item->>''channel_id'')::INT4 AS channel_id, '
                   || '(item->>''zone_structure'')::TEXT AS zone_structure, '
                   || '(item->>''price_zone'')::TEXT AS price_zone';
        
        -- Add bucket fields
        FOREACH current_bucket_name IN ARRAY bucket_types LOOP
            IF jsonb_typeof(item->(current_bucket_name||'_bucket')) IS NOT NULL THEN
                update_sql := update_sql || ', (item->>'''||current_bucket_name||'_bucket'')::TEXT[] AS '||current_bucket_name||'_bucket';
            END IF;
            IF jsonb_typeof(item->(current_bucket_name||'_mode')) IS NOT NULL THEN
                update_sql := update_sql || ', (item->>'''||current_bucket_name||'_mode'')::TEXT AS '||current_bucket_name||'_mode';
            END IF;
        END LOOP;
        
        update_sql := update_sql || ' FROM jsonb_array_elements($1) AS item) '
                   || 'UPDATE base_pricing.bp_product_store_attributes_mapping AS target '
                   || 'SET updated_at = CURRENT_TIMESTAMP';
        
        -- Add SET clauses
        FOREACH current_bucket_name IN ARRAY bucket_types LOOP
            IF jsonb_typeof(item->(current_bucket_name||'_bucket')) IS NOT NULL THEN
                update_sql := update_sql || ', '||current_bucket_name||'_bucket = COALESCE(b.'||current_bucket_name||'_bucket, target.'||current_bucket_name||'_bucket)';
            END IF;
            IF jsonb_typeof(item->(current_bucket_name||'_mode')) IS NOT NULL THEN
                update_sql := update_sql || ', '||current_bucket_name||'_mode = COALESCE(b.'||current_bucket_name||'_mode, target.'||current_bucket_name||'_mode)';
            END IF;
        END LOOP;
        
        update_sql := update_sql || ' FROM batch b '
                   || 'WHERE target.product_id = b.product_id '
                   || 'AND target.channel_id = b.channel_id '
                   || 'AND target.zone_structure = b.zone_structure '
                   || 'AND target.price_zone = b.price_zone';
        
        RAISE NOTICE 'Executing: %', update_sql;
        
        -- Execute
        EXECUTE update_sql USING current_batch;
        GET DIAGNOSTICS batch_updates = ROW_COUNT;
        total_updated := total_updated + batch_updates;
        
        RAISE NOTICE 'Batch %-%: Updated % rows', batch_start, batch_end, batch_updates;
        
        batch_start := batch_end + 1;
        batch_end := LEAST(batch_start + batch_size - 1, jsonb_array_length(competitor_mappings));
    END LOOP;
    
    RETURN total_updated;
END;
$function$
;