--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:fn_update_product_store_segment_attributes_bulk stripComments:false runOnChange:true splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing_restaurant.fn_update_product_store_segment_attributes_bulk

DROP FUNCTION IF EXISTS base_pricing_restaurant.fn_update_product_store_segment_attributes_bulk(jsonb, text, _text, _text, int4, text);

CREATE OR REPLACE FUNCTION base_pricing_restaurant.fn_update_product_store_segment_attributes_bulk(records jsonb, target_table_name text DEFAULT 'bp_product_store_attributes_mapping_v4'::text, update_on_fields text[] DEFAULT ARRAY['product_id'::text, 'store_id'::text, 'segment_id'::text], columns_to_update text[] DEFAULT NULL::text[], batch_size integer DEFAULT 10000, strategy text DEFAULT 'auto'::text)
 RETURNS TABLE(total_records bigint, updated_records bigint, failed_records bigint, not_found_records bigint, table_rows_updated bigint, start_time timestamp with time zone, end_time timestamp with time zone, duration interval, status text, error_message text, not_found_records_details jsonb, failed_records_details jsonb)
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_total_records BIGINT;
    v_updated_records BIGINT := 0;  -- Successfully updated records (input records)
    v_failed_records BIGINT := 0;
    v_not_found_records BIGINT := 0;
    v_table_rows_updated BIGINT := 0;  -- Total table rows updated in database
    v_batches_processed INTEGER := 0;
    v_start_time TIMESTAMPTZ;
    v_end_time TIMESTAMPTZ;
    v_offset BIGINT := 0;
    v_actual_batch_size INTEGER;
    v_strategy text;

    -- NEW: Track record details
    v_not_found_records_details jsonb := '[]'::jsonb;  -- Array of records not found
    v_failed_records_details jsonb := '[]'::jsonb;     -- Array of records that failed

    -- For progress monitoring
    v_last_progress_time TIMESTAMPTZ;
    v_progress_interval interval := interval '10 seconds';

    -- For dynamic strategy selection
    v_record_count_threshold_small INTEGER := 1000;
    v_record_count_threshold_medium INTEGER := 100000;
    v_record_count_threshold_large INTEGER := 1000000;
    v_record_count_threshold_huge INTEGER := 10000000;

    -- Temporary storage for failed records
    v_temp_failed_count BIGINT;
    -- Temporary storage for ROW_COUNT from UPDATE statements
    v_temp_row_count BIGINT;

    -- For dynamic update_on_fields
    v_conflict_clause TEXT;
    v_temp_table_columns TEXT;
    v_select_fields TEXT;
    v_select_fields_qualified TEXT; -- Qualified with table alias (t.field) for RETURNING clause
    v_temp_table_name TEXT;
    v_dynamic_sql TEXT;
    v_json_field_extraction TEXT; -- For extracting fields from JSONB
    v_where_clause TEXT; -- For UPDATE WHERE clause
    v_set_clause TEXT; -- For UPDATE SET clause
    v_cte_select_clause TEXT; -- For CTE SELECT clause (columns to extract from JSONB)
    v_status TEXT; -- Final status: COMPLETED, PARTIAL, or FAILED
    v_error_message TEXT; -- Summary error message if there are failures
    v_target_table_name TEXT := target_table_name; -- Use parameter value (default: 'bp_product_store_attributes_mapping_v4')
