--liquibase formatted sql
--changeset subhasis.jena@impactanalytics.co:fn_update_samll_batch_records_dynamic stripComments:false runOnChange:true splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.fn_update_samll_batch_records_dynamic

DROP FUNCTION IF EXISTS base_pricing.fn_update_samll_batch_records_dynamic;

-- DROP FUNCTION base_pricing.fn_update_samll_batch_records_dynamic(text, _text, _text, jsonb, int4, int4);

CREATE OR REPLACE FUNCTION base_pricing.fn_update_samll_batch_records_dynamic(p_table_name text, p_set_columns text[], p_where_columns text[], p_batch_data jsonb, p_min_records integer DEFAULT 1, p_max_records integer DEFAULT 100)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_update_query TEXT;
    v_total_updated INTEGER := 0;
    v_record JSONB;
    v_where_condition TEXT;
    v_set_clause TEXT;
    v_updated_count INTEGER := 0;
    v_batch_size INTEGER;
    v_record_counter INTEGER := 0;
    v_start_time TIMESTAMP;
    v_function_start_time TIMESTAMP := clock_timestamp();
BEGIN
    v_batch_size := jsonb_array_length(p_batch_data);
    
    -- 🎯 LOG: Function start
    RAISE NOTICE '🚀 START: fn_update_samll_batch_records_dynamic';
    RAISE NOTICE '   Table: %, SET columns: %, WHERE columns: %, Batch size: %', 
        p_table_name, p_set_columns, p_where_columns, v_batch_size;
    RAISE NOTICE '   Range guard: MIN=% records, MAX=% records', p_min_records, p_max_records;
    
    -- 🎯 RANGE GUARD: Validate batch size (MIN and MAX)
    IF v_batch_size < p_min_records THEN
        RAISE EXCEPTION 'fn_update_samll_batch_records_dynamic: Batch size % is below minimum required %', 
                       v_batch_size, p_min_records;
    END IF;
    
    IF v_batch_size > p_max_records THEN
        RAISE EXCEPTION 'fn_update_samll_batch_records_dynamic: Batch size % exceeds maximum allowed %', 
                       v_batch_size, p_max_records;
    END IF;

    -- 🎯 LOG: Range validation passed
    RAISE NOTICE '   ✅ Range validation passed: % records within %-% range', 
        v_batch_size, p_min_records, p_max_records;

    FOR v_record IN SELECT * FROM jsonb_array_elements(p_batch_data)
    LOOP
        v_record_counter := v_record_counter + 1;
        v_start_time := clock_timestamp();
        
        -- 🎯 LOG: Processing record
        RAISE NOTICE '--- Processing Record %/% ---', v_record_counter, v_batch_size;

        -- Build WHERE condition
        v_where_condition := (
            SELECT string_agg(
                format('%I = %L', col, v_record->>col), ' AND '
            ) FROM unnest(p_where_columns) AS col
        );
        
        RAISE NOTICE '   WHERE condition: %', v_where_condition;

        v_set_clause := (
            SELECT string_agg(
                format('%I = %L', col, v_record->>col), ', '
            ) FROM unnest(p_set_columns) AS col
            WHERE v_record ? col
        );
        
        -- 🎯 LOG: Available SET columns
        RAISE NOTICE '   Available SET columns: %', 
            (SELECT array_agg(col) FROM unnest(p_set_columns) AS col WHERE v_record ? col);
        RAISE NOTICE '   SET clause: %', v_set_clause;

        -- Skip if no SET columns to update for this record
        IF v_set_clause IS NULL THEN
            RAISE NOTICE '   ⚠️ SKIPPING: No SET columns found in this record';
            CONTINUE;
        END IF;

        -- Build the final UPDATE query
        v_update_query := format(
            'UPDATE base_pricing.%I SET %s WHERE %s',
            p_table_name,
            v_set_clause,
            v_where_condition
        );
        
        -- 🎯 LOG: Final query
        RAISE NOTICE '   📝 EXECUTING QUERY: %', v_update_query;

        -- Execute optimized UPDATE
        EXECUTE v_update_query;
        GET DIAGNOSTICS v_updated_count = ROW_COUNT;
        
        -- 🎯 LOG: Update result
        RAISE NOTICE '   ✅ UPDATE RESULT: % rows affected (Time: % ms)', 
            v_updated_count, 
            round(extract(epoch from (clock_timestamp() - v_start_time)) * 1000, 2);
        
        v_total_updated := v_total_updated + v_updated_count;
    END LOOP;

    -- 🎯 LOG: Function completion
    RAISE NOTICE '================================';
    RAISE NOTICE '🎯 COMPLETE: % total records updated out of %', v_total_updated, v_batch_size;
    RAISE NOTICE '📊 Success rate: %', 
        CASE WHEN v_batch_size > 0 THEN round((v_total_updated::FLOAT / v_batch_size) * 100, 1) || '%' ELSE 'N/A' END;
    RAISE NOTICE '⏱️  Total execution time: % ms', 
        round(extract(epoch from (clock_timestamp() - v_function_start_time)) * 1000, 2);
    RAISE NOTICE '   Average time per record: % ms', 
        CASE WHEN v_batch_size > 0 THEN round((extract(epoch from (clock_timestamp() - v_function_start_time)) * 1000) / v_batch_size, 2) ELSE 0 END;
    RAISE NOTICE '================================';

    RETURN v_total_updated;

EXCEPTION
    WHEN OTHERS THEN
        -- 🎯 LOG: Error details
        RAISE NOTICE '❌ ERROR at Record %/%: %', v_record_counter, v_batch_size, SQLERRM;
        RAISE NOTICE '   Query that failed: %', v_update_query;
        RAISE NOTICE '   Table: %, SET columns: %, WHERE columns: %', 
            p_table_name, p_set_columns, p_where_columns;
        RAISE NOTICE '   Range: MIN=%, MAX=%', p_min_records, p_max_records;
        RETURN 0;
END;
$function$
;