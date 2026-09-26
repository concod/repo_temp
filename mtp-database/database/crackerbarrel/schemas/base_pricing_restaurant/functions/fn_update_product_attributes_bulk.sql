--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:fn_update_product_attributes_bulk_3 stripComments:false runOnChange:true splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing_restaurant.fn_update_product_attributes_bulk_3

DROP FUNCTION IF EXISTS base_pricing_restaurant.fn_update_product_attributes_bulk(jsonb, text, _text, _text, int4, text);

CREATE OR REPLACE FUNCTION base_pricing_restaurant.fn_update_product_attributes_bulk(records jsonb, target_table_name text DEFAULT 'bp_product_attributes_mapping'::text, update_on_fields text[] DEFAULT ARRAY['product_id'::text], columns_to_update text[] DEFAULT NULL::text[], batch_size integer DEFAULT 10000, strategy text DEFAULT 'auto'::text)
 RETURNS TABLE(total_records bigint, updated_records bigint, failed_records bigint, not_found_records bigint, table_rows_updated bigint, start_time timestamp with time zone, end_time timestamp with time zone, duration interval, status text, error_message text, not_found_records_details jsonb, failed_records_details jsonb)
 LANGUAGE plpgsql
  SECURITY DEFINER
AS $function$
DECLARE
    v_total_records BIGINT;
    v_updated_records BIGINT := 0;  -- Successfully updated records (input records)
    v_failed_records BIGINT := 0;
    v_not_found_records BIGINT := 0;
    v_table_rows_updated BIGINT := 0;  -- Total table rows updated in database
    v_batches_processed INTEGER := 0;

    -- Track record details
    v_not_found_records_details jsonb := '[]'::jsonb;  -- Array of records not found
    v_failed_records_details jsonb := '[]'::jsonb;     -- Array of records that failed
    v_start_time TIMESTAMPTZ;
    v_end_time TIMESTAMPTZ;
    v_offset BIGINT := 0;
    v_actual_batch_size INTEGER;
    v_strategy text;

    -- Progress monitoring
    v_last_progress_time TIMESTAMPTZ;
    v_progress_interval interval := interval '10 seconds';

    -- Strategy thresholds
    v_record_count_threshold_small INTEGER := 1000;
    v_record_count_threshold_medium INTEGER := 50000;
    v_record_count_threshold_large INTEGER := 500000;

    -- For error handling
    v_error_context text;
    v_temp_failed_count BIGINT;
    -- Temporary storage for ROW_COUNT from UPDATE statements
    v_status TEXT; -- Final status: COMPLETED, PARTIAL, or FAILED
    v_error_message TEXT; -- Summary error message if there are failures
    v_temp_row_count BIGINT;
    v_batch_num INTEGER := 0;

    -- For columns to update
    v_columns_to_update TEXT[];
    v_target_table_name TEXT := target_table_name; -- Use parameter value (default: 'bp_product_attributes_mapping')

