--liquibase formatted sql
--changeset yashraj.jha@impactanalytics.co:sp_update_bp_store_attributes_mapping_2 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for sp_update_bp_store_attributes_mapping_2

DROP PROCEDURE IF EXISTS base_pricing_restaurant.sp_update_bp_store_attributes_mapping;


CREATE OR REPLACE PROCEDURE base_pricing_restaurant.sp_update_bp_store_attributes_mapping()
 LANGUAGE plpgsql
AS $procedure$
DECLARE
    _insert_sql       text;
    _update_sql       text;
    p_k               text;
    tn                text;
    _worker           text;
    _insert_count_before integer;
    _insert_count_after  integer;
    _update_count_actual integer;
    _preserved_arr    text[];
    _start_time       timestamp;
    _end_time         timestamp;
    _chunk_size       integer := 1000;
BEGIN
    _start_time := clock_timestamp();
    
    RAISE NOTICE 'Starting store attributes update procedure';

    -- Step 1: Get list of preserved attributes (attributes that should NOT be updated)
    SELECT array_agg(attribute_name)
    INTO _preserved_arr
    FROM base_pricing_restaurant.bp_store_attributes_metadata
    WHERE is_value_preserved = TRUE AND is_active = TRUE;

    RAISE NOTICE 'Preserved store attributes (will NOT be updated): %', _preserved_arr;
    RAISE NOTICE 'Number of preserved store attributes: %', COALESCE(array_length(_preserved_arr, 1), 0);

    -- Step 2: Check how many new stores need to be inserted
    SELECT COUNT(*) INTO _insert_count_before
    FROM base_pricing_restaurant.bp_store_master bsm
    WHERE bsm.store_id NOT IN (SELECT store_id FROM base_pricing_restaurant.bp_store_attributes_mapping);
    
    RAISE NOTICE 'New stores needing insertion: %', _insert_count_before;

    -- Get primary key constraint and full table name for bp_store_master
    SELECT
        tc.constraint_name,
        concat(tc.table_schema, '.', tc.table_name) AS tn
    INTO
        p_k, tn
    FROM
        information_schema.table_constraints tc
    WHERE
        tc.constraint_type = 'PRIMARY KEY'
        AND tc.table_name = 'bp_store_master'
        AND tc.table_schema = 'base_pricing_restaurant';

    -- Step 3: Insert new stores ONLY if there are any missing
    IF _insert_count_before > 0 THEN
        RAISE NOTICE 'Step 1: Inserting % new stores in parallel', _insert_count_before;

        -- Construct dynamic SQL for inserting new stores
        _insert_sql := 'WITH rows AS (
            INSERT INTO base_pricing_restaurant.bp_store_attributes_mapping (
                store_id,
                attributes,
                updated_at
            )
            SELECT
                bsm.store_id,
                (
                    SELECT jsonb_agg(
                        jsonb_build_object(
                            ''attribute_name'', pam.attribute_name,
                            ''attribute_value'',
                                CASE
                                    WHEN pam.attribute_name = ''total_inventory'' THEN
                                        jsonb_build_object(
                                            ''current'', blsig.total_inventory,
                                            ''initial'', blsig.total_inventory
                                        )
                                    ELSE
                                        CASE
                                            WHEN pam.is_dynamic = TRUE THEN
                                                -- For dynamic attributes in NEW stores, set value to "CHAIN"
                                                jsonb_build_object(
                                                    ''current'', to_jsonb(''CHAIN''::text),
                                                    ''initial'', to_jsonb(''CHAIN''::text)
                                                )
                                            ELSE
                                                jsonb_build_object(
                                                    ''current'', 
                                                        CASE 
                                                            WHEN jsonb_typeof(to_jsonb(bsm) -> pam.attribute_name) = ''string'' 
                                                            THEN to_jsonb(UPPER(TRIM(BOTH ''"'' FROM (to_jsonb(bsm) -> pam.attribute_name)::text)))
                                                            ELSE 
                                                                to_jsonb(bsm) -> pam.attribute_name
                                                        END,
                                                    ''initial'', 
                                                        CASE 
                                                            WHEN jsonb_typeof(to_jsonb(bsm) -> pam.attribute_name) = ''string'' 
                                                            THEN to_jsonb(UPPER(TRIM(BOTH ''"'' FROM (to_jsonb(bsm) -> pam.attribute_name)::text)))
                                                            ELSE 
                                                                to_jsonb(bsm) -> pam.attribute_name
                                                        END
                                                )
                                        END
                                END
                        )
                        ORDER BY pam.attribute_id
                    )
                    FROM base_pricing_restaurant.bp_store_attributes_metadata pam
                    WHERE pam.is_active = TRUE
                ) AS attributes,
                CURRENT_TIMESTAMP AS updated_at
            FROM (SELECT * FROM base_pricing_restaurant.bp_store_master {where}) bsm
            LEFT JOIN base_pricing_restaurant.bp_latest_store_inventory_agg blsig
                ON bsm.store_id = blsig.store_id
            WHERE bsm.store_id NOT IN (SELECT store_id FROM base_pricing_restaurant.bp_store_attributes_mapping)
            ON CONFLICT DO NOTHING
            RETURNING 1
        )
        SELECT count(1) FROM rows;';

        -- Launch parallel insert for new stores
        PERFORM public.parellel_insert(
            _insert_sql,              -- dynamic SQL
            50,                       -- max concurrency
            tn,                       -- source table
            'store_id',               -- partition column
            p_k,                      -- primary key
            _chunk_size               -- chunk size
        );

        -- Check how many new stores were actually inserted
        SELECT COUNT(*) INTO _insert_count_after
        FROM base_pricing_restaurant.bp_store_master bsm
        WHERE bsm.store_id NOT IN (SELECT store_id FROM base_pricing_restaurant.bp_store_attributes_mapping);
        
        RAISE NOTICE 'INSERT COMPLETED: Added % new stores, % stores remaining to be mapped', 
            (_insert_count_before - _insert_count_after),
            _insert_count_after;
    ELSE
        RAISE NOTICE 'SKIPPING INSERT: No new stores to insert';
        _insert_count_after := 0;
    END IF;

    -- Step 4: Update existing stores using parallel processing
    RAISE NOTICE 'Step 2: Updating existing stores in parallel';
    
    -- Count how many stores should be updated (existing stores in mapping)
    SELECT COUNT(*) INTO _update_count_actual
    FROM base_pricing_restaurant.bp_store_attributes_mapping bsam
    WHERE bsam.store_id IN (SELECT store_id FROM base_pricing_restaurant.bp_store_master);
    
    RAISE NOTICE 'Stores to update: %', _update_count_actual;

    -- Only run UPDATE if there are stores to update
    IF _update_count_actual > 0 THEN
        -- Construct dynamic SQL for updating existing stores
        _update_sql := '
        WITH updated_rows AS (
            UPDATE base_pricing_restaurant.bp_store_attributes_mapping AS bsam
            SET 
                attributes = (
                    WITH attribute_data AS (
                        SELECT 
                            pam.attribute_id,
                            pam.attribute_name,
                            CASE 
                                WHEN pam.attribute_name = ANY(' || quote_literal(_preserved_arr) || '::text[]) 
                                AND EXISTS (
                                    SELECT 1 
                                    FROM jsonb_array_elements(bsam.attributes) attr 
                                    WHERE attr->>''attribute_name'' = pam.attribute_name
                                ) THEN (
                                    -- Keep same value for preserved and existing attributes
                                    SELECT attr 
                                    FROM jsonb_array_elements(bsam.attributes) attr 
                                    WHERE attr->>''attribute_name'' = pam.attribute_name
                                    LIMIT 1
                                )
                                ELSE
                                    -- Update new value for non-preserved or new attributes
                                    jsonb_build_object(
                                        ''attribute_name'', pam.attribute_name,
                                        ''attribute_value'',
                                            CASE
                                                WHEN pam.attribute_name = ''total_inventory'' THEN
                                                    jsonb_build_object(
                                                        ''current'', blsig.total_inventory,
                                                        ''initial'', blsig.total_inventory
                                                    )
                                                ELSE
                                                    jsonb_build_object(
                                                        ''current'', 
                                                            CASE 
                                                                WHEN jsonb_typeof(to_jsonb(bsm) -> pam.attribute_name) = ''string'' 
                                                                THEN to_jsonb(UPPER(TRIM(BOTH ''"'' FROM (to_jsonb(bsm) -> pam.attribute_name)::text)))
                                                                ELSE 
                                                                    to_jsonb(bsm) -> pam.attribute_name
                                                            END,
                                                        ''initial'', 
                                                            CASE 
                                                                WHEN jsonb_typeof(to_jsonb(bsm) -> pam.attribute_name) = ''string'' 
                                                                THEN to_jsonb(UPPER(TRIM(BOTH ''"'' FROM (to_jsonb(bsm) -> pam.attribute_name)::text)))
                                                                ELSE 
                                                                    to_jsonb(bsm) -> pam.attribute_name
                                                            END
                                                    )
                                            END
                                    )
                            END as attribute_json
                        FROM base_pricing_restaurant.bp_store_attributes_metadata pam
                        WHERE pam.is_active = TRUE
                    )
                    SELECT jsonb_agg(attribute_json ORDER BY attribute_id)
                    FROM attribute_data
                ),
                updated_at = CURRENT_TIMESTAMP
            FROM base_pricing_restaurant.bp_store_master bsm
            LEFT JOIN base_pricing_restaurant.bp_latest_store_inventory_agg blsig
                ON bsm.store_id = blsig.store_id
            WHERE bsam.store_id = bsm.store_id
            AND bsam.store_id IN (SELECT store_id FROM base_pricing_restaurant.bp_store_master {where})
            RETURNING 1
        )
        SELECT count(1) FROM updated_rows;';

        -- Launch parallel update for existing stores
        PERFORM public.parellel_insert(
            _update_sql,              -- dynamic SQL for UPDATE
            50,                       -- max concurrency
            tn,                       -- source table
            'store_id',               -- partition column
            p_k,                      -- primary key
            _chunk_size               -- chunk size
        );
        
        RAISE NOTICE 'UPDATE COMPLETED: Updated % existing stores', _update_count_actual;
    ELSE
        RAISE NOTICE 'SKIPPING UPDATE: No stores to update.';
    END IF;

    _end_time := clock_timestamp();
    
    -- Final verification and statistics
    SELECT COUNT(*) INTO _insert_count_after
    FROM base_pricing_restaurant.bp_store_master bsm
    WHERE bsm.store_id NOT IN (SELECT store_id FROM base_pricing_restaurant.bp_store_attributes_mapping);
    
    RAISE NOTICE 'STORE UPDATE PROCEDURE COMPLETED SUCCESSFULLY!';
    RAISE NOTICE 'SUMMARY:';
    RAISE NOTICE '- New stores added to mapping: %', (_insert_count_before - _insert_count_after);
    RAISE NOTICE '- Stores updated: %', _update_count_actual;
    RAISE NOTICE '- Stores still not in mapping: %', _insert_count_after;
    RAISE NOTICE '- Total execution time: % seconds', EXTRACT(EPOCH FROM (_end_time - _start_time));

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'ERROR in sp_update_bp_store_attributes_mapping: %', SQLERRM;
        RAISE;
END;
$procedure$
;
