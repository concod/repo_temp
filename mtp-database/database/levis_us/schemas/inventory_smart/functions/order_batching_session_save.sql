--liquibase formatted sql
--changeset order_batching_session_save:where clause to be in order with index runOnChange:true stripComments:false splitStatements:false context:MTP-117838 labels:MTP-117838
--comment: where clause to be in order with index
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.order_batching_session_save(jsonb, character varying);

CREATE OR REPLACE FUNCTION inventory_smart.order_batching_session_save(
    batch_updates jsonb, 
    character varying
)
RETURNS jsonb
LANGUAGE plpgsql
AS $function$
DECLARE
    _processed_count integer := 0;
    _failed_count integer := 0;
    _failed_records jsonb := '[]'::jsonb;
    _total_records integer;
    _pack_update_count integer;
    _size_update_count integer;
    _error_message text;
    _created_at_start timestamptz;
    _created_at_end timestamptz;
BEGIN
    _total_records := jsonb_array_length(batch_updates);
    
    _created_at_start := $2::date AT TIME ZONE 'America/Los_Angeles';
    _created_at_end := ($2::date + INTERVAL '1 day') AT TIME ZONE 'America/Los_Angeles';
    
    BEGIN
        DROP TABLE IF EXISTS temp_pack_updates;
        DROP TABLE IF EXISTS temp_size_updates;
        
        CREATE TEMP TABLE temp_pack_updates (
            allocation_code text,
            article text,
            store text,
            pack_dc_allocation jsonb,
            PRIMARY KEY (allocation_code, article, store)
        ) ON COMMIT DROP;
        
        CREATE TEMP TABLE temp_size_updates (
            allocation_code text,
            article text,
            store text,
            retail_size_cd text,
            allocated_total numeric,
            PRIMARY KEY (allocation_code, article, store, retail_size_cd)
        ) ON COMMIT DROP;
        
        INSERT INTO temp_pack_updates (allocation_code, article, store, pack_dc_allocation)
        SELECT 
            (rec->>'allocation_code')::text,
            (rec->>'article')::text,
            (rec->>'store')::text,
            rec->'pack_dc_allocation'
        FROM jsonb_array_elements(batch_updates) AS rec
        ON CONFLICT (allocation_code, article, store) 
        DO UPDATE SET pack_dc_allocation = EXCLUDED.pack_dc_allocation;
        
        INSERT INTO temp_size_updates (allocation_code, article, store, retail_size_cd, allocated_total)
        SELECT 
            (rec->>'allocation_code')::text,
            (rec->>'article')::text,
            (rec->>'store')::text,
            size_key.key,
            size_key.value::numeric
        FROM jsonb_array_elements(batch_updates) AS rec,
             jsonb_each_text(rec->'allocated_totals') AS size_key
        ON CONFLICT (allocation_code, article, store, retail_size_cd)
        DO UPDATE SET allocated_total = EXCLUDED.allocated_total;
        
        ANALYZE temp_pack_updates;
        ANALYZE temp_size_updates;
        
        UPDATE inventory_smart.create_allocation_result_flat_gurobi AS t
        SET 
            pack_dc_allocation = u.pack_dc_allocation,
            is_edited = true
        FROM temp_pack_updates AS u
        WHERE t.created_at >= _created_at_start
          AND t.created_at < _created_at_end
          AND t.allocation_code = u.allocation_code
          AND t.store = u.store
          AND t.article = u.article;
        
        GET DIAGNOSTICS _pack_update_count = ROW_COUNT;
        
        UPDATE inventory_smart.create_allocation_result_flat_gurobi AS t
        SET 
            allocated_total = s.allocated_total,
            is_edited = true
        FROM temp_size_updates AS s
        WHERE t.created_at >= _created_at_start
          AND t.created_at < _created_at_end
          AND t.allocation_code = s.allocation_code
          AND t.store = s.store
          AND t.article = s.article
          AND t.retail_size_cd = s.retail_size_cd;
        
        GET DIAGNOSTICS _size_update_count = ROW_COUNT;
        
        SELECT COUNT(*)
        INTO _processed_count
        FROM temp_pack_updates;
        
    EXCEPTION
        WHEN OTHERS THEN
            _error_message := SQLERRM;
            _failed_count := _total_records;
            _failed_records := jsonb_build_array(
                jsonb_build_object(
                    'error', _error_message,
                    'batch_failed', true
                )
            );

            RAISE NOTICE 'Error in bulk update: %', _error_message;
    END;

    -- Return summary of processing results
    RETURN jsonb_build_object(
        'success', true,
        'processed_count', _processed_count,
        'failed_count', _failed_count,
        'total_records', _total_records,
        'failed_records', _failed_records,
        'pack_updates', _pack_update_count,
        'size_updates', _size_update_count
    );

EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'processed_count', _processed_count,
            'failed_count', _failed_count,
            'total_records', COALESCE(_total_records, 0)
        );
END
$function$;