BEGIN
    v_start_time := clock_timestamp();
    v_last_progress_time := v_start_time;

    RAISE NOTICE '═══════════════════════════════════════════════════════════════════════';
    RAISE NOTICE '🚀 fn_update_product_store_segment_attributes_bulk started';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════════════';
    RAISE NOTICE '';

    -- Validate input
    IF records IS NULL OR jsonb_array_length(records) = 0 THEN
        RAISE WARNING 'Empty input data provided';
        RETURN QUERY SELECT
            0::bigint,  -- total_records
            0::bigint,  -- updated_records
            0::bigint,  -- failed_records
            0::bigint,  -- not_found_records
            0::bigint,  -- table_rows_updated
            v_start_time,
            clock_timestamp(),  -- end_time
            clock_timestamp() - v_start_time,  -- duration
            'ERROR'::text,  -- status
            'Empty input data'::text,  -- error_message
            '[]'::jsonb,  -- not_found_records_details
            '[]'::jsonb;  -- failed_records_details
        RAISE NOTICE '';
        RAISE NOTICE '═══════════════════════════════════════════════════════════════════════';
        RAISE NOTICE '💀 fn_update_product_store_segment_attributes_bulk ended (ERROR)';
        RAISE NOTICE '═══════════════════════════════════════════════════════════════════════';
        RETURN;
    END IF;

    -- Validate update_on_fields
    IF update_on_fields IS NULL OR array_length(update_on_fields, 1) IS NULL OR array_length(update_on_fields, 1) = 0 THEN
        RAISE WARNING 'update_on_fields cannot be empty';
        RETURN QUERY SELECT
            0::bigint,  -- total_records
            0::bigint,  -- updated_records
            0::bigint,  -- failed_records
            0::bigint,  -- not_found_records
            0::bigint,  -- table_rows_updated
            v_start_time,
            clock_timestamp(),  -- end_time
            clock_timestamp() - v_start_time,  -- duration
            'ERROR'::text,  -- status
            'update_on_fields cannot be empty'::text,  -- error_message
            '[]'::jsonb,  -- not_found_records_details
            '[]'::jsonb;  -- failed_records_details
        RAISE NOTICE '';
        RAISE NOTICE '═══════════════════════════════════════════════════════════════════════';
        RAISE NOTICE '💀 fn_update_product_store_segment_attributes_bulk ended (ERROR)';
        RAISE NOTICE '═══════════════════════════════════════════════════════════════════════';
        RETURN;
    END IF;

    -- RAISE NOTICE 'Validated input: update_on_fields = %', array_to_string(update_on_fields, ', ');
    RAISE NOTICE '✓ update_on_fields validated: %', array_to_string(update_on_fields, ', ');
    RAISE NOTICE '✓ columns_to_update: %', array_to_string(columns_to_update, ', ');


    -- Build dynamic conflict clause and temp table columns
    -- Conflict clause: (field1, field2, field3)
    v_conflict_clause := '(' || array_to_string(update_on_fields, ', ') || ')';

    -- Build WHERE clause for UPDATE: t.field1 = ud.field1::type AND t.field2 = ud.field2::type ...
    -- Cast JSONB values to match table column types (allows index usage on table columns)
    SELECT string_agg(
        format('t.%I = bd.%I::%s',
            field,
            field,
            COALESCE(
                (SELECT
                    CASE
                        WHEN data_type = 'ARRAY' THEN
                            -- For array types, use udt_name to get proper array type (e.g., _text -> text[])
                            CASE 
                                WHEN udt_name = '_text' THEN 'text[]'
                                WHEN udt_name = '_varchar' THEN 'varchar[]'
                                WHEN udt_name = '_int4' THEN 'int4[]'
                                WHEN udt_name = '_int8' THEN 'bigint[]'
                                WHEN udt_name = '_float8' THEN 'double precision[]'
                                WHEN udt_name = '_float4' THEN 'real[]'
                                WHEN udt_name = '_bool' THEN 'boolean[]'
                                WHEN udt_name = '_timestamp' THEN 'timestamp[]'
                                WHEN udt_name = '_timestamptz' THEN 'timestamptz[]'
                                ELSE regexp_replace(udt_name, '^_', '') || '[]'  -- Fallback: remove leading underscore and add []
                            END
                        WHEN data_type = 'double precision' THEN 'double precision'
                        WHEN data_type = 'character varying' THEN 'varchar'
                        WHEN data_type = 'timestamp with time zone' THEN 'timestamptz'
                        WHEN data_type = 'timestamp without time zone' THEN 'timestamp'
                        ELSE data_type
                    END
                 FROM information_schema.columns
                 WHERE table_schema = 'base_pricing_restaurant'
                 AND table_name = v_target_table_name
                 AND column_name = field),
                'text'  -- Default to text if column not found
            )
        ),
        ' AND '
    )
    INTO v_where_clause
    FROM unnest(update_on_fields) AS field;

    -- Temp table columns will be built after columns_to_update is determined
    -- (We need both update_on_fields and columns_to_update in the temp table)
    v_temp_table_columns := NULL;

    -- Build SELECT fields for temp table inserts (will be updated after columns_to_update is determined)
    v_select_fields := NULL;

    -- Build qualified SELECT fields for RETURNING clause (t.field1, t.field2, ...)
    SELECT string_agg(format('t.%I', field), ', ')
    INTO v_select_fields_qualified
    FROM unnest(update_on_fields) AS field;

    -- Build JSON field extraction will be rebuilt after columns_to_update is determined
    v_json_field_extraction := NULL;

    -- Build SET clause and CTE SELECT clause based on columns_to_update
    -- If columns_to_update is NULL, extract all keys from first JSONB element dynamically
    -- EXCEPT update_on_fields (which are used for matching, not updating)
    IF columns_to_update IS NULL OR array_length(columns_to_update, 1) IS NULL THEN
        -- Extract all column names dynamically from the first JSONB element
        -- Exclude update_on_fields since they're used for WHERE clause, not SET clause
        SELECT array_agg(key ORDER BY key)
        INTO columns_to_update
        FROM (
            SELECT jsonb_object_keys((records->0)::jsonb) AS key
        ) t
        WHERE key != ALL(update_on_fields);  -- Exclude update_on_fields

        -- If no columns found, return error
        IF columns_to_update IS NULL OR array_length(columns_to_update, 1) IS NULL THEN
            RETURN QUERY SELECT
                0::bigint, 0::bigint, 0::bigint, 0::bigint, 0::bigint,
                v_start_time, clock_timestamp(),
                clock_timestamp() - v_start_time,
                'ERROR'::text,
                'No columns to update found in JSONB data (excluding update_on_fields)'::text,
                '[]'::jsonb,
                '[]'::jsonb;
            RAISE NOTICE '';
            RAISE NOTICE '═══════════════════════════════════════════════════════════════════════';
            RAISE NOTICE '💀 fn_update_product_store_segment_attributes_bulk ended (ERROR)';
            RAISE NOTICE '═══════════════════════════════════════════════════════════════════════';
            RETURN;
        END IF;
    END IF;

    -- Now build temp table columns to include both update_on_fields and columns_to_update
    -- Temp table columns: field1 type1, field2 type2, ...
    -- For array columns, use proper array type; for others, use text
    -- Preserve order: update_on_fields first, then columns_to_update (excluding duplicates)
    WITH ordered_fields AS (
        SELECT field, ord FROM (
            SELECT field, ROW_NUMBER() OVER () as ord
            FROM unnest(update_on_fields) AS field
        ) t
        UNION ALL
        SELECT col, (SELECT MAX(ord) FROM (SELECT ROW_NUMBER() OVER () as ord FROM unnest(update_on_fields) AS field) t) + ROW_NUMBER() OVER () as ord
        FROM unnest(columns_to_update) AS col
        WHERE col != ALL(update_on_fields)  -- Exclude if already in update_on_fields
    )
    SELECT string_agg(
        CASE
            -- Check if column is an array type
            WHEN EXISTS (
                SELECT 1
                FROM information_schema.columns
                WHERE table_schema = 'base_pricing_restaurant'
                AND table_name = v_target_table_name
                AND column_name = field
                AND data_type = 'ARRAY'
            ) THEN
                -- For array columns, use the proper array type
                format('%I %s',
                    field,
                    COALESCE(
                        (SELECT
                            CASE 
                                WHEN udt_name = '_text' THEN 'text[]'
                                WHEN udt_name = '_varchar' THEN 'varchar[]'
                                WHEN udt_name = '_int4' THEN 'int4[]'
                                WHEN udt_name = '_int8' THEN 'bigint[]'
                                WHEN udt_name = '_float8' THEN 'double precision[]'
                                WHEN udt_name = '_float4' THEN 'real[]'
                                WHEN udt_name = '_bool' THEN 'boolean[]'
                                WHEN udt_name = '_timestamp' THEN 'timestamp[]'
                                WHEN udt_name = '_timestamptz' THEN 'timestamptz[]'
                                ELSE regexp_replace(udt_name, '^_', '') || '[]'
                            END
                         FROM information_schema.columns
                         WHERE table_schema = 'base_pricing_restaurant'
                         AND table_name = v_target_table_name
                         AND column_name = field),
                        'text[]'  -- Default to text[] if not found
                    )
                )
            ELSE
                -- For non-array columns, use text
                format('%I text', field)
        END,
        ', ' ORDER BY ord
    )
    INTO v_temp_table_columns
    FROM ordered_fields;

    -- Build SELECT fields for temp table inserts (both update_on_fields and columns_to_update)
    -- Must match the temp table column order
    WITH ordered_fields AS (
        SELECT field, ord FROM (
            SELECT field, ROW_NUMBER() OVER () as ord
            FROM unnest(update_on_fields) AS field
        ) t
        UNION ALL
        SELECT col, (SELECT MAX(ord) FROM (SELECT ROW_NUMBER() OVER () as ord FROM unnest(update_on_fields) AS field) t) + ROW_NUMBER() OVER () as ord
        FROM unnest(columns_to_update) AS col
        WHERE col != ALL(update_on_fields)  -- Exclude if already in update_on_fields
    )
    SELECT array_to_string(array_agg(field ORDER BY ord), ', ')
    INTO v_select_fields
    FROM ordered_fields;

    -- Build JSON field extraction for both update_on_fields and columns_to_update
    -- Preserve order: update_on_fields first, then columns_to_update
    -- This ensures the extraction order matches the temp table column order
    -- For array columns, convert JSONB arrays to PostgreSQL arrays
    WITH ordered_fields AS (
        SELECT field, ord FROM (
            SELECT field, ROW_NUMBER() OVER () as ord
            FROM unnest(update_on_fields) AS field
        ) t
        UNION ALL
        SELECT col, (SELECT MAX(ord) FROM (SELECT ROW_NUMBER() OVER () as ord FROM unnest(update_on_fields) AS field) t) + ROW_NUMBER() OVER () as ord
        FROM unnest(columns_to_update) AS col
        WHERE col != ALL(update_on_fields)  -- Exclude if already in update_on_fields
    )
    SELECT string_agg(
        CASE
            -- Check if column is an array type
            WHEN EXISTS (
                SELECT 1
                FROM information_schema.columns
                WHERE table_schema = 'base_pricing_restaurant'
                AND table_name = v_target_table_name
                AND column_name = field
                AND data_type = 'ARRAY'
            ) THEN
                -- For array columns: convert JSONB array to PostgreSQL array
                format('(CASE WHEN jsonb_typeof(j->''%s'') = ''array'' THEN ARRAY(SELECT jsonb_array_elements_text(j->''%s'')) ELSE NULL END) as %s', field, field, field)
            ELSE
                -- For non-array columns: extract as text
                format('(j->>''%s'') as %s', field, field)
        END,
        ', '
        ORDER BY ord
    ) INTO v_json_field_extraction
    FROM ordered_fields;

    -- Build SET clause dynamically from columns_to_update with proper type casting
    -- Query table schema to get column types and cast JSONB text values appropriately
    SELECT string_agg(
        CASE
            WHEN col = 'updated_at' THEN 'updated_at = CURRENT_TIMESTAMP'
            ELSE format('%I = bd.%I::%s',
                col,
                col,
                COALESCE(
                    (SELECT
                        CASE
                            WHEN data_type = 'ARRAY' THEN
                                -- For array types, use udt_name to get proper array type (e.g., _text -> text[])
                                CASE 
                                    WHEN udt_name = '_text' THEN 'text[]'
                                    WHEN udt_name = '_varchar' THEN 'varchar[]'
                                    WHEN udt_name = '_int4' THEN 'int4[]'
                                    WHEN udt_name = '_int8' THEN 'bigint[]'
                                    WHEN udt_name = '_float8' THEN 'double precision[]'
                                    WHEN udt_name = '_float4' THEN 'real[]'
                                    WHEN udt_name = '_bool' THEN 'boolean[]'
                                    WHEN udt_name = '_timestamp' THEN 'timestamp[]'
                                    WHEN udt_name = '_timestamptz' THEN 'timestamptz[]'
                                    ELSE regexp_replace(udt_name, '^_', '') || '[]'  -- Fallback: remove leading underscore and add []
                                END
                            WHEN data_type = 'double precision' THEN 'double precision'
                            WHEN data_type = 'character varying' THEN 'varchar'
                            WHEN data_type = 'timestamp with time zone' THEN 'timestamptz'
                            WHEN data_type = 'timestamp without time zone' THEN 'timestamp'
                            ELSE data_type
                        END
                     FROM information_schema.columns
                     WHERE table_schema = 'base_pricing_restaurant'
                     AND table_name = v_target_table_name
                     AND column_name = col),
                    'text'  -- Default to text if column not found
                )
            )
        END,
        E',\n                        '
        ORDER BY ord
    ) INTO v_set_clause
    FROM unnest(columns_to_update) WITH ORDINALITY AS t(col, ord);

    -- Build CTE SELECT clause dynamically from columns_to_update
    -- For array columns, convert JSONB arrays to PostgreSQL arrays
    SELECT string_agg(
        CASE
            -- Check if column is an array type
            WHEN EXISTS (
                SELECT 1
                FROM information_schema.columns
                WHERE table_schema = 'base_pricing_restaurant'
                AND table_name = v_target_table_name
                AND column_name = col
                AND data_type = 'ARRAY'
            ) THEN
                -- For array columns: convert JSONB array to PostgreSQL array
                format('(CASE WHEN jsonb_typeof(j->''%s'') = ''array'' THEN ARRAY(SELECT jsonb_array_elements_text(j->''%s'')) ELSE NULL END) as %s', col, col, col)
            ELSE
                -- For non-array columns: extract as text
                format('(j->>''%s'') as %s', col, col)
        END,
        E',\n                        '
        ORDER BY ord
    ) INTO v_cte_select_clause
    FROM unnest(columns_to_update) WITH ORDINALITY AS t(col, ord);

    -- Always include update_on_fields in CTE SELECT (needed for WHERE clause)
    -- But only if they're not already in columns_to_update
    DECLARE
        v_needed_fields_extraction TEXT;
    BEGIN
        WITH needed_fields AS (
            SELECT field FROM unnest(update_on_fields) AS field
            EXCEPT
            SELECT col FROM unnest(columns_to_update) AS col
        )
        SELECT string_agg(
            CASE
                -- Check if field is an array type
                WHEN EXISTS (
                    SELECT 1
                    FROM information_schema.columns
                    WHERE table_schema = 'base_pricing_restaurant'
                    AND table_name = v_target_table_name
                    AND column_name = field
                    AND data_type = 'ARRAY'
                ) THEN
                    -- For array columns: convert JSONB array to PostgreSQL array
                    format('(CASE WHEN jsonb_typeof(j->''%s'') = ''array'' THEN ARRAY(SELECT jsonb_array_elements_text(j->''%s'')) ELSE NULL END) as %s', field, field, field)
                ELSE
                    -- For non-array columns: extract as text
                    format('(j->>''%s'') as %s', field, field)
            END,
            E',\n                        '
        ) INTO v_needed_fields_extraction
        FROM needed_fields;

        -- Prepend update_on_fields to CTE SELECT if they're not already included
        -- Note: v_json_field_extraction is preserved for exception handlers (contains all update_on_fields)
        IF v_needed_fields_extraction IS NOT NULL THEN
            v_cte_select_clause := v_needed_fields_extraction || E',\n                        ' || v_cte_select_clause;
        END IF;
    END;

    -- Get total record count
    SELECT COUNT(*) INTO v_total_records
    FROM jsonb_array_elements(records);

    -- Auto-select strategy if 'auto'
    IF strategy = 'auto' THEN
        IF v_total_records <= v_record_count_threshold_small THEN
            v_strategy := 'direct';
            v_actual_batch_size := v_total_records; -- Process all at once
        ELSIF v_total_records <= v_record_count_threshold_medium THEN
            v_strategy := 'batch';
            v_actual_batch_size := LEAST(batch_size, 10000);
        ELSIF v_total_records <= v_record_count_threshold_large THEN
            v_strategy := 'batch_commit';
            v_actual_batch_size := LEAST(batch_size, 5000);
        ELSIF v_total_records <= v_record_count_threshold_huge THEN
            v_strategy := 'batch_temp';
            v_actual_batch_size := LEAST(batch_size, 1000);
        ELSE
            v_strategy := 'massive';
            v_actual_batch_size := LEAST(batch_size, 500);
        END IF;
    ELSE
        v_strategy := strategy;
        v_actual_batch_size := batch_size;
    END IF;

    RAISE NOTICE '🔄 Processing % input records with strategy: %', v_total_records, v_strategy;

    -- Choose execution path based on strategy
    CASE v_strategy
        WHEN 'direct' THEN
            -- For small datasets (≤ 1K): Single UPDATE
            RAISE NOTICE '⚡ Using direct strategy for % records', v_total_records;

            -- Create temp table dynamically with original_record column for tracking
            v_dynamic_sql := format('CREATE TEMPORARY TABLE IF NOT EXISTS temp_direct_results (%s, updated boolean, original_record jsonb) ON COMMIT DROP', v_temp_table_columns);
            RAISE NOTICE '📋 Temp table creation query (direct strategy)';
            EXECUTE v_dynamic_sql;

            -- Build dynamic SQL for UPDATE with original record tracking
            -- First, insert all input records into temp table with original_record
            v_dynamic_sql := format('
                INSERT INTO temp_direct_results
                SELECT %s, false as updated, j as original_record
                FROM jsonb_array_elements($1) j',
                v_json_field_extraction);
            EXECUTE v_dynamic_sql USING records;
            RAISE NOTICE '📥 Inserted % input records into temp table', v_total_records;

            -- Log sample temp table data (max 2 records)
            DECLARE
                v_sample_json jsonb;
            BEGIN
                v_dynamic_sql := 'SELECT jsonb_agg(original_record) FROM (SELECT original_record FROM temp_direct_results LIMIT 2) t';
                EXECUTE v_dynamic_sql INTO v_sample_json;
                IF v_sample_json IS NOT NULL AND jsonb_array_length(v_sample_json) > 0 THEN
                    RAISE NOTICE '📋 Sample input data (max 2 records): %', v_sample_json;
                END IF;
            END;

            -- Execute the actual UPDATE
            v_dynamic_sql := format('
                WITH update_data AS (
                    SELECT %s
                    FROM temp_direct_results
                )
                UPDATE base_pricing_restaurant.%I t
                SET
                    %s
                FROM update_data bd
                WHERE %s',
                v_select_fields, v_target_table_name, v_set_clause, v_where_clause);
            RAISE NOTICE '📝 UPDATE query: %', v_dynamic_sql;
            EXECUTE v_dynamic_sql;
            -- Capture table rows updated from this UPDATE
            GET DIAGNOSTICS v_temp_row_count = ROW_COUNT;
            v_table_rows_updated := v_table_rows_updated + COALESCE(v_temp_row_count, 0);
            -- Note: ROW_COUNT gives table rows updated, not input records
            -- We count input records separately below

            -- Mark which input records were successfully updated by checking if they exist in table
            v_dynamic_sql := format('
                UPDATE temp_direct_results tdr
                SET updated = true
                WHERE EXISTS (
                    SELECT 1
                    FROM base_pricing_restaurant.%I t
                    WHERE %s
                )',
                v_target_table_name,
                -- Build WHERE clause matching temp table to actual table
                (SELECT string_agg(
                    format('t.%I = tdr.%I::%s',
                        field, field,
                        COALESCE(
                            (SELECT
                                CASE
                                    WHEN data_type = 'ARRAY' THEN
                                        -- For array types, use udt_name to get proper array type (e.g., _text -> text[])
                                        CASE 
                                            WHEN udt_name = '_text' THEN 'text[]'
                                            WHEN udt_name = '_varchar' THEN 'varchar[]'
                                            WHEN udt_name = '_int4' THEN 'int4[]'
                                            WHEN udt_name = '_int8' THEN 'bigint[]'
                                            WHEN udt_name = '_float8' THEN 'double precision[]'
                                            WHEN udt_name = '_float4' THEN 'real[]'
                                            WHEN udt_name = '_bool' THEN 'boolean[]'
                                            WHEN udt_name = '_timestamp' THEN 'timestamp[]'
                                            WHEN udt_name = '_timestamptz' THEN 'timestamptz[]'
                                            ELSE regexp_replace(udt_name, '^_', '') || '[]'  -- Fallback: remove leading underscore and add []
                                        END
                                    WHEN data_type = 'double precision' THEN 'double precision'
                                    WHEN data_type = 'character varying' THEN 'varchar'
                                    WHEN data_type = 'timestamp with time zone' THEN 'timestamptz'
                                    WHEN data_type = 'timestamp without time zone' THEN 'timestamp'
                                    ELSE data_type
                                END
                             FROM information_schema.columns
                             WHERE table_schema = 'base_pricing_restaurant'
                             AND table_name = v_target_table_name
                             AND column_name = field),
                            'text'
                        )
                    ),
                    ' AND '
                )
                FROM unnest(update_on_fields) AS field));
            EXECUTE v_dynamic_sql;

            -- Collect results: updated, not_found, failed
            -- Count INPUT RECORDS, not table rows
            DECLARE
                v_not_found_json jsonb;
                v_updated_count BIGINT;
            BEGIN
                -- Count how many INPUT RECORDS were successfully updated
                v_dynamic_sql := 'SELECT COUNT(*) FROM temp_direct_results WHERE updated = true';
                EXECUTE v_dynamic_sql INTO v_updated_count;
                v_updated_records := COALESCE(v_updated_count, 0);

                -- Collect not found records (not updated)
                v_dynamic_sql := 'SELECT COALESCE(jsonb_agg(original_record), ''[]''::jsonb) FROM temp_direct_results WHERE updated = false';
                EXECUTE v_dynamic_sql INTO v_not_found_json;
                v_not_found_records_details := COALESCE(v_not_found_json, '[]'::jsonb);
                v_not_found_records := jsonb_array_length(v_not_found_records_details);

                -- No actual failures in direct strategy
                v_failed_records := 0;
                v_failed_records_details := '[]'::jsonb;

                -- Show separate messages for updated and not found records
                IF v_updated_records > 0 THEN
                    RAISE NOTICE '✅ Updated % input records (table_rows_updated: %)', v_updated_records, v_table_rows_updated;
                END IF;
                IF v_not_found_records > 0 THEN
                    RAISE NOTICE '🔍 Not found % input records', v_not_found_records;
                END IF;

            END;
            v_batches_processed := 1;

        WHEN 'batch' THEN
            -- For medium datasets (1K-100K): Batched UPDATE
            RAISE NOTICE '📦 Using batch strategy for % records', v_total_records;

            -- Initialize batch counter to 1 (1-based numbering)
            v_batches_processed := 1;

            -- Create temp table dynamically with original_record and error_message
            v_dynamic_sql := format('CREATE TEMPORARY TABLE IF NOT EXISTS temp_batch_results (%s, updated boolean, batch_num integer, error_message text, original_record jsonb) ON COMMIT DROP', v_temp_table_columns);
            RAISE NOTICE '📋 Temp table created for batch strategy';
            EXECUTE v_dynamic_sql;

            WHILE v_offset < v_total_records LOOP
                BEGIN
                    -- First insert all batch records into temp with original_record
                    v_dynamic_sql := format('
                        INSERT INTO temp_batch_results
                        SELECT %s, false as updated, %s, NULL::text, j as original_record
                        FROM jsonb_array_elements($1) j
                        LIMIT %s
                        OFFSET %s',
                        v_json_field_extraction, v_batches_processed, v_actual_batch_size, v_offset);
                    EXECUTE v_dynamic_sql USING records;

                    -- Log sample temp table data for first batch (max 2 records)
                    IF v_batches_processed = 1 THEN
                        DECLARE
                            v_sample_batch jsonb;
                        BEGIN
                            v_dynamic_sql := 'SELECT jsonb_agg(original_record) FROM (SELECT original_record FROM temp_batch_results WHERE batch_num = $1 LIMIT 2) t';
                            EXECUTE v_dynamic_sql INTO v_sample_batch USING v_batches_processed;
                            IF v_sample_batch IS NOT NULL AND jsonb_array_length(v_sample_batch) > 0 THEN
                                RAISE NOTICE '📋 Sample temp_batch_results data (batch %, max 2 records): %', v_batches_processed, v_sample_batch;
                            END IF;
                        END;
                    END IF;

                    -- Execute UPDATE
                    v_dynamic_sql := format('
                        WITH batch_data AS (
                            SELECT %s
                            FROM temp_batch_results
                            WHERE batch_num = $1
                        )
                        UPDATE base_pricing_restaurant.%I t
                        SET
                            %s
                        FROM batch_data bd
                        WHERE %s',
                        v_select_fields, v_target_table_name, v_set_clause, v_where_clause);
                    EXECUTE v_dynamic_sql USING v_batches_processed;
                    -- Capture table rows updated from this UPDATE
                    GET DIAGNOSTICS v_temp_row_count = ROW_COUNT;
                    v_table_rows_updated := v_table_rows_updated + COALESCE(v_temp_row_count, 0);
                    -- Note: ROW_COUNT gives table rows updated, not input records
                    -- We count input records separately below

                    -- Mark updated records
                    v_dynamic_sql := format('
                        UPDATE temp_batch_results tbr
                        SET updated = true
                        WHERE batch_num = $1
                        AND EXISTS (
                            SELECT 1
                            FROM base_pricing_restaurant.%I t
                            WHERE %s
                        )',
                        v_target_table_name,
                        -- Build WHERE clause
                        (SELECT string_agg(
                            format('t.%I = tbr.%I::%s',
                                field, field,
                                COALESCE(
                                    (SELECT
                                        CASE
                                            WHEN data_type = 'ARRAY' THEN
                                                -- For array types, use udt_name to get proper array type (e.g., _text -> text[])
                                                CASE 
                                                    WHEN udt_name = '_text' THEN 'text[]'
                                                    WHEN udt_name = '_varchar' THEN 'varchar[]'
                                                    WHEN udt_name = '_int4' THEN 'int4[]'
                                                    WHEN udt_name = '_int8' THEN 'bigint[]'
                                                    WHEN udt_name = '_float8' THEN 'double precision[]'
                                                    WHEN udt_name = '_float4' THEN 'real[]'
                                                    WHEN udt_name = '_bool' THEN 'boolean[]'
                                                    WHEN udt_name = '_timestamp' THEN 'timestamp[]'
                                                    WHEN udt_name = '_timestamptz' THEN 'timestamptz[]'
                                                    ELSE regexp_replace(udt_name, '^_', '') || '[]'  -- Fallback: remove leading underscore and add []
                                                END
                                            WHEN data_type = 'double precision' THEN 'double precision'
                                            WHEN data_type = 'character varying' THEN 'varchar'
                                            WHEN data_type = 'timestamp with time zone' THEN 'timestamptz'
                                            WHEN data_type = 'timestamp without time zone' THEN 'timestamp'
                                            ELSE data_type
                                        END
                                     FROM information_schema.columns
                                     WHERE table_schema = 'base_pricing_restaurant'
                                     AND table_name = v_target_table_name
                                     AND column_name = field),
                                    'text'
                                )
                            ),
                            ' AND '
                        )
                        FROM unnest(update_on_fields) AS field));
                    EXECUTE v_dynamic_sql USING v_batches_processed;

                    -- Count INPUT RECORDS updated in this batch (not table rows)
                    DECLARE
                        v_batch_updated_count BIGINT;
                    BEGIN
                        v_dynamic_sql := 'SELECT COUNT(*) FROM temp_batch_results WHERE batch_num = $1 AND updated = true';
                        EXECUTE v_dynamic_sql INTO v_batch_updated_count USING v_batches_processed;
                        RAISE NOTICE '📦 Batch %: Updated % input records', v_batches_processed, COALESCE(v_batch_updated_count, 0);
                    END;

                EXCEPTION
                    WHEN OTHERS THEN
                        -- If batch fails, mark all in batch as failed with error message
                        DECLARE
                            v_error_msg TEXT := SQLERRM;
                            v_batch_emoji TEXT;
                        BEGIN
                            -- Only show failure message for batch 1 and onwards (skip batch 0)
                            -- v_batches_processed is already 1-based (set to 1 before loop), so use it directly
                            IF v_batches_processed >= 1 THEN
                                -- Use different emojis for different batch numbers to make them distinct
                                v_batch_emoji := CASE (v_batches_processed % 5)
                                    WHEN 1 THEN '🔵'  -- Blue circle for batch 1, 6, 11...
                                    WHEN 2 THEN '🟠'  -- Orange circle for batch 2, 7, 12...
                                    WHEN 3 THEN '🟡'  -- Yellow circle for batch 3, 8, 13...
                                    WHEN 4 THEN '🟢'  -- Green circle for batch 4, 9, 14...
                                    ELSE '⚫'         -- Black circle for batch 5, 10, 15...
                                END;
                                RAISE WARNING '% Batch %: FAILED: %', v_batch_emoji, v_batches_processed, v_error_msg;
                            END IF;
                            -- Insert failed batch records with error message
                            v_dynamic_sql := format('
                                INSERT INTO temp_batch_results
                                SELECT %s, false as updated, %s, %L, j as original_record
                                FROM jsonb_array_elements($1) j
                                LIMIT %s
                                OFFSET %s',
                                v_json_field_extraction, v_batches_processed, v_error_msg, v_actual_batch_size, v_offset);
                            EXECUTE v_dynamic_sql USING records;
                        END;
                END;

                v_offset := v_offset + v_actual_batch_size;
                v_batches_processed := v_batches_processed + 1;

                -- Progress notification
                IF clock_timestamp() - v_last_progress_time >= v_progress_interval THEN
                    RAISE NOTICE '📈 Progress: %/% (%.1f%%)',
                        LEAST(v_offset, v_total_records),
                        v_total_records,
                        (LEAST(v_offset, v_total_records)::float / v_total_records * 100);
                    v_last_progress_time := clock_timestamp();
                END IF;
            END LOOP;

            -- Collect results
            DECLARE
                v_updated_count BIGINT;
                v_failed_count BIGINT;
                v_not_found_count BIGINT;
                v_failed_json jsonb;
                v_not_found_json jsonb;
                v_error_messages TEXT;
            BEGIN
                -- Count and collect updated records
                v_dynamic_sql := 'SELECT COUNT(*) FROM temp_batch_results WHERE updated = true';
                EXECUTE v_dynamic_sql INTO v_updated_count;
                v_updated_records := v_updated_count;

                -- Collect failed records (those with error_message)
                v_dynamic_sql := 'SELECT COALESCE(jsonb_agg(original_record), ''[]''::jsonb) FROM temp_batch_results WHERE updated = false AND error_message IS NOT NULL';
                EXECUTE v_dynamic_sql INTO v_failed_json;
                v_failed_records_details := COALESCE(v_failed_json, '[]'::jsonb);
                v_failed_records := jsonb_array_length(v_failed_records_details);

                -- Collect distinct error messages from failed records
                IF v_failed_records > 0 THEN
                    v_dynamic_sql := 'SELECT string_agg(DISTINCT error_message, ''; '') FROM temp_batch_results WHERE updated = false AND error_message IS NOT NULL';
                    EXECUTE v_dynamic_sql INTO v_error_messages;
                END IF;

                -- Store error messages for later use in final error_message field
                IF v_error_messages IS NOT NULL THEN
                    -- Store in a variable that will be used later
                    v_error_message := v_error_messages;
                END IF;

                -- Collect not found records (those without error_message but not updated)
                v_dynamic_sql := 'SELECT COALESCE(jsonb_agg(original_record), ''[]''::jsonb) FROM temp_batch_results WHERE updated = false AND error_message IS NULL';
                EXECUTE v_dynamic_sql INTO v_not_found_json;
                v_not_found_records_details := COALESCE(v_not_found_json, '[]'::jsonb);
                v_not_found_records := jsonb_array_length(v_not_found_records_details);

                -- Show separate messages for updated, failed, and not found records
                IF v_updated_records > 0 THEN
                    RAISE NOTICE '✅ Updated % input records', v_updated_records;
                END IF;
                IF v_failed_records > 0 THEN
                    RAISE NOTICE '💥 Input records %: FAILED', v_failed_records;
                    IF v_error_messages IS NOT NULL THEN
                        RAISE NOTICE '❗ Error details: %', v_error_messages;
                    END IF;
                END IF;
                IF v_not_found_records > 0 THEN
                    RAISE NOTICE '🔍 Not found % input records', v_not_found_records;
                END IF;

                RAISE NOTICE '📊 Batch strategy results: updated=% input records, failed=% input records, not_found=% input records',
                    v_updated_records, v_failed_records, v_not_found_records;
            END;

        WHEN 'batch_commit' THEN
            -- For large datasets (100K-1M): Batched with periodic commits
            RAISE NOTICE '💾 Using batch_commit strategy for % records', v_total_records;

            -- Create temp table dynamically with original_record and error_message
            v_dynamic_sql := format('CREATE TEMPORARY TABLE IF NOT EXISTS temp_commit_results (%s, updated boolean, batch_num integer, error_message text, original_record jsonb) ON COMMIT DROP', v_temp_table_columns);
            RAISE NOTICE '📋 Temp table created for batch_commit strategy';
            EXECUTE v_dynamic_sql;

            -- Log sample input data (max 2 records) before processing
            DECLARE
                v_sample_input jsonb;
            BEGIN
                SELECT jsonb_agg(j) INTO v_sample_input
                FROM (
                    SELECT j
                    FROM jsonb_array_elements(records) j
                    LIMIT 2
                ) t;
                IF v_sample_input IS NOT NULL AND jsonb_array_length(v_sample_input) > 0 THEN
                    RAISE NOTICE '📋 Sample input data (max 2 records): %', v_sample_input;
                END IF;
            END;

            DECLARE
                v_batch_num INTEGER := 0;
                v_batch_records INTEGER;
            BEGIN
                WHILE v_offset < v_total_records LOOP
                    v_batch_num := v_batch_num + 1;
                    v_batch_records := 0;

                    -- Count records in this batch
                    SELECT COUNT(*) INTO v_batch_records
                    FROM (
                        SELECT 1
                        FROM jsonb_array_elements(records) j
                        LIMIT v_actual_batch_size
                        OFFSET v_offset
                    ) t;

                    -- Start a new transaction for each major batch
                    IF v_batch_num > 1 THEN
                        COMMIT;
                        BEGIN
                            -- Process in sub-transaction using dynamic SQL
                            v_dynamic_sql := format('
                                WITH batch_data AS (
                                    SELECT
                                        %s
                                    FROM jsonb_array_elements($1) j
                                    LIMIT %s
                                    OFFSET %s
                                ),
                                batch_update AS (
                                    UPDATE base_pricing_restaurant.%I t
                                    SET
                                        %s
                                    FROM batch_data bd
                                    WHERE %s
                                    RETURNING %s, true as updated
                                )
                                INSERT INTO temp_commit_results
                                SELECT %s, updated, %s, NULL::text, NULL::jsonb
                                FROM batch_update',
                                v_cte_select_clause, v_actual_batch_size, v_offset, v_target_table_name, v_set_clause, v_where_clause, v_select_fields_qualified, v_select_fields, v_batch_num);

                            RAISE NOTICE 'Final UPDATE query (batch_commit strategy, batch %): %', v_batch_num, v_dynamic_sql;
                            EXECUTE v_dynamic_sql USING records;

                            -- Capture table rows updated from this UPDATE
                            GET DIAGNOSTICS v_temp_failed_count = ROW_COUNT;
                            v_table_rows_updated := v_table_rows_updated + COALESCE(v_temp_failed_count, 0);

                            -- If no rows updated but batch had records, mark as not found (not failed - no error occurred)
                            IF v_temp_failed_count = 0 AND v_batch_records > 0 THEN
                                v_dynamic_sql := format('
                                    INSERT INTO temp_commit_results
                                    SELECT %s, false as updated, %s, NULL::text, j as original_record
                                    FROM jsonb_array_elements($1) j
                                    LIMIT %s
                                    OFFSET %s',
                                    v_json_field_extraction, v_batch_num, v_actual_batch_size, v_offset);
                                EXECUTE v_dynamic_sql USING records;
                            END IF;

                        EXCEPTION
                            WHEN OTHERS THEN
                                DECLARE
                                    v_error_msg TEXT := SQLERRM;
                                    v_batch_emoji TEXT;
                                BEGIN
                                    -- Use different emojis for different batch numbers
                                    v_batch_emoji := CASE (v_batch_num % 5)
                                        WHEN 1 THEN '🔵'  -- Blue circle
                                        WHEN 2 THEN '🟠'  -- Orange circle
                                        WHEN 3 THEN '🟡'  -- Yellow circle
                                        WHEN 4 THEN '🟢'  -- Green circle
                                        ELSE '⚫'         -- Black circle
                                    END;
                                    RAISE WARNING '% Batch %: FAILED: %', v_batch_emoji, v_batch_num, v_error_msg;
                                    -- Mark all in batch as failed with error message
                                    v_dynamic_sql := format('
                                        INSERT INTO temp_commit_results
                                        SELECT %s, false as updated, %s, %L, j as original_record
                                        FROM jsonb_array_elements($1) j
                                        LIMIT %s
                                        OFFSET %s',
                                        v_json_field_extraction, v_batch_num, v_error_msg, v_actual_batch_size, v_offset);
                                    EXECUTE v_dynamic_sql USING records;
                                END;
                        END;
                    ELSE
                        -- First batch in main transaction
                        v_dynamic_sql := format('
                            WITH batch_data AS (
    SELECT
                                    %s
                                FROM jsonb_array_elements($1) j
                                LIMIT %s
                                OFFSET %s
                            ),
                            batch_update AS (
                                UPDATE base_pricing_restaurant.%I t
                                SET
                                    %s
                                FROM batch_data bd
                                WHERE %s
                                RETURNING %s, true as updated
                            )
                            INSERT INTO temp_commit_results
                            SELECT %s, updated, %s, NULL::text, NULL::jsonb
                            FROM batch_update',
                            v_cte_select_clause, v_actual_batch_size, v_offset, v_target_table_name, v_set_clause, v_where_clause, v_select_fields_qualified, v_select_fields, v_batch_num);

                        RAISE NOTICE 'Final UPDATE query (batch_commit strategy, batch %): %', v_batch_num, v_dynamic_sql;
                        EXECUTE v_dynamic_sql USING records;

                        -- Capture table rows updated from this UPDATE
                        GET DIAGNOSTICS v_temp_failed_count = ROW_COUNT;
                        v_table_rows_updated := v_table_rows_updated + COALESCE(v_temp_failed_count, 0);

                        -- If no rows updated but batch had records, mark as not found (not failed - no error occurred)
                        IF v_temp_failed_count = 0 AND v_batch_records > 0 THEN
                            v_dynamic_sql := format('
                                WITH batch_data AS (
                                    SELECT %s
                                    FROM jsonb_array_elements($1) j
                                    LIMIT %s
                                    OFFSET %s
                                )
                                INSERT INTO temp_commit_results
                                SELECT %s, false as updated, %s, NULL::text, j as original_record
                                FROM jsonb_array_elements($1) j
                                LIMIT %s
                                OFFSET %s',
                                v_json_field_extraction, v_actual_batch_size, v_offset, v_select_fields, v_batch_num, v_actual_batch_size, v_offset);
                            EXECUTE v_dynamic_sql USING records;
                        END IF;
                    END IF;

                    v_offset := v_offset + v_actual_batch_size;
                    v_batches_processed := v_batches_processed + 1;

                    -- Progress notification every 10 batches
                    IF v_batch_num % 10 = 0 THEN
                        SELECT COUNT(*) INTO v_temp_failed_count
                        FROM temp_commit_results WHERE updated = false;

                        RAISE NOTICE '📈 Progress: %/% (%.1f%%) - Batch % - Not Found: %',
                            LEAST(v_offset, v_total_records),
                            v_total_records,
                            (LEAST(v_offset, v_total_records)::float / v_total_records * 100),
                            v_batch_num,
                            v_temp_failed_count;
                        -- Small pause to reduce load
                        PERFORM pg_sleep(0.01);
                    END IF;
                END LOOP;

                -- Collect final results
                -- Count distinct INPUT RECORDS (by update_on_fields), not table rows
                DECLARE
                    v_updated_count BIGINT;
                    v_failed_count BIGINT;
                    v_not_found_count BIGINT;
                    v_failed_json jsonb;
                    v_not_found_json jsonb;
                    v_error_messages TEXT;
                BEGIN
                    -- Count distinct input records that were updated (using update_on_fields as key)
                    v_dynamic_sql := format('
                        SELECT COUNT(DISTINCT (%s))
                        FROM temp_commit_results
                        WHERE updated = true',
                        v_select_fields);
                    EXECUTE v_dynamic_sql INTO v_updated_count;
                    v_updated_records := COALESCE(v_updated_count, 0);

                    -- Collect distinct failed records (those with error_message)
                    v_dynamic_sql := format('
                        SELECT COALESCE(jsonb_agg(DISTINCT original_record), ''[]''::jsonb)
                        FROM (
                            SELECT DISTINCT ON (%s) original_record
                            FROM temp_commit_results
                            WHERE updated = false AND error_message IS NOT NULL
                            ORDER BY %s
                        ) t',
                        v_select_fields, v_select_fields);
                    EXECUTE v_dynamic_sql INTO v_failed_json;
                    v_failed_records_details := COALESCE(v_failed_json, '[]'::jsonb);
                    v_failed_records := jsonb_array_length(v_failed_records_details);

                    -- Collect distinct error messages from failed records
                    IF v_failed_records > 0 THEN
                        v_dynamic_sql := 'SELECT string_agg(DISTINCT error_message, ''; '') FROM temp_commit_results WHERE updated = false AND error_message IS NOT NULL';
                        EXECUTE v_dynamic_sql INTO v_error_messages;
                    END IF;

                    -- Store error messages for later use in final error_message field
                    IF v_error_messages IS NOT NULL THEN
                        v_error_message := v_error_messages;
                    END IF;

                    -- Collect distinct not found records (those without error_message but not updated)
                    v_dynamic_sql := format('
                        SELECT COALESCE(jsonb_agg(DISTINCT original_record), ''[]''::jsonb)
                        FROM (
                            SELECT DISTINCT ON (%s) original_record
                            FROM temp_commit_results
                            WHERE updated = false AND error_message IS NULL
                            ORDER BY %s
                        ) t',
                        v_select_fields, v_select_fields);
                    EXECUTE v_dynamic_sql INTO v_not_found_json;
                    v_not_found_records_details := COALESCE(v_not_found_json, '[]'::jsonb);
                    v_not_found_records := jsonb_array_length(v_not_found_records_details);

                    -- Show separate messages for updated, failed, and not found records
                    IF v_updated_records > 0 THEN
                        RAISE NOTICE '✅ Updated % input records', v_updated_records;
                    END IF;
                    IF v_failed_records > 0 THEN
                        RAISE NOTICE '💥 input records %: FAILED', v_failed_records;
                        IF v_error_messages IS NOT NULL THEN
                            RAISE NOTICE '❗ Error details: %', v_error_messages;
                        END IF;
                    END IF;
                    IF v_not_found_records > 0 THEN
                        RAISE NOTICE '🔍 Not found % input records', v_not_found_records;
                    END IF;

                    RAISE NOTICE '📊 Batch_commit strategy results: updated=% input records, failed=% input records, not_found=% input records',
                        v_updated_records, v_failed_records, v_not_found_records;
                END;
            END;

        ELSE
            -- For other strategies (batch_temp, massive), use similar patterns as original function
            -- but adapted for the v4 table structure
            RAISE NOTICE '🔄 Using % strategy for % records', v_strategy, v_total_records;

            -- Simplified implementation for batch_temp and massive strategies
            -- Create temp table dynamically with original_record and error_message
            v_dynamic_sql := format('CREATE TEMPORARY TABLE IF NOT EXISTS temp_v4_results (%s, updated boolean, batch_num integer, error_message text, original_record jsonb) ON COMMIT DROP', v_temp_table_columns);
            RAISE NOTICE '📋 Temp table created for % strategy', v_strategy;
            EXECUTE v_dynamic_sql;

            -- Log sample input data (max 2 records) before processing
            DECLARE
                v_sample_input jsonb;
            BEGIN
                SELECT jsonb_agg(j) INTO v_sample_input
                FROM (
                    SELECT j
                    FROM jsonb_array_elements(records) j
                    LIMIT 2
                ) t;
                IF v_sample_input IS NOT NULL AND jsonb_array_length(v_sample_input) > 0 THEN
                    RAISE NOTICE '📋 Sample input data (max 2 records): %', v_sample_input;
                END IF;
            END;

            WHILE v_offset < v_total_records LOOP
                BEGIN
                    v_dynamic_sql := format('
                        WITH batch_data AS (
                            SELECT
                                %s
                            FROM jsonb_array_elements($1) j
                            LIMIT %s
                            OFFSET %s
                        ),
                        batch_update AS (
                            UPDATE base_pricing_restaurant.%I t
                            SET
                                %s
                            FROM batch_data bd
                            WHERE %s
                            RETURNING %s, true as updated
                        )
                        INSERT INTO temp_v4_results
                        SELECT %s, updated, %s, NULL::text, NULL::jsonb
                        FROM batch_update',
                        v_cte_select_clause, v_actual_batch_size, v_offset, v_target_table_name, v_set_clause, v_where_clause, v_select_fields_qualified, v_select_fields, v_batches_processed);

                    RAISE NOTICE 'Final UPDATE query (% strategy, batch %): %', v_strategy, v_batches_processed, v_dynamic_sql;
                    EXECUTE v_dynamic_sql USING records;

                    -- Capture table rows updated from this UPDATE
                    GET DIAGNOSTICS v_temp_failed_count = ROW_COUNT;
                    v_table_rows_updated := v_table_rows_updated + COALESCE(v_temp_failed_count, 0);

                    -- If no rows updated, mark as not found (not failed - no error occurred)
                    IF v_temp_failed_count = 0 THEN
                        v_dynamic_sql := format('
                            INSERT INTO temp_v4_results
                            SELECT %s, false as updated, %s, NULL::text, j as original_record
                            FROM jsonb_array_elements($1) j
                            LIMIT %s
                            OFFSET %s',
                            v_json_field_extraction, v_batches_processed, v_actual_batch_size, v_offset);
                        EXECUTE v_dynamic_sql USING records;
                    END IF;

                EXCEPTION
                    WHEN OTHERS THEN
                        DECLARE
                            v_error_msg TEXT := SQLERRM;
                            v_batch_emoji TEXT;
                        BEGIN
                            -- Use different emojis for different batch numbers
                            v_batch_emoji := CASE (v_batches_processed % 5)
                                WHEN 1 THEN '🔵'  -- Blue circle
                                WHEN 2 THEN '🟠'  -- Orange circle
                                WHEN 3 THEN '🟡'  -- Yellow circle
                                WHEN 4 THEN '🟢'  -- Green circle
                                ELSE '⚫'         -- Black circle
                            END;
                            RAISE WARNING '% Batch %: FAILED: %', v_batch_emoji, v_batches_processed, v_error_msg;
                            -- Mark all in batch as failed with error message
                            v_dynamic_sql := format('
                                INSERT INTO temp_v4_results
                                SELECT %s, false as updated, %s, %L, j as original_record
                                FROM jsonb_array_elements($1) j
                                LIMIT %s
                                OFFSET %s',
                                v_json_field_extraction, v_batches_processed, v_error_msg, v_actual_batch_size, v_offset);
                            EXECUTE v_dynamic_sql USING records;
                        END;
                END;

                v_offset := v_offset + v_actual_batch_size;
                v_batches_processed := v_batches_processed + 1;

                -- Commit periodically for large strategies
                IF v_strategy IN ('batch_temp', 'massive') AND v_batches_processed % 50 = 0 THEN
                    COMMIT;
                    BEGIN
                        RAISE NOTICE 'Processed % batches', v_batches_processed;
                    END;
                END IF;

                -- Progress notification
                IF clock_timestamp() - v_last_progress_time >= interval '30 seconds' THEN
                    RAISE NOTICE '📈 Progress: %/% batches',
                        LEAST(v_offset, v_total_records),
                        v_total_records;
                    v_last_progress_time := clock_timestamp();
                END IF;
            END LOOP;

            -- Collect results
            -- Count distinct INPUT RECORDS (by update_on_fields), not table rows
            DECLARE
                v_updated_count BIGINT;
                v_failed_count BIGINT;
                v_not_found_count BIGINT;
                v_failed_json jsonb;
                v_not_found_json jsonb;
                v_error_messages TEXT;
            BEGIN
                -- Count distinct input records that were updated (using update_on_fields as key)
                v_dynamic_sql := format('
                    SELECT COUNT(DISTINCT (%s))
                    FROM temp_v4_results
                    WHERE updated = true',
                    v_select_fields);
                EXECUTE v_dynamic_sql INTO v_updated_count;
                v_updated_records := COALESCE(v_updated_count, 0);

                -- Collect distinct failed records (those with error_message)
                v_dynamic_sql := format('
                    SELECT COALESCE(jsonb_agg(DISTINCT original_record), ''[]''::jsonb)
                    FROM (
                        SELECT DISTINCT ON (%s) original_record
                        FROM temp_v4_results
                        WHERE updated = false AND error_message IS NOT NULL
                        ORDER BY %s
                    ) t',
                    v_select_fields, v_select_fields);
                EXECUTE v_dynamic_sql INTO v_failed_json;
                v_failed_records_details := COALESCE(v_failed_json, '[]'::jsonb);
                v_failed_records := jsonb_array_length(v_failed_records_details);

                -- Collect distinct error messages from failed records
                IF v_failed_records > 0 THEN
                    v_dynamic_sql := 'SELECT string_agg(DISTINCT error_message, ''; '') FROM temp_v4_results WHERE updated = false AND error_message IS NOT NULL';
                    EXECUTE v_dynamic_sql INTO v_error_messages;
                END IF;

                -- Store error messages for later use in final error_message field
                IF v_error_messages IS NOT NULL THEN
                    v_error_message := v_error_messages;
                END IF;

                -- Collect distinct not found records (those without error_message but not updated)
                v_dynamic_sql := format('
                    SELECT COALESCE(jsonb_agg(DISTINCT original_record), ''[]''::jsonb)
                    FROM (
                        SELECT DISTINCT ON (%s) original_record
                        FROM temp_v4_results
                        WHERE updated = false AND error_message IS NULL
                        ORDER BY %s
                    ) t',
                    v_select_fields, v_select_fields);
                EXECUTE v_dynamic_sql INTO v_not_found_json;
                v_not_found_records_details := COALESCE(v_not_found_json, '[]'::jsonb);
                v_not_found_records := jsonb_array_length(v_not_found_records_details);

                -- Show separate messages for updated, failed, and not found records
                IF v_updated_records > 0 THEN
                    RAISE NOTICE '✅ Updated % input records', v_updated_records;
                END IF;
                IF v_failed_records > 0 THEN
                    RAISE NOTICE '💥 input records %: FAILED', v_failed_records;
                    IF v_error_messages IS NOT NULL THEN
                        RAISE NOTICE '❗ Error details: %', v_error_messages;
                    END IF;
                END IF;
                IF v_not_found_records > 0 THEN
                    RAISE NOTICE '🔍 Not found % input records', v_not_found_records;
                END IF;

                RAISE NOTICE '📊 % strategy results: updated=% input records, failed=% input records, not_found=% input records',
                    v_strategy, v_updated_records, v_failed_records, v_not_found_records;
            END;
    END CASE;

    v_end_time := clock_timestamp();

    -- Validate counts: not_found = total - updated - failed
    IF v_not_found_records != (v_total_records - v_updated_records - v_failed_records) THEN
        RAISE WARNING 'Count mismatch detected. Recalculating not_found_records. total=%, updated=%, failed=%, not_found=%',
            v_total_records, v_updated_records, v_failed_records, v_not_found_records;
        v_not_found_records := v_total_records - v_updated_records - v_failed_records;
    END IF;

    -- Determine status based on results
    -- Note: v_error_message may have been set by strategy-specific result collection
    IF v_failed_records > 0 THEN
        IF v_failed_records = v_total_records THEN
            -- All records failed
            v_status := 'FAILED';
            -- Use actual error message if collected, otherwise use generic message
            IF v_error_message IS NULL OR v_error_message = '' THEN
                v_error_message := format('All %s records failed to update', v_total_records);
            ELSE
                -- Prepend count to actual error message
                v_error_message := format('All %s records failed: %s', v_total_records, v_error_message);
            END IF;
        ELSE
            -- Some records failed, some succeeded
            v_status := 'PARTIAL';
            -- Use actual error message if collected, otherwise use generic message
            IF v_error_message IS NULL OR v_error_message = '' THEN
                v_error_message := format('%s out of %s records failed to update', v_failed_records, v_total_records);
            ELSE
                -- Prepend count to actual error message
                v_error_message := format('%s out of %s records failed: %s', v_failed_records, v_total_records, v_error_message);
            END IF;
        END IF;
    ELSIF v_updated_records > 0 THEN
        -- At least some records succeeded
        v_status := 'COMPLETED';
        v_error_message := NULL;
    ELSIF v_not_found_records > 0 THEN
        -- All records were not found (but no failures - function worked correctly)
        v_status := 'COMPLETED';
        v_error_message := NULL;
    ELSE
        -- No records processed (shouldn't happen, but handle it)
        v_status := 'COMPLETED';
        v_error_message := NULL;
    END IF;

    -- Return final results
    RETURN QUERY SELECT
        v_total_records,
        v_updated_records,
        v_failed_records,
        v_not_found_records,
        v_table_rows_updated,
        v_start_time,
        v_end_time,
        (v_end_time - v_start_time) as duration,
        v_status,
        v_error_message,
        COALESCE(v_not_found_records_details, '[]'::jsonb),
        COALESCE(v_failed_records_details, '[]'::jsonb);

    RAISE NOTICE '✨ Update completed: total=%, updated=% input records (table_rows_updated=%), failed=%, not_found=%, duration: %',
        v_total_records, v_updated_records, v_table_rows_updated, v_failed_records, v_not_found_records, (v_end_time - v_start_time);
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════════════';
    -- Show appropriate status based on results
    -- If some records were updated, show success even if there are not found records
    IF v_failed_records > 0 THEN
        RAISE NOTICE '💀 fn_update_product_store_segment_attributes_bulk ended (with failures)';
    ELSIF v_updated_records > 0 THEN
        RAISE NOTICE '✅ fn_update_product_store_segment_attributes_bulk ended';
    ELSIF v_not_found_records > 0 THEN
        RAISE NOTICE '🔍 fn_update_product_store_segment_attributes_bulk ended (with not found records)';
    ELSE
        RAISE NOTICE '✅ fn_update_product_store_segment_attributes_bulk ended';
    END IF;
    RAISE NOTICE '═══════════════════════════════════════════════════════════════════════';

EXCEPTION
    WHEN OTHERS THEN
        v_end_time := clock_timestamp();

        -- Log error details
        RAISE WARNING 'Error occurred: % (SQLSTATE: %)', SQLERRM, SQLSTATE;

        -- Calculate failed records: total - updated - not_found
        v_failed_records := COALESCE(v_total_records, 0) - COALESCE(v_updated_records, 0) - COALESCE(v_not_found_records, 0);

        -- If we have input data, mark all remaining as failed
        IF v_failed_records > 0 AND records IS NOT NULL THEN
            -- Try to collect failed records from input (if possible)
            DECLARE
                v_failed_json jsonb;
                v_processed_count BIGINT;
            BEGIN
                -- Calculate how many records were processed (updated + not_found)
                v_processed_count := COALESCE(v_updated_records, 0) + COALESCE(v_not_found_records, 0);

                -- Get records that weren't processed
                v_failed_json := (
                    SELECT jsonb_agg(item)
                    FROM jsonb_array_elements(records) WITH ORDINALITY AS t(item, idx)
                    WHERE idx > v_processed_count
                    LIMIT v_failed_records
                );
                v_failed_records_details := COALESCE(v_failed_json, '[]'::jsonb);
            EXCEPTION
                WHEN OTHERS THEN
                    v_failed_records_details := '[]'::jsonb;
            END;
        ELSE
            v_failed_records_details := '[]'::jsonb;
        END IF;

        RETURN QUERY SELECT
            COALESCE(v_total_records, 0)::bigint,
            COALESCE(v_updated_records, 0)::bigint,
            COALESCE(v_failed_records, 0)::bigint,
            COALESCE(v_not_found_records, 0)::bigint,
            COALESCE(v_table_rows_updated, 0)::bigint,
            v_start_time,
            v_end_time,
            (v_end_time - v_start_time),
            'ERROR'::text,
            format('Error: %s (SQLSTATE: %s)', SQLERRM, SQLSTATE)::text,  -- Only errors in message
            COALESCE(v_not_found_records_details, '[]'::jsonb),
            COALESCE(v_failed_records_details, '[]'::jsonb);

        RAISE NOTICE 'Update failed after %: %', (v_end_time - v_start_time), SQLERRM;
        RAISE NOTICE '';
        RAISE NOTICE '═══════════════════════════════════════════════════════════════════════';
        RAISE NOTICE '💀 fn_update_product_store_segment_attributes_bulk ended (ERROR)';
        RAISE NOTICE '═══════════════════════════════════════════════════════════════════════';
END;
$function$
;