BEGIN
    v_start_time := clock_timestamp();
    v_last_progress_time := v_start_time;

    RAISE NOTICE '═══════════════════════════════════════════════════════════════════════';
    RAISE NOTICE '🚀 fn_update_product_attributes_bulk started';
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
        RAISE NOTICE '💀 fn_update_product_attributes_bulk ended (ERROR)';
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
            'update_on_fields cannot be empty'::text,
            '[]'::jsonb,  -- not_found_records_details
            '[]'::jsonb;  -- failed_records_details
        RAISE NOTICE '';
        RAISE NOTICE '═══════════════════════════════════════════════════════════════════════';
        RAISE NOTICE '💀 fn_update_product_attributes_bulk ended (ERROR)';
        RAISE NOTICE '═══════════════════════════════════════════════════════════════════════';
        RETURN;
    END IF;

    -- Set columns_to_update from parameter
    -- If NULL or empty, auto-detect all keys from first JSONB element EXCEPT update_on_fields
    IF columns_to_update IS NULL OR array_length(columns_to_update, 1) IS NULL THEN
        -- Extract all column names dynamically from the first JSONB element
        -- Exclude update_on_fields since they're used for matching, not updating
        SELECT array_agg(key ORDER BY key)
        INTO v_columns_to_update
        FROM (
            SELECT jsonb_object_keys((records->0)::jsonb) AS key
        ) t
        WHERE key != ALL(update_on_fields);  -- Exclude update_on_fields

        -- If no columns found, return error
        IF v_columns_to_update IS NULL OR array_length(v_columns_to_update, 1) = 0 THEN
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
            RAISE NOTICE '💀 fn_update_product_attributes_bulk ended (ERROR)';
            RAISE NOTICE '═══════════════════════════════════════════════════════════════════════';
            RETURN;
        END IF;
    ELSE
        v_columns_to_update := columns_to_update;
    END IF;

    -- RAISE NOTICE 'Validated input: update_on_fields = %', array_to_string(update_on_fields, ', ');
    RAISE NOTICE '✓ update_on_fields: %', array_to_string(update_on_fields, ', ');
    RAISE NOTICE '✓ columns_to_update: %', array_to_string(v_columns_to_update, ', ');
    RAISE NOTICE '✓ target_table_name: %', v_target_table_name;


    -- Get total record count
    SELECT COUNT(*) INTO v_total_records
    FROM jsonb_array_elements(records);

    -- Auto-select strategy if 'auto'
    IF strategy = 'auto' THEN
        IF v_total_records <= v_record_count_threshold_small THEN
            v_strategy := 'direct';
            v_actual_batch_size := v_total_records;
        ELSIF v_total_records <= v_record_count_threshold_medium THEN
            v_strategy := 'batch';
            v_actual_batch_size := LEAST(batch_size, 10000);
        ELSIF v_total_records <= v_record_count_threshold_large THEN
            v_strategy := 'batch_optimized';
            v_actual_batch_size := LEAST(batch_size, 5000);
        ELSE
            v_strategy := 'bulk_temp_table';
            v_actual_batch_size := LEAST(batch_size, 1000);
        END IF;
    ELSE
        v_strategy := strategy;
        v_actual_batch_size := batch_size;
    END IF;

    RAISE NOTICE '🔄 Processing % input records with strategy: %', v_total_records, v_strategy;

    -- Create temporary table for results
    CREATE TEMPORARY TABLE IF NOT EXISTS temp_product_results (
        product_id bigint PRIMARY KEY,
        updated boolean,
        error_message text,
        batch_num integer
    ) ON COMMIT DROP;

    -- Choose execution path based on strategy
    CASE v_strategy
        WHEN 'direct' THEN
            -- For small datasets (≤ 1K): Single UPDATE
            RAISE NOTICE '⚡ Using direct strategy for % records', v_total_records;
            BEGIN
                WITH numbered_records AS (
                    SELECT
                        (j->>'product_id')::bigint as product_id,
                        -- Build attributes JSON array from the flat structure
                        (
                            SELECT jsonb_agg(
                                jsonb_build_object(
                                    'attribute_name', key,
                                    'attribute_value', jsonb_build_object('current', value)
                                )
                            )
                            FROM jsonb_each_text(j - 'product_id')
                            WHERE key = ANY(v_columns_to_update)
                        ) as attributes,
                        ROW_NUMBER() OVER (PARTITION BY (j->>'product_id')::bigint ORDER BY (SELECT 1)) as rn
                    FROM jsonb_array_elements(records) j
                ),
                aggregated_data AS (
                    -- For duplicate product_ids, take attributes from the last record (highest row number)
                    SELECT DISTINCT ON (product_id)
                        product_id,
                        attributes
                    FROM numbered_records
                    ORDER BY product_id, rn DESC
                ),
                upsert_result AS (
                    INSERT INTO base_pricing_restaurant.bp_product_attributes_mapping (
                        product_id,
                        attributes,
                        updated_at
                    )
                    SELECT
                        ad.product_id,
                        COALESCE(ad.attributes, '[]'::jsonb),
                        CURRENT_TIMESTAMP
                    FROM aggregated_data ad
                    ON CONFLICT (product_id)
                    DO UPDATE SET
                        attributes = (
                            SELECT jsonb_agg(attr)
                            FROM (
                                SELECT existing_attr AS attr
                                FROM jsonb_array_elements(COALESCE(bp_product_attributes_mapping.attributes, '[]'::jsonb)) AS existing_attr
                                WHERE NOT EXISTS (
                                    SELECT 1 FROM jsonb_array_elements(EXCLUDED.attributes) AS new_attr
                                    WHERE new_attr->>'attribute_name' = existing_attr->>'attribute_name'
                                )
                                UNION ALL
                                SELECT new_attr AS attr FROM jsonb_array_elements(EXCLUDED.attributes) AS new_attr
                            ) combined
                        ),
                        updated_at = EXCLUDED.updated_at
                    RETURNING product_id, true as updated
                )
                INSERT INTO temp_product_results
                SELECT product_id, updated, NULL, 1 FROM upsert_result;
                -- Capture table rows updated from this UPSERT
                GET DIAGNOSTICS v_temp_row_count = ROW_COUNT;
                v_table_rows_updated := v_table_rows_updated + COALESCE(v_temp_row_count, 0);

                -- Log sample input data (max 2 records)
                DECLARE
                    v_sample_data jsonb;
                BEGIN
                    SELECT jsonb_agg(j) INTO v_sample_data
                    FROM (
                        SELECT j
                        FROM jsonb_array_elements(records) j
                        LIMIT 2
                    ) t;
                    IF v_sample_data IS NOT NULL AND jsonb_array_length(v_sample_data) > 0 THEN
                        RAISE NOTICE '📋 Sample input data (max 2 records): %', v_sample_data;
                    END IF;
                END;

                v_updated_records := COALESCE((SELECT COUNT(*) FROM temp_product_results WHERE updated = true), 0);
                v_failed_records := COALESCE((SELECT COUNT(*) FROM temp_product_results WHERE updated = false), 0);
                v_not_found_records := v_total_records - v_updated_records - v_failed_records;

                -- Show separate messages for updated and not found records
                IF v_updated_records > 0 THEN
                    RAISE NOTICE '✅ Updated % input records (table_rows_updated: %)', v_updated_records, v_table_rows_updated;
                END IF;
                IF v_not_found_records > 0 THEN
                    RAISE NOTICE '🔍 Not found % input records', v_not_found_records;
                END IF;

                v_batches_processed := 1;

            EXCEPTION WHEN OTHERS THEN
                DECLARE
                    v_error_msg TEXT := SQLERRM;
                BEGIN
                    RAISE WARNING 'Direct update failed: %', v_error_msg;
                    v_error_context := 'Direct update failed: ' || v_error_msg;
                END;
                -- Mark all as failed
                WITH failed_data AS (
                    SELECT (j->>'product_id')::bigint as product_id
                    FROM jsonb_array_elements(records) j
                )
                INSERT INTO temp_product_results
                SELECT product_id, false, v_error_context, 1 FROM failed_data;
            END;

        WHEN 'batch' THEN
            -- For medium datasets (1K-100K): Batched UPDATE
            RAISE NOTICE '📦 Using batch strategy for % records', v_total_records;
            WHILE v_offset < v_total_records LOOP
                v_batch_num := v_batch_num + 1;

                BEGIN
                    WITH batch_data AS (
                        SELECT
                            (j->>'product_id')::bigint as product_id,
                            -- Build attributes JSON array
                            (
                                SELECT jsonb_agg(
                                    jsonb_build_object(
                                        'attribute_name', key,
                                        'attribute_value', jsonb_build_object('current', value)
                                    )
                                )
                                FROM jsonb_each_text(j - 'product_id')
                                WHERE key = ANY(v_columns_to_update)
                            ) as attributes
                        FROM jsonb_array_elements(records) j
                        LIMIT v_actual_batch_size
                        OFFSET v_offset
                    ),
                    batch_upsert AS (
                        INSERT INTO base_pricing_restaurant.bp_product_attributes_mapping (
                            product_id,
                            attributes,
                            updated_at
                        )
                        SELECT
                            bd.product_id,
                            COALESCE(bd.attributes, '[]'::jsonb),
                            CURRENT_TIMESTAMP
                        FROM batch_data bd
                        ON CONFLICT (product_id)
                        DO UPDATE SET
                            attributes = (
                                SELECT jsonb_agg(attr)
                                FROM (
                                    SELECT existing_attr AS attr
                                    FROM jsonb_array_elements(COALESCE(bp_product_attributes_mapping.attributes, '[]'::jsonb)) AS existing_attr
                                    WHERE NOT EXISTS (
                                        SELECT 1 FROM jsonb_array_elements(EXCLUDED.attributes) AS new_attr
                                        WHERE new_attr->>'attribute_name' = existing_attr->>'attribute_name'
                                    )
                                    UNION ALL
                                    SELECT new_attr AS attr FROM jsonb_array_elements(EXCLUDED.attributes) AS new_attr
                                ) combined
                            ),
                            updated_at = EXCLUDED.updated_at
                        RETURNING product_id, true as updated
                    )
                    INSERT INTO temp_product_results
                    SELECT product_id, updated, NULL, v_batch_num FROM batch_upsert;
                    -- Capture table rows updated from this UPSERT
                    GET DIAGNOSTICS v_temp_row_count = ROW_COUNT;
                    v_table_rows_updated := v_table_rows_updated + COALESCE(v_temp_row_count, 0);

                    -- If no rows upserted, mark batch as failed
                    IF NOT FOUND THEN
                        WITH batch_data AS (
                            SELECT (j->>'product_id')::bigint as product_id
                            FROM jsonb_array_elements(records) j
                            LIMIT v_actual_batch_size
                            OFFSET v_offset
                        )
                        INSERT INTO temp_product_results
                        SELECT product_id, false, 'No rows processed', v_batch_num FROM batch_data;
                    END IF;

                EXCEPTION WHEN OTHERS THEN
                    DECLARE
                        v_error_msg TEXT := SQLERRM;
                        v_batch_emoji TEXT;
                    BEGIN
                        -- Use different emojis for different batch numbers to make them distinct
                        v_batch_emoji := CASE (v_batch_num % 5)
                            WHEN 1 THEN '🔵'  -- Blue circle for batch 1, 6, 11...
                            WHEN 2 THEN '🟠'  -- Orange circle for batch 2, 7, 12...
                            WHEN 3 THEN '🟡'  -- Yellow circle for batch 3, 8, 13...
                            WHEN 4 THEN '🟢'  -- Green circle for batch 4, 9, 14...
                            ELSE '⚫'         -- Black circle for batch 5, 10, 15...
                        END;
                        RAISE WARNING '% Batch %: FAILED: %', v_batch_emoji, v_batch_num, v_error_msg;
                        v_error_context := format('Batch %s failed: %s', v_batch_num, v_error_msg);
                    END;

                    WITH batch_data AS (
                        SELECT (j->>'product_id')::bigint as product_id
                        FROM jsonb_array_elements(records) j
                        LIMIT v_actual_batch_size
                        OFFSET v_offset
                    )
                    INSERT INTO temp_product_results
                    SELECT product_id, false, v_error_context, v_batch_num FROM batch_data;
                END;

                v_offset := v_offset + v_actual_batch_size;
                v_batches_processed := v_batch_num;

                -- Progress notification
                IF clock_timestamp() - v_last_progress_time >= v_progress_interval THEN
                    SELECT COUNT(*) INTO v_temp_failed_count
                    FROM temp_product_results WHERE updated = false;

                    RAISE NOTICE '📈 Progress: %/% (%.1f%%)',
                        LEAST(v_offset, v_total_records),
                        v_total_records,
                        (LEAST(v_offset, v_total_records)::float / v_total_records * 100);
                    v_last_progress_time := clock_timestamp();
                END IF;
            END LOOP;

        WHEN 'batch_optimized' THEN
            -- For large datasets (100K-1M): Batched with periodic commits
            RAISE NOTICE '💾 Using batch_optimized strategy for % records', v_total_records;
            CREATE TEMPORARY TABLE IF NOT EXISTS temp_product_batch (
                product_id bigint PRIMARY KEY,
                attributes jsonb,
                batch_num integer
            ) ON COMMIT DROP;

            -- First, transform all data into temp table
            INSERT INTO temp_product_batch
            SELECT
                (j->>'product_id')::bigint as product_id,
                (
                    SELECT jsonb_agg(
                        jsonb_build_object(
                            'attribute_name', key,
                            'attribute_value', jsonb_build_object('current', value)
                        )
                    )
                    FROM jsonb_each_text(j - 'product_id')
                    WHERE key = ANY(v_columns_to_update)
                ) as attributes,
                CEIL(ROW_NUMBER() OVER (ORDER BY (j->>'product_id')::bigint)::float / v_actual_batch_size)::integer as batch_num
            FROM jsonb_array_elements(records) j;

            -- Log sample temp table data (max 2 records)
            DECLARE
                v_sample_batch jsonb;
            BEGIN
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'product_id', product_id,
                        'attributes', attributes,
                        'batch_num', batch_num
                    )
                ) INTO v_sample_batch
                FROM (
                    SELECT product_id, attributes, batch_num
                    FROM temp_product_batch
                    LIMIT 2
                ) t;
                IF v_sample_batch IS NOT NULL AND jsonb_array_length(v_sample_batch) > 0 THEN
                    RAISE NOTICE '📋 Sample temp_product_batch data (max 2 records): %', v_sample_batch;
                END IF;
            END;

            -- Process each batch
            FOR v_batch_num IN 1..(SELECT COALESCE(MAX(batch_num), 0) FROM temp_product_batch) LOOP
                BEGIN
                    WITH batch_data AS (
                        SELECT product_id, attributes
                        FROM temp_product_batch
                        WHERE batch_num = v_batch_num
                    ),
                    batch_upsert AS (
                        INSERT INTO base_pricing_restaurant.bp_product_attributes_mapping (
                            product_id,
                            attributes,
                            updated_at
                        )
                        SELECT
                            bd.product_id,
                            COALESCE(bd.attributes, '[]'::jsonb),
                            CURRENT_TIMESTAMP
                        FROM batch_data bd
                        ON CONFLICT (product_id)
                        DO UPDATE SET
                            attributes = (
                                SELECT jsonb_agg(attr)
                                FROM (
                                    SELECT existing_attr AS attr
                                    FROM jsonb_array_elements(COALESCE(bp_product_attributes_mapping.attributes, '[]'::jsonb)) AS existing_attr
                                    WHERE NOT EXISTS (
                                        SELECT 1 FROM jsonb_array_elements(EXCLUDED.attributes) AS new_attr
                                        WHERE new_attr->>'attribute_name' = existing_attr->>'attribute_name'
                                    )
                                    UNION ALL
                                    SELECT new_attr AS attr FROM jsonb_array_elements(EXCLUDED.attributes) AS new_attr
                                ) combined
                            ),
                            updated_at = EXCLUDED.updated_at
                        RETURNING product_id, true as updated
                    )
                    INSERT INTO temp_product_results
                    SELECT product_id, updated, NULL, v_batch_num FROM batch_upsert;
                    -- Capture table rows updated from this UPSERT
                    GET DIAGNOSTICS v_temp_row_count = ROW_COUNT;
                    v_table_rows_updated := v_table_rows_updated + COALESCE(v_temp_row_count, 0);

                EXCEPTION WHEN OTHERS THEN
                    DECLARE
                        v_error_msg TEXT := SQLERRM;
                        v_batch_emoji TEXT;
                    BEGIN
                        -- Use different emojis for different batch numbers to make them distinct
                        v_batch_emoji := CASE (v_batch_num % 5)
                            WHEN 1 THEN '🔵'  -- Blue circle for batch 1, 6, 11...
                            WHEN 2 THEN '🟠'  -- Orange circle for batch 2, 7, 12...
                            WHEN 3 THEN '🟡'  -- Yellow circle for batch 3, 8, 13...
                            WHEN 4 THEN '🟢'  -- Green circle for batch 4, 9, 14...
                            ELSE '⚫'         -- Black circle for batch 5, 10, 15...
                        END;
                        RAISE WARNING '% Batch %: FAILED: %', v_batch_emoji, v_batch_num, v_error_msg;
                        v_error_context := format('Batch %s failed: %s', v_batch_num, v_error_msg);
                    END;

                    WITH batch_failed AS (
                        SELECT product_id
                        FROM temp_product_batch
                        WHERE batch_num = v_batch_num
                    )
                    INSERT INTO temp_product_results
                    SELECT product_id, false, v_error_context, v_batch_num FROM batch_failed;
                END;

                v_batches_processed := v_batch_num;

                -- Progress notification every 10 batches
                IF v_batch_num % 10 = 0 THEN
                    SELECT COUNT(*) INTO v_temp_failed_count
                    FROM temp_product_results WHERE updated = false;

                    RAISE NOTICE '📈 Progress: %/% (%.1f%%) - Batch % - Not Found: %',
                        LEAST(v_batch_num * v_actual_batch_size, v_total_records),
                        v_total_records,
                        (LEAST(v_batch_num * v_actual_batch_size, v_total_records)::float / v_total_records * 100),
                        v_batch_num,
                        v_temp_failed_count;
                END IF;

                -- Commit occasionally
                IF v_batch_num % 50 = 0 THEN
                    COMMIT;
                    BEGIN
                        RAISE NOTICE 'Committed after % batches', v_batch_num;
                    END;
                END IF;
            END LOOP;

        WHEN 'bulk_temp_table' THEN
            -- For very large datasets: Use temp table and COPY-like approach
            RAISE NOTICE '🔄 Using bulk_temp_table strategy for % records', v_total_records;
            CREATE TEMPORARY TABLE IF NOT EXISTS temp_bulk_update (
                product_id bigint PRIMARY KEY,
                attributes jsonb
            ) ON COMMIT DROP;

            -- Load all data into temp table
            INSERT INTO temp_bulk_update
            SELECT
                (j->>'product_id')::bigint as product_id,
                (
                    SELECT jsonb_agg(
                        jsonb_build_object(
                            'attribute_name', key,
                            'attribute_value', jsonb_build_object('current', value)
                        )
                    )
                    FROM jsonb_each_text(j - 'product_id')
                    WHERE key = ANY(v_columns_to_update)
                ) as attributes
            FROM jsonb_array_elements(records) j;

            -- Log sample temp table data (max 2 records)
            DECLARE
                v_sample_bulk jsonb;
            BEGIN
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'product_id', product_id,
                        'attributes', attributes
                    )
                ) INTO v_sample_bulk
                FROM (
                    SELECT product_id, attributes
                    FROM temp_bulk_update
                    LIMIT 2
                ) t;
                IF v_sample_bulk IS NOT NULL AND jsonb_array_length(v_sample_bulk) > 0 THEN
                    RAISE NOTICE '📋 Sample temp_bulk_update data (max 2 records): %', v_sample_bulk;
                END IF;
            END;

            -- Create index for performance
            CREATE INDEX IF NOT EXISTS idx_temp_bulk_update ON temp_bulk_update(product_id);

            -- Perform bulk update using CTE
            WITH update_cte AS (
                UPDATE base_pricing_restaurant.bp_product_attributes_mapping p
                SET
                    attributes = (
                        SELECT jsonb_agg(attr)
                        FROM (
                            SELECT existing_attr AS attr
                            FROM jsonb_array_elements(COALESCE(p.attributes, '[]'::jsonb)) AS existing_attr
                            WHERE NOT EXISTS (
                                SELECT 1 FROM jsonb_array_elements(t.attributes) AS new_attr
                                WHERE new_attr->>'attribute_name' = existing_attr->>'attribute_name'
                            )
                            UNION ALL
                            SELECT new_attr AS attr FROM jsonb_array_elements(t.attributes) AS new_attr
                        ) combined
                    ),
                    updated_at = CURRENT_TIMESTAMP
                FROM temp_bulk_update t
                WHERE p.product_id = t.product_id
                RETURNING p.product_id, true as updated
            ),
            insert_cte AS (
                INSERT INTO base_pricing_restaurant.bp_product_attributes_mapping (
                    product_id,
                    attributes,
                    updated_at
                )
                SELECT
                    t.product_id,
                    t.attributes,
                    CURRENT_TIMESTAMP
                FROM temp_bulk_update t
                WHERE NOT EXISTS (
                    SELECT 1 FROM base_pricing_restaurant.bp_product_attributes_mapping p
                    WHERE p.product_id = t.product_id
                )
                RETURNING product_id, true as updated
            )
            INSERT INTO temp_product_results
            SELECT product_id, updated, NULL, 1 FROM (
                SELECT product_id, updated FROM update_cte
                UNION ALL
                SELECT product_id, updated FROM insert_cte
            ) combined;
            -- Capture table rows updated/inserted from this bulk operation
            GET DIAGNOSTICS v_temp_row_count = ROW_COUNT;
            v_table_rows_updated := v_table_rows_updated + COALESCE(v_temp_row_count, 0);

            v_batches_processed := 1;

        ELSE
            -- Unknown strategy
            RAISE EXCEPTION 'Unknown strategy: %', v_strategy;
    END CASE;

    -- Count final results
    v_updated_records := COALESCE((SELECT COUNT(*) FROM temp_product_results WHERE updated = true), 0);
    v_failed_records := COALESCE((SELECT COUNT(*) FROM temp_product_results WHERE updated = false), 0);

    -- Calculate not_found_records: total - updated - failed
    v_not_found_records := v_total_records - v_updated_records - v_failed_records;

    -- Collect error messages from failed records
    DECLARE
        v_error_messages TEXT;
    BEGIN
        IF v_failed_records > 0 THEN
            SELECT string_agg(DISTINCT error_message, '; ') INTO v_error_messages
            FROM temp_product_results
            WHERE updated = false AND error_message IS NOT NULL;

            IF v_error_messages IS NOT NULL THEN
                v_error_message := v_error_messages;
            END IF;
        END IF;
    END;

    -- Show separate messages for updated, failed, and not found records (for strategies that don't show them earlier)
    IF v_strategy != 'direct' THEN
        IF v_updated_records > 0 THEN
            RAISE NOTICE '✅ Updated % input records', v_updated_records;
        END IF;
        IF v_failed_records > 0 THEN
            RAISE NOTICE '💥 input records %: FAILED', v_failed_records;
            IF v_error_message IS NOT NULL THEN
                RAISE NOTICE '❗ Error details: %', v_error_message;
            END IF;
        END IF;
        IF v_not_found_records > 0 THEN
            RAISE NOTICE '🔍 Not found % input records', v_not_found_records;
        END IF;

        RAISE NOTICE '📊 % strategy results: updated=% input records, failed=% input records, not_found=% input records',
            v_strategy, v_updated_records, v_failed_records, v_not_found_records;
    END IF;

    -- Collect not_found_records_details (records that were not found/updated)
    IF v_not_found_records > 0 THEN
        -- For product attributes, we don't have original_record stored, so we can't collect details
        -- This would require storing original records in temp table
        v_not_found_records_details := '[]'::jsonb;
    ELSE
        v_not_found_records_details := '[]'::jsonb;
    END IF;

    -- Collect failed_records_details (records that failed)
    IF v_failed_records > 0 THEN
        -- For product attributes, we don't have original_record stored, so we can't collect details
        v_failed_records_details := '[]'::jsonb;
    ELSE
        v_failed_records_details := '[]'::jsonb;
    END IF;

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
        RAISE NOTICE '💀 fn_update_product_attributes_bulk ended (with failures)';
    ELSIF v_updated_records > 0 THEN
        RAISE NOTICE '✅ fn_update_product_attributes_bulk ended';
    ELSIF v_not_found_records > 0 THEN
        RAISE NOTICE '🔍 fn_update_product_attributes_bulk ended (with not found records)';
    ELSE
        RAISE NOTICE '✅ fn_update_product_attributes_bulk ended';
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
            format('Error: %s (SQLSTATE: %s)', SQLERRM, SQLSTATE)::text, 
            COALESCE(v_not_found_records_details, '[]'::jsonb),
            COALESCE(v_failed_records_details, '[]'::jsonb);

        RAISE NOTICE 'Update failed after %: %', (v_end_time - v_start_time), SQLERRM;
        RAISE NOTICE '';
        RAISE NOTICE '═══════════════════════════════════════════════════════════════════════';
        RAISE NOTICE '💀 fn_update_product_attributes_bulk ended (ERROR)';
        RAISE NOTICE '═══════════════════════════════════════════════════════════════════════';
END;
$function$
;
