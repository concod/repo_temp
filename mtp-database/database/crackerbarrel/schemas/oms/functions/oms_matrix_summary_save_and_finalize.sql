--liquibase formatted sql
--changeset nikhil.dhoot:matrix_summary_pack_ordering_update13 runOnChange:true stripComments:false splitStatements:false context:MTP-91654 labels:MTP-91654
--comment: Added selected_linked_store_codes to the function

DROP FUNCTION IF EXISTS inventory_smart.oms_matrix_summary_save_and_finalize(jsonb, text, _varchar);
DROP FUNCTION IF EXISTS inventory_smart.oms_matrix_summary_save_and_finalize(jsonb, text);

CREATE OR REPLACE FUNCTION inventory_smart.oms_matrix_summary_save_and_finalize(modifications jsonb, user_id text, selected_linked_store_codes character varying[] DEFAULT NULL)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
    fiscal_period record;
    style record;
    l0_record record;
    l1_record record;
    l2_record record;
    update_level text;
    timeperiod_column text;
    user_id_int integer;

    total_quantity FLOAT;
    quantity_ratio FLOAT;
    record_count INTEGER;
    equal_split_quantity INTEGER;
    query_text text;
    total_roq_constrained FLOAT;
BEGIN
    -- Add proper error handling
    BEGIN
        -- Convert user_id to integer safely
        user_id_int := user_id::integer;
    EXCEPTION WHEN OTHERS THEN
        RAISE EXCEPTION 'Invalid user_id: %. Must be a valid integer.', user_id;
    END;

    -- Get update level (Week/Month) from the first element
    SELECT modifications->0->>'update_level' INTO update_level;
    
    IF update_level IS NULL THEN
        RAISE EXCEPTION 'Missing update_level in modifications';
    END IF;
    
    -- Determine time period column based on update level
    IF update_level = 'Week' THEN
        timeperiod_column := 'fiscal_year_week';
    ELSE
        timeperiod_column := 'fiscal_year_month';
    END IF;
    
    RAISE NOTICE 'Processing using time period: %', timeperiod_column;
    
    -- Start a transaction for atomicity
    BEGIN
        -- Process each time period
        FOR fiscal_period IN 
            SELECT * FROM jsonb_to_recordset(modifications) AS (fiscal_timeperiod_id text, modified jsonb)
        LOOP
            RAISE NOTICE 'Processing timeperiod: %', fiscal_period.fiscal_timeperiod_id;
            
            -- Process each style
            FOR style IN 
                SELECT * FROM jsonb_to_recordset(fiscal_period.modified) AS (l0 jsonb, name text)
            LOOP
                -- Extract l0 values into a record for easier access and validation
                SELECT 
                    l0->>'name' AS p_article,
                    l0->>'pack_id' AS pack_id,
                    l0->>'value' AS target_quantity,
                    l0->>'ratio' AS ratio,
                    l0->>'l1' AS l1
                INTO l0_record
                FROM (SELECT style.l0 AS l0) AS t;
                
                -- Process level 0 (style level)
                IF l0_record.pack_id IS NOT NULL AND l0_record.pack_id != 'WP' THEN
                    IF l0_record.target_quantity IS NOT NULL AND l0_record.target_quantity != '' THEN 
                        -- Validate the input
                        IF l0_record.p_article IS NULL OR l0_record.p_article = '' THEN
                            RAISE EXCEPTION 'Article number cannot be null or empty';
                        END IF;

                        -- Calculate the sum of all pack level order quantities for this article using dynamic SQL
                        query_text := format('
                            SELECT SUM(pack_level_order_quantity)::FLOAT 
                        FROM (
                            SELECT 
                                SUM(distinct order_quantity) AS pack_level_order_quantity
                            FROM 
                                inventory_smart.oms_orders_recommended
                            WHERE 
                                    order_gen_type in (''Recommended'',''Scenario'',''Edited'',''edited'') AND
                                    article = $1 AND
                                    %I::text = $2::text
                                    AND ($3::varchar[] IS NULL OR array_length($3::varchar[], 1) IS NULL OR loc_code = ANY($3::varchar[]))
                            GROUP BY 
                                article,
                                loc_code,
                                pack_id,
                                order_status_id,
                                order_type
                            ) AS pack_level_data', timeperiod_column);
                        
                        EXECUTE query_text INTO total_quantity 
                        USING l0_record.p_article, fiscal_period.fiscal_timeperiod_id, selected_linked_store_codes;

                        -- Check if there are any orders for this article
                        IF total_quantity IS NULL THEN
                            RAISE NOTICE 'No orders found for article %', l0_record.p_article;
                            RETURN;
                        END IF;

                        -- Count how many unique combinations we have
                        query_text := format('
                            SELECT COUNT(*) 
                        FROM (
                            SELECT 
                                article, loc_code, pack_id, order_status_id, order_type
                            FROM 
                                inventory_smart.oms_orders_recommended
                            WHERE 
                                    order_gen_type in (''Recommended'',''Scenario'',''Edited'',''edited'') AND
                                    article = $1 AND
                                    %I::text = $2::text
                                    AND ($3::varchar[] IS NULL OR array_length($3::varchar[], 1) IS NULL OR loc_code = ANY($3::varchar[]))
                            GROUP BY 
                                article, loc_code, pack_id, order_status_id, order_type
                            ) AS unique_combinations', timeperiod_column);
                        
                        EXECUTE query_text INTO record_count
                        USING l0_record.p_article, fiscal_period.fiscal_timeperiod_id, selected_linked_store_codes;

                        -- If total quantity is zero or record count is zero, handle with equal split
                        IF total_quantity = 0 OR record_count = 0 THEN
                            RAISE NOTICE 'Total quantity is zero for article %. Using equal split.', l0_record.p_article;
                            
                            -- Recalculate record count if it's zero
                            IF record_count = 0 THEN
                                query_text := format('
                                    SELECT COUNT(*) 
                                FROM inventory_smart.oms_orders_recommended
                                    WHERE order_gen_type in (''Recommended'',''Scenario'',''Edited'',''edited'') AND
                                    article = $1 AND
                                    %I::text = $2::text
                                    AND ($3::varchar[] IS NULL OR array_length($3::varchar[], 1) IS NULL OR loc_code = ANY($3::varchar[]))', timeperiod_column);
                                
                                EXECUTE query_text INTO record_count
                                USING l0_record.p_article, fiscal_period.fiscal_timeperiod_id, selected_linked_store_codes;
                                
                                IF record_count = 0 THEN
                                    RAISE NOTICE 'No records found for article %', l0_record.p_article;
                                    RETURN;
                                END IF;
                            END IF;
                            
                            -- Calculate equal split quantity - Fix for empty string
                            equal_split_quantity := CEIL(NULLIF(l0_record.target_quantity, '')::FLOAT / record_count::FLOAT)::INTEGER;
                            
                            -- Update with equal split
                            query_text := format('
                            UPDATE inventory_smart.oms_orders_recommended oor 
                                SET order_quantity = $1, order_gen_type  = ''Edited'', updated_by = $4, updated_at = CURRENT_TIMESTAMP
                                WHERE oor.article = $2 AND
                                %I::text = $3::text
                                AND ($5::varchar[] IS NULL OR array_length($5::varchar[], 1) IS NULL OR oor.loc_code = ANY($5::varchar[]))', timeperiod_column);
                            
                            EXECUTE query_text
                            USING equal_split_quantity, l0_record.p_article, fiscal_period.fiscal_timeperiod_id, user_id_int, selected_linked_store_codes;
                        ELSE
                            -- Regular update: Update order_quantity based on proportion of total
                            query_text := format('
                            UPDATE inventory_smart.oms_orders_recommended oor 
                            SET order_quantity = 
                                CEIL(
                                    (SELECT SUM(distinct oor2.order_quantity) 
                                    FROM inventory_smart.oms_orders_recommended oor2
                                    WHERE oor2.article = oor.article
                                    AND oor2.pack_id = oor.pack_id
                                    AND oor2.loc_code = oor.loc_code
                                    AND oor2.order_type = oor.order_type
                                    AND oor2.order_status_id = oor.order_status_id
                                    AND oor2.%I::text = oor.%I::text
                                    AND ($6::varchar[] IS NULL OR array_length($6::varchar[], 1) IS NULL OR oor2.loc_code = ANY($6::varchar[]))
                                    ) 
                                        * ($1 / $2)
                                    )::INTEGER,
                                    order_gen_type  = ''Edited'',
                                    updated_by = $3,
                                    updated_at = CURRENT_TIMESTAMP
                            WHERE 
                                    oor.order_gen_type in (''Recommended'',''Scenario'',''Edited'',''edited'') AND
                                    oor.article = $4 AND
                                    %I::text = $5::text
                                    AND ($6::varchar[] IS NULL OR array_length($6::varchar[], 1) IS NULL OR oor.loc_code = ANY($6::varchar[]))', timeperiod_column, timeperiod_column, timeperiod_column);
                            
                            EXECUTE query_text
                            USING NULLIF(l0_record.target_quantity, '')::FLOAT, total_quantity, user_id_int, 
                                  l0_record.p_article, fiscal_period.fiscal_timeperiod_id, selected_linked_store_codes;
                        END IF;

                        -- Second update: Update order_quantity_eaches based on updated order_quantity
                        query_text := format('
                        UPDATE inventory_smart.oms_orders_recommended oor 
                        SET order_quantity_eaches = CASE WHEN oor.pack_id IS NOT NULL THEN oor.pack_config*oor.order_quantity ELSE oor.order_quantity END, updated_by = $3, updated_at = CURRENT_TIMESTAMP,
                            order_gen_type = ''Edited''
                        WHERE 
                                oor.order_gen_type in (''Recommended'',''Scenario'',''Edited'',''edited'') AND
                                oor.article = $1 AND
                                %I::text = $2::text
                                AND ($4::varchar[] IS NULL OR array_length($4::varchar[], 1) IS NULL OR oor.loc_code = ANY($4::varchar[]))', timeperiod_column);
                        
                        EXECUTE query_text
                        USING l0_record.p_article, fiscal_period.fiscal_timeperiod_id, user_id_int, selected_linked_store_codes;

                        RAISE NOTICE 'Successfully updated order quantities for article %', l0_record.p_article;
                    END IF;
                ELSIF l0_record.pack_id IS NOT NULL AND l0_record.pack_id = 'WP' THEN
                    -- Weighted pack update - Already using dynamic SQL with format()
                    IF l0_record.ratio IS NOT NULL AND l0_record.ratio != '' THEN
                        -- Count how many records we have to make sure they exist
                        query_text := format('
                            SELECT COUNT(*) 
                            FROM inventory_smart.oms_orders_recommended
                            WHERE article = $1
                            AND %I::text = $2::text
                            AND ($3::varchar[] IS NULL OR array_length($3::varchar[], 1) IS NULL OR loc_code = ANY($3::varchar[]))', timeperiod_column);
                            
                        EXECUTE query_text INTO record_count
                        USING l0_record.p_article, fiscal_period.fiscal_timeperiod_id, selected_linked_store_codes;

                        -- Check if there are any orders for this combination
                        IF record_count = 0 THEN
                            RAISE NOTICE 'No orders found for article % in time period % (column: %)', 
                                        l0_record.p_article, fiscal_period.fiscal_timeperiod_id, timeperiod_column;
                            RETURN;
                        END IF;

                        -- Update order_quantity directly using the provided ratio
                        query_text := format('
                            UPDATE inventory_smart.oms_orders_recommended oor 
                            SET order_quantity = CEIL(COALESCE(oor.roq_constrained, 0) * $1::FLOAT)::INTEGER, order_gen_type  = ''Edited'', updated_by = $4, updated_at = CURRENT_TIMESTAMP
                            WHERE oor.order_gen_type in (''Recommended'',''Scenario'',''Edited'',''edited'') AND
                            oor.article = $2
                            AND %I::text = $3::text
                            AND ($5::varchar[] IS NULL OR array_length($5::varchar[], 1) IS NULL OR oor.loc_code = ANY($5::varchar[]))', timeperiod_column);
                            
                        EXECUTE query_text
                        USING NULLIF(l0_record.ratio, ''), l0_record.p_article, fiscal_period.fiscal_timeperiod_id, user_id_int, selected_linked_store_codes;

                        -- Update order_quantity_eaches based on updated order_quantity
                        query_text := format('
                            UPDATE inventory_smart.oms_orders_recommended oor 
                            SET order_quantity_eaches = CASE WHEN oor.pack_id IS NOT NULL THEN oor.pack_config*oor.order_quantity ELSE oor.order_quantity END, updated_by = $3, updated_at = CURRENT_TIMESTAMP,
                                order_gen_type = ''Edited''
                            WHERE 
                                oor.order_gen_type in (''Recommended'',''Scenario'',''Edited'',''edited'') AND
                                oor.article = $1
                                AND %I::text = $2::text
                                AND ($4::varchar[] IS NULL OR array_length($4::varchar[], 1) IS NULL OR oor.loc_code = ANY($4::varchar[]))', timeperiod_column);
                                
                        EXECUTE query_text
                        USING l0_record.p_article, fiscal_period.fiscal_timeperiod_id, user_id_int, selected_linked_store_codes;

                        RAISE NOTICE 'Successfully updated order quantities for article % in time period % using ratio %', 
                                    l0_record.p_article, fiscal_period.fiscal_timeperiod_id, l0_record.ratio;
                    ELSIF l0_record.target_quantity IS NOT NULL AND l0_record.target_quantity != '' THEN
                        -- Calculate the sum of all roq_constrained values for this article with time period
                        query_text := format('
                            SELECT SUM(COALESCE(roq_constrained, 0))::FLOAT 
                            FROM inventory_smart.oms_orders_recommended
                            WHERE 
                            order_gen_type in (''Recommended'',''Scenario'',''Edited'',''edited'') AND
                            article = $1
                            AND %I::text = $2::text
                            AND ($3::varchar[] IS NULL OR array_length($3::varchar[], 1) IS NULL OR loc_code = ANY($3::varchar[]))', timeperiod_column);
                            
                        EXECUTE query_text INTO total_roq_constrained
                        USING l0_record.p_article, fiscal_period.fiscal_timeperiod_id, selected_linked_store_codes;

                        -- Count how many records we have
                        query_text := format('
                            SELECT COUNT(*) 
                            FROM inventory_smart.oms_orders_recommended
                            WHERE 
                            order_gen_type in (''Recommended'',''Scenario'',''Edited'',''edited'') AND
                            article = $1
                            AND %I::text = $2::text
                            AND ($3::varchar[] IS NULL OR array_length($3::varchar[], 1) IS NULL OR loc_code = ANY($3::varchar[]))', timeperiod_column);
                            
                        EXECUTE query_text INTO record_count
                        USING l0_record.p_article, fiscal_period.fiscal_timeperiod_id, selected_linked_store_codes;

                        -- Check if there are any orders for this combination
                        IF record_count = 0 THEN
                            RAISE NOTICE 'No orders found for article % in time period % (column: %)', 
                                        l0_record.p_article, fiscal_period.fiscal_timeperiod_id, timeperiod_column;
                            RETURN;
                        END IF;

                        -- If total roq_constrained is zero, handle with equal split
                        IF total_roq_constrained IS NULL OR total_roq_constrained = 0 THEN
                            RAISE NOTICE 'Total roq_constrained is zero for article % in time period %. Using equal split.', 
                                        l0_record.p_article, fiscal_period.fiscal_timeperiod_id;
                            
                            -- Calculate equal split quantity
                            equal_split_quantity := CEIL(NULLIF(l0_record.target_quantity, '')::FLOAT / record_count::FLOAT)::INTEGER;
                            
                            -- Update with equal split
                            query_text := format('
                                UPDATE inventory_smart.oms_orders_recommended oor 
                                SET order_quantity = $1, 
                                order_quantity_eaches = CASE WHEN oor.pack_id IS NOT NULL THEN oor.pack_config*$1 ELSE $1 END, updated_by = $4, updated_at = CURRENT_TIMESTAMP
                                WHERE oor.order_gen_type in (''Recommended'',''Scenario'',''Edited'',''edited'') AND
                                oor.article = $2
                                AND %I::text = $3::text
                                AND ($5::varchar[] IS NULL OR array_length($5::varchar[], 1) IS NULL OR oor.loc_code = ANY($5::varchar[]))', timeperiod_column);
                                
                            EXECUTE query_text
                            USING equal_split_quantity, l0_record.p_article, fiscal_period.fiscal_timeperiod_id, user_id_int, selected_linked_store_codes;
                        ELSE
                            -- Regular update: Update order_quantity based on proportion of roq_constrained
                            quantity_ratio := NULLIF(l0_record.target_quantity, '')::FLOAT / total_roq_constrained::FLOAT;
                            query_text := format('
                                UPDATE inventory_smart.oms_orders_recommended oor 
                                SET order_quantity = CASE 
                                    WHEN COALESCE(oor.roq_constrained, 0) = 0 THEN 0
                                    ELSE CEIL(COALESCE(oor.roq_constrained, 0) * $1)::INTEGER
                                END, updated_by = $4, updated_at = CURRENT_TIMESTAMP
                                WHERE 
                                    oor.order_gen_type in (''Recommended'',''Scenario'',''Edited'',''edited'') AND
                                    oor.article = $2
                                    AND %I::text = $3::text
                                    AND ($5::varchar[] IS NULL OR array_length($5::varchar[], 1) IS NULL OR oor.loc_code = ANY($5::varchar[]))', timeperiod_column);
                                    
                            EXECUTE query_text
                            USING quantity_ratio, l0_record.p_article, fiscal_period.fiscal_timeperiod_id, user_id_int, selected_linked_store_codes;
                        END IF;

                        -- Update order_quantity_eaches based on updated order_quantity
                        query_text := format('
                            UPDATE inventory_smart.oms_orders_recommended oor 
                            SET order_quantity_eaches = CASE WHEN oor.pack_id IS NOT NULL THEN oor.pack_config*oor.order_quantity ELSE oor.order_quantity END, updated_by = $3, updated_at = CURRENT_TIMESTAMP,
                                order_gen_type = ''Edited''
                            WHERE 
                                oor.order_gen_type in (''Recommended'',''Scenario'',''Edited'',''edited'') AND
                                oor.article = $1
                                AND %I::text = $2::text
                                AND ($4::varchar[] IS NULL OR array_length($4::varchar[], 1) IS NULL OR oor.loc_code = ANY($4::varchar[]))', timeperiod_column);
                                
                            EXECUTE query_text
                            USING l0_record.p_article, fiscal_period.fiscal_timeperiod_id, user_id_int, selected_linked_store_codes;

                        RAISE NOTICE 'Successfully updated order quantities for article % in time period % (column: %)', 
                                    l0_record.p_article, fiscal_period.fiscal_timeperiod_id, timeperiod_column;
                    END IF;
                ELSIF l0_record.ratio IS NOT NULL AND l0_record.ratio != '' THEN
                    -- Count how many records we have to make sure they exist
                        query_text := format('
                            SELECT COUNT(*) 
                            FROM inventory_smart.oms_orders_recommended
                            WHERE 
                            order_gen_type in (''Recommended'',''Scenario'',''Edited'',''edited'') AND
                            article = $1
                            AND %I::text = $2::text
                            AND ($3::varchar[] IS NULL OR array_length($3::varchar[], 1) IS NULL OR loc_code = ANY($3::varchar[]))', timeperiod_column);
                            
                        EXECUTE query_text INTO record_count
                        USING l0_record.p_article, fiscal_period.fiscal_timeperiod_id, selected_linked_store_codes;

                        -- Check if there are any orders for this combination
                        IF record_count = 0 THEN
                            RAISE NOTICE 'No orders found for article % in time period % (column: %)', 
                                        l0_record.p_article, fiscal_period.fiscal_timeperiod_id, timeperiod_column;
                            RETURN;
                        END IF;

                        -- Update order_quantity directly using the provided ratio
                        query_text := format('
                            UPDATE inventory_smart.oms_orders_recommended oor 
                            SET order_quantity = CEIL(COALESCE(oor.roq_constrained, 0) * $1::FLOAT)::INTEGER, 
                            order_quantity_eaches = CASE WHEN oor.pack_id IS NOT NULL THEN oor.pack_config*CEIL(COALESCE(oor.roq_constrained, 0) * $1::FLOAT)::INTEGER ELSE CEIL(COALESCE(oor.roq_constrained, 0) * $1::FLOAT)::INTEGER END, 
                            order_gen_type  = ''Edited'', updated_by = $4, updated_at = CURRENT_TIMESTAMP
                            WHERE 
                            oor.order_gen_type in (''Recommended'',''Scenario'',''Edited'',''edited'') AND
                            oor.article = $2
                            AND %I::text = $3::text
                            AND ($5::varchar[] IS NULL OR array_length($5::varchar[], 1) IS NULL OR oor.loc_code = ANY($5::varchar[]))', timeperiod_column);
                            
                        EXECUTE query_text
                        USING NULLIF(l0_record.ratio, ''), l0_record.p_article, fiscal_period.fiscal_timeperiod_id, user_id_int, selected_linked_store_codes;

                        RAISE NOTICE 'Successfully updated order quantities for article % in time period % using ratio %', 
                                    l0_record.p_article, fiscal_period.fiscal_timeperiod_id, l0_record.ratio;
                    ELSIF l0_record.target_quantity IS NOT NULL AND l0_record.target_quantity != '' THEN
                        -- Calculate the sum of all roq_constrained values for this article with time period
                        query_text := format('
                            SELECT SUM(COALESCE(roq_constrained, 0))::FLOAT 
                            FROM inventory_smart.oms_orders_recommended
                            WHERE 
                            order_gen_type in (''Recommended'',''Scenario'',''Edited'',''edited'') AND
                            article = $1
                            AND %I::text = $2::text
                            AND ($3::varchar[] IS NULL OR array_length($3::varchar[], 1) IS NULL OR loc_code = ANY($3::varchar[]))', timeperiod_column);
                            
                        EXECUTE query_text INTO total_roq_constrained
                        USING l0_record.p_article, fiscal_period.fiscal_timeperiod_id, selected_linked_store_codes;

                        -- Count how many records we have
                        query_text := format('
                            SELECT COUNT(*) 
                            FROM inventory_smart.oms_orders_recommended
                            WHERE 
                            order_gen_type in (''Recommended'',''Scenario'',''Edited'',''edited'') AND
                            article = $1
                            AND %I::text = $2::text
                            AND ($3::varchar[] IS NULL OR array_length($3::varchar[], 1) IS NULL OR loc_code = ANY($3::varchar[]))', timeperiod_column);
                            
                        EXECUTE query_text INTO record_count
                        USING l0_record.p_article, fiscal_period.fiscal_timeperiod_id, selected_linked_store_codes;

                        -- Check if there are any orders for this combination
                        IF record_count = 0 THEN
                            RAISE NOTICE 'No orders found for article % in time period % (column: %)', 
                                        l0_record.p_article, fiscal_period.fiscal_timeperiod_id, timeperiod_column;
                            RETURN;
                        END IF;

                        -- If total roq_constrained is zero, handle with equal split
                        IF total_roq_constrained IS NULL OR total_roq_constrained = 0 THEN
                            RAISE NOTICE 'Total roq_constrained is zero for article % in time period %. Using equal split.', 
                                        l0_record.p_article, fiscal_period.fiscal_timeperiod_id;
                            
                            -- Calculate equal split quantity
                            equal_split_quantity := CEIL(NULLIF(l0_record.target_quantity, '')::FLOAT / record_count::FLOAT)::INTEGER;
                            
                            -- Update with equal split
                            query_text := format('
                                UPDATE inventory_smart.oms_orders_recommended oor 
                                SET order_quantity = $1, 
                                order_quantity_eaches = CASE WHEN oor.pack_id IS NOT NULL THEN oor.pack_config*$1 ELSE $1 END, updated_by = $4, updated_at = CURRENT_TIMESTAMP
                                WHERE 
                                oor.order_gen_type in (''Recommended'',''Scenario'',''Edited'',''edited'') AND
                                oor.article = $2
                                AND %I::text = $3::text
                                AND ($5::varchar[] IS NULL OR array_length($5::varchar[], 1) IS NULL OR oor.loc_code = ANY($5::varchar[]))', timeperiod_column);
                                
                            EXECUTE query_text
                            USING equal_split_quantity, l0_record.p_article, fiscal_period.fiscal_timeperiod_id, user_id_int, selected_linked_store_codes;
                        ELSE
                            -- Regular update: Update order_quantity based on proportion of roq_constrained
                            quantity_ratio := NULLIF(l0_record.target_quantity, '')::FLOAT / total_roq_constrained::FLOAT;
                            query_text := format('
                                UPDATE inventory_smart.oms_orders_recommended oor 
                                SET order_quantity = CASE 
                                    WHEN COALESCE(oor.roq_constrained, 0) = 0 THEN 0
                                    ELSE CEIL(COALESCE(oor.roq_constrained, 0) * $1)::INTEGER
                                END,
                                    order_quantity_eaches = CASE 
                                    WHEN COALESCE(oor.roq_constrained, 0) = 0 THEN 0
                                    ELSE CEIL(COALESCE(oor.roq_constrained, 0) * $1)::INTEGER
                                END, order_gen_type  = ''Edited'', updated_by = $4, updated_at = CURRENT_TIMESTAMP
                                WHERE 
                                oor.order_gen_type in (''Recommended'',''Scenario'',''Edited'',''edited'') AND
                                oor.article = $2
                                AND %I::text = $3::text
                                AND ($5::varchar[] IS NULL OR array_length($5::varchar[], 1) IS NULL OR oor.loc_code = ANY($5::varchar[]))', timeperiod_column);
                                    
                            EXECUTE query_text
                            USING quantity_ratio, l0_record.p_article, fiscal_period.fiscal_timeperiod_id, user_id_int, selected_linked_store_codes;
                        END IF;

                        -- Update order_quantity_eaches based on updated order_quantity
                        query_text := format('
                            UPDATE inventory_smart.oms_orders_recommended oor 
                            SET order_quantity_eaches = CASE WHEN oor.pack_id IS NOT NULL THEN oor.pack_config*oor.order_quantity ELSE oor.order_quantity END, updated_by = $3, updated_at = CURRENT_TIMESTAMP,
                                order_gen_type = ''Edited''
                            WHERE 
                                oor.order_gen_type in (''Recommended'',''Scenario'',''Edited'',''edited'') AND
                                oor.article = $1
                                AND %I::text = $2::text
                                AND ($4::varchar[] IS NULL OR array_length($4::varchar[], 1) IS NULL OR oor.loc_code = ANY($4::varchar[]))', timeperiod_column);
                                
                            EXECUTE query_text
                            USING l0_record.p_article, fiscal_period.fiscal_timeperiod_id, user_id_int, selected_linked_store_codes;

                        RAISE NOTICE 'Successfully updated order quantities for article % in time period % (column: %)', 
                                    l0_record.p_article, fiscal_period.fiscal_timeperiod_id, timeperiod_column;
                END IF;
                
                -- Process level 1 (location level)
                IF l0_record.l1 IS NOT NULL THEN
                    FOR l1_record IN
                        SELECT 
                            t.name AS p_loc_code,
                            t.value AS target_quantity,
                            t.ratio AS ratio,
                            t.pack_id AS pack_id,
                            t.l2 AS l2
                        FROM jsonb_to_recordset(l0_record.l1::jsonb) AS 
                            t(name text, value text, ratio text, pack_id text, l2 jsonb)
                    LOOP
                        -- Process each location
                        IF l1_record.pack_id IS NOT NULL AND l1_record.pack_id != 'WP' THEN
                            IF l1_record.target_quantity !='' THEN 
                                -- Validate the inputs
                                IF l0_record.p_article IS NULL OR l0_record.p_article = '' THEN
                                    RAISE EXCEPTION 'Article number cannot be null or empty';
                                END IF;
                                
                                IF l1_record.p_loc_code IS NULL OR l1_record.p_loc_code = '' THEN
                                    RAISE EXCEPTION 'Location code cannot be null or empty';
                                END IF;

                                -- Calculate the sum of all pack level order quantities for this article and location using dynamic SQL
                                query_text := format('
                                    SELECT SUM(pack_level_order_quantity)::FLOAT 
                                FROM (
                                    SELECT 
                                        SUM(distinct order_quantity) AS pack_level_order_quantity
                                    FROM 
                                        inventory_smart.oms_orders_recommended
                                    WHERE 
                                        order_gen_type in (''Recommended'',''Scenario'',''Edited'',''edited'') AND
                                        article = $1 AND    
                                        loc_code = $2 AND
                                        %I::text = $3::text
                                        AND ($4::varchar[] IS NULL OR array_length($4::varchar[], 1) IS NULL OR loc_code = ANY($4::varchar[]))
                                    GROUP BY 
                                        article,
                                        loc_code,
                                        pack_id,
                                        order_status_id,
                                        order_type
                                    ) AS pack_level_data', timeperiod_column);
                                    
                                    EXECUTE query_text INTO total_quantity
                                    USING l0_record.p_article, l1_record.p_loc_code, fiscal_period.fiscal_timeperiod_id, selected_linked_store_codes;

                                -- Check if there are any orders for this article and location
                                IF total_quantity IS NULL THEN
                                    RAISE NOTICE 'No orders found for article % at location %', l0_record.p_article, l1_record.p_loc_code;
                                    RETURN;
                                END IF;

                                -- Count how many unique combinations we have
                                    query_text := format('
                                        SELECT COUNT(*) 
                                FROM (
                                    SELECT 
                                        article, loc_code, pack_id, order_status_id, order_type
                                    FROM 
                                        inventory_smart.oms_orders_recommended
                                    WHERE 
                                        order_gen_type in (''Recommended'',''Scenario'',''Edited'',''edited'') AND
                                        article = $1 AND
                                        loc_code = $2 AND
                                        %I::text = $3::text
                                        AND ($4::varchar[] IS NULL OR array_length($4::varchar[], 1) IS NULL OR loc_code = ANY($4::varchar[]))
                                    GROUP BY 
                                        article, loc_code, pack_id, order_status_id, order_type
                                        ) AS unique_combinations', timeperiod_column);
                                    
                                    EXECUTE query_text INTO record_count
                                    USING l0_record.p_article, l1_record.p_loc_code, fiscal_period.fiscal_timeperiod_id, selected_linked_store_codes;

                                -- If total quantity is zero or record count is zero, handle with equal split
                                IF total_quantity = 0 OR record_count = 0 THEN
                                    RAISE NOTICE 'Total quantity is zero for article % at location %. Using equal split.', l0_record.p_article, l1_record.p_loc_code;
                                    
                                    -- Recalculate record count if it's zero
                                    IF record_count = 0 THEN
                                            query_text := format('
                                                SELECT COUNT(*) 
                                        FROM inventory_smart.oms_orders_recommended
                                                WHERE order_gen_type in (''Recommended'',''Scenario'',''Edited'',''edited'') AND
                                                article = $1 AND
                                                loc_code = $2 AND
                                                %I::text = $3::text
                                                AND ($4::varchar[] IS NULL OR array_length($4::varchar[], 1) IS NULL OR loc_code = ANY($4::varchar[]))', timeperiod_column);
                                            
                                            EXECUTE query_text INTO record_count
                                            USING l0_record.p_article, l1_record.p_loc_code, fiscal_period.fiscal_timeperiod_id, selected_linked_store_codes;
                                        
                                        IF record_count = 0 THEN
                                            RAISE NOTICE 'No records found for article % at location %', l0_record.p_article, l1_record.p_loc_code;
                                            RETURN;
                                        END IF;
                                    END IF;
                                    
                                    -- Calculate equal split quantity
                                        equal_split_quantity := CEIL(NULLIF(l1_record.target_quantity, '')::FLOAT / record_count::FLOAT)::INTEGER;
                                    
                                    -- Update with equal split
                                        query_text := format('
                                    UPDATE inventory_smart.oms_orders_recommended oor 
                                            SET order_quantity = $1, 
                                            order_quantity_eaches = CASE WHEN oor.pack_id IS NOT NULL THEN oor.pack_config*$1 ELSE $1 END, updated_by = $5, updated_at = CURRENT_TIMESTAMP
                                            WHERE 
                                            oor.order_gen_type in (''Recommended'',''Scenario'',''Edited'',''edited'') AND
                                            oor.article = $2 AND
                                            loc_code = $3 AND
                                            %I::text = $4::text
                                            AND ($6::varchar[] IS NULL OR array_length($6::varchar[], 1) IS NULL OR oor.loc_code = ANY($6::varchar[]))', timeperiod_column);
                                            
                                            EXECUTE query_text
                                            USING equal_split_quantity, l0_record.p_article, l1_record.p_loc_code, fiscal_period.fiscal_timeperiod_id, user_id_int, selected_linked_store_codes;
                                ELSE
                                    -- Regular update: Update order_quantity based on proportion of total
                                        query_text := format('
                                    UPDATE inventory_smart.oms_orders_recommended oor 
                                    SET order_quantity = 
                                        CEIL(
                                            (SELECT SUM(distinct oor2.order_quantity) 
                                            FROM inventory_smart.oms_orders_recommended oor2
                                            WHERE oor2.article = oor.article
                                            AND oor2.pack_id = oor.pack_id
                                            AND oor2.loc_code = oor.loc_code
                                            AND oor2.order_type = oor.order_type
                                            AND oor2.order_status_id = oor.order_status_id
                                            AND oor2.%I::text = oor.%I::text
                                            AND ($7::varchar[] IS NULL OR array_length($7::varchar[], 1) IS NULL OR oor2.loc_code = ANY($7::varchar[])))
                                                    * ($1 / $2)
                                                )::INTEGER,
                                                updated_by = $3,
                                                updated_at = CURRENT_TIMESTAMP
                                    WHERE 
                                                oor.order_gen_type in (''Recommended'',''Scenario'',''Edited'',''edited'') AND  
                                                oor.article = $4 AND
                                                loc_code = $5 AND
                                                %I::text = $6::text
                                                AND ($7::varchar[] IS NULL OR array_length($7::varchar[], 1) IS NULL OR oor.loc_code = ANY($7::varchar[]))', timeperiod_column, timeperiod_column, timeperiod_column);
                                            
                                            EXECUTE query_text
                                            USING NULLIF(l1_record.target_quantity, '')::FLOAT, total_quantity, user_id_int, 
                                                  l0_record.p_article, l1_record.p_loc_code, fiscal_period.fiscal_timeperiod_id, selected_linked_store_codes;
                                END IF;

                                -- Second update: Update order_quantity_eaches based on updated order_quantity
                                    query_text := format('
                                UPDATE inventory_smart.oms_orders_recommended oor 
                                SET order_quantity_eaches = CASE WHEN oor.pack_id IS NOT NULL THEN oor.pack_config*oor.order_quantity ELSE oor.order_quantity END, updated_by = $4, updated_at = CURRENT_TIMESTAMP,
                                    order_gen_type = ''Edited''
                                WHERE 
                                            oor.order_gen_type in (''Recommended'',''Scenario'',''Edited'',''edited'') AND
                                            oor.article = $1 AND
                                            loc_code = $2 AND
                                            %I::text = $3::text
                                            AND ($5::varchar[] IS NULL OR array_length($5::varchar[], 1) IS NULL OR oor.loc_code = ANY($5::varchar[]))', timeperiod_column);

                                            EXECUTE query_text
                                            USING l0_record.p_article, l1_record.p_loc_code, fiscal_period.fiscal_timeperiod_id, user_id_int, selected_linked_store_codes;
                                RAISE NOTICE 'Successfully updated order quantities for article % at location %', l0_record.p_article, l1_record.p_loc_code;
                            END IF;
                        ELSIF l1_record.pack_id IS NOT NULL AND l1_record.pack_id = 'WP' THEN
                            -- Weighted pack update
                            IF l1_record.ratio IS NOT NULL AND l1_record.ratio != '' THEN
                                 -- Count how many records we have to make sure they exist
                                query_text := format('
                                    SELECT COUNT(*) 
                                    FROM inventory_smart.oms_orders_recommended
                                    WHERE order_gen_type in (''Recommended'',''Scenario'',''Edited'',''edited'') AND
                                    article = $1
                                    AND loc_code = $2
                                    AND %I::text = $3::text
                                    AND ($4::varchar[] IS NULL OR array_length($4::varchar[], 1) IS NULL OR loc_code = ANY($4::varchar[]))', timeperiod_column);
                                    
                                EXECUTE query_text INTO record_count
                                USING l0_record.p_article, l1_record.p_loc_code, fiscal_period.fiscal_timeperiod_id, selected_linked_store_codes;

                                -- Check if there are any orders for this combination
                                IF record_count = 0 THEN
                                    RAISE NOTICE 'No orders found for article % in time period % (column: %) at location %', 
                                                l0_record.p_article, fiscal_period.fiscal_timeperiod_id, timeperiod_column, l1_record.p_loc_code;
                                    RETURN;
                                END IF;

                                -- Update order_quantity directly using the provided ratio
                                query_text := format('
                                    UPDATE inventory_smart.oms_orders_recommended oor 
                                    SET order_quantity = CEIL(COALESCE(oor.roq_constrained, 0) * $1::FLOAT)::INTEGER, order_gen_type  = ''Edited'', updated_by = $5, updated_at = CURRENT_TIMESTAMP
                                    WHERE oor.order_gen_type in (''Recommended'',''Scenario'',''Edited'',''edited'') AND
                                    oor.article = $2
                                    AND oor.loc_code = $3
                                    AND %I::text = $4::text
                                    AND ($6::varchar[] IS NULL OR array_length($6::varchar[], 1) IS NULL OR oor.loc_code = ANY($6::varchar[]))', timeperiod_column);
                                    
                                EXECUTE query_text
                                USING NULLIF(l1_record.ratio, ''), l0_record.p_article, l1_record.p_loc_code, fiscal_period.fiscal_timeperiod_id, user_id_int, selected_linked_store_codes;

                                -- Update order_quantity_eaches based on updated order_quantity
                                query_text := format('
                                    UPDATE inventory_smart.oms_orders_recommended oor 
                                    SET order_quantity_eaches = CASE WHEN oor.pack_id IS NOT NULL THEN oor.pack_config*oor.order_quantity ELSE oor.order_quantity END, updated_by = $4, updated_at = CURRENT_TIMESTAMP,
                                        order_gen_type = ''Edited''
                                    WHERE 
                                    oor.order_gen_type in (''Recommended'',''Scenario'',''Edited'',''edited'') AND
                                    oor.article = $1
                                    AND oor.loc_code = $2
                                        AND %I::text = $3::text
                                        AND ($5::varchar[] IS NULL OR array_length($5::varchar[], 1) IS NULL OR oor.loc_code = ANY($5::varchar[]))', timeperiod_column);
                                        
                                EXECUTE query_text
                                USING l0_record.p_article, l1_record.p_loc_code, fiscal_period.fiscal_timeperiod_id, user_id_int, selected_linked_store_codes;

                                RAISE NOTICE 'Successfully updated order quantities for article % in time period % at location % using ratio %', 
                                            l0_record.p_article, fiscal_period.fiscal_timeperiod_id, l1_record.p_loc_code, l1_record.ratio;
                            ELSIF l1_record.target_quantity IS NOT NULL AND l1_record.target_quantity != '' THEN
                                -- Calculate the sum of all roq_constrained values for this article with time period
                                query_text := format('
                                    SELECT SUM(COALESCE(roq_constrained, 0))::FLOAT 
                                    FROM inventory_smart.oms_orders_recommended
                                    WHERE order_gen_type in (''Recommended'',''Scenario'',''Edited'',''edited'') AND
                                    article = $1
                                    AND loc_code = $2
                                    AND %I::text = $3::text
                                    AND ($4::varchar[] IS NULL OR array_length($4::varchar[], 1) IS NULL OR loc_code = ANY($4::varchar[]))', timeperiod_column);
                                    
                                EXECUTE query_text INTO total_roq_constrained
                                USING l0_record.p_article, l1_record.p_loc_code, fiscal_period.fiscal_timeperiod_id, selected_linked_store_codes;

                                -- Count how many records we have
                                query_text := format('
                                    SELECT COUNT(*) 
                                    FROM inventory_smart.oms_orders_recommended
                                    WHERE order_gen_type in (''Recommended'',''Scenario'',''Edited'',''edited'') AND
                                    article = $1
                                    AND loc_code = $2
                                    AND %I::text = $3::text
                                    AND ($4::varchar[] IS NULL OR array_length($4::varchar[], 1) IS NULL OR loc_code = ANY($4::varchar[]))', timeperiod_column);
                                    
                                EXECUTE query_text INTO record_count
                                USING l0_record.p_article, l1_record.p_loc_code, fiscal_period.fiscal_timeperiod_id, selected_linked_store_codes;

                                -- Check if there are any orders for this combination
                                IF record_count = 0 THEN
                                    RAISE NOTICE 'No orders found for article % in time period % (column: %) at location %', 
                                                l0_record.p_article, fiscal_period.fiscal_timeperiod_id, timeperiod_column, l1_record.p_loc_code;
                                    RETURN;
                                END IF;

                                -- If total roq_constrained is zero, handle with equal split
                                IF total_roq_constrained IS NULL OR total_roq_constrained = 0 THEN
                                    RAISE NOTICE 'Total roq_constrained is zero for article % in time period % at location %. Using equal split.', 
                                                l0_record.p_article, fiscal_period.fiscal_timeperiod_id, l1_record.p_loc_code;
                                    
                                    -- Calculate equal split quantity
                                    equal_split_quantity := CEIL(NULLIF(l1_record.target_quantity, '')::INTEGER / record_count::INTEGER)::INTEGER;
                                    
                                    -- Update with equal split
                                    query_text := format('
                                        UPDATE inventory_smart.oms_orders_recommended oor 
                                        SET order_quantity = $1, 
                                        order_quantity_eaches = CASE WHEN oor.pack_id IS NOT NULL THEN oor.pack_config*$1 ELSE $1 END, updated_by = $5, updated_at = CURRENT_TIMESTAMP
                                        WHERE oor.order_gen_type in (''Recommended'',''Scenario'',''Edited'',''edited'') AND
                                        oor.article = $2
                                        AND oor.loc_code = $3
                                        AND %I::text = $4::text
                                        AND ($6::varchar[] IS NULL OR array_length($6::varchar[], 1) IS NULL OR oor.loc_code = ANY($6::varchar[]))', timeperiod_column);
                                        
                                    EXECUTE query_text
                                    USING equal_split_quantity, l0_record.p_article, l1_record.p_loc_code, fiscal_period.fiscal_timeperiod_id, user_id_int, selected_linked_store_codes;
                                ELSE
                                    -- Regular update: Update order_quantity based on proportion of roq_constrained
                                    quantity_ratio := NULLIF(l1_record.target_quantity, '')::FLOAT / total_roq_constrained::FLOAT;
                                    query_text := format('
                                        UPDATE inventory_smart.oms_orders_recommended oor 
                                        SET order_quantity = CASE 
                                            WHEN COALESCE(oor.roq_constrained, 0) = 0 THEN 0
                                            ELSE CEIL(COALESCE(oor.roq_constrained, 0) * $1)::INTEGER
                                        END, updated_by = $5, updated_at = CURRENT_TIMESTAMP
                                        WHERE 
                                        oor.order_gen_type in (''Recommended'',''Scenario'',''Edited'',''edited'') AND
                                        oor.article = $2
                                        AND oor.loc_code = $3
                                            AND %I::text = $4::text
                                            AND ($6::varchar[] IS NULL OR array_length($6::varchar[], 1) IS NULL OR oor.loc_code = ANY($6::varchar[]))', timeperiod_column);
                                            
                                    EXECUTE query_text
                                    USING quantity_ratio, l0_record.p_article, l1_record.p_loc_code, fiscal_period.fiscal_timeperiod_id, user_id_int, selected_linked_store_codes;
                                END IF;

                                -- Update order_quantity_eaches based on updated order_quantity
                                query_text := format('
                                    UPDATE inventory_smart.oms_orders_recommended oor 
                                    SET order_quantity_eaches = CASE WHEN oor.pack_id IS NOT NULL THEN oor.pack_config*oor.order_quantity ELSE oor.order_quantity END, updated_by = $4, updated_at = CURRENT_TIMESTAMP,
                                        order_gen_type = ''Edited''
                                    WHERE oor.order_gen_type in (''Recommended'',''Scenario'',''Edited'',''edited'') AND
                                        oor.article = $1
                                        AND oor.loc_code = $2
                                        AND %I::text = $3::text
                                        AND ($5::varchar[] IS NULL OR array_length($5::varchar[], 1) IS NULL OR oor.loc_code = ANY($5::varchar[]))', timeperiod_column);
                                        
                                EXECUTE query_text
                                USING l0_record.p_article, l1_record.p_loc_code, fiscal_period.fiscal_timeperiod_id, user_id_int, selected_linked_store_codes;

                                RAISE NOTICE 'Successfully updated order quantities for article % in time period % (column: %) at location %', 
                                            l0_record.p_article, fiscal_period.fiscal_timeperiod_id, timeperiod_column, l1_record.p_loc_code;
                            END IF;
                        ELSIF l1_record.ratio IS NOT NULL AND l1_record.ratio != '' THEN
                            -- Count how many records we have to make sure they exist
                                query_text := format('
                                    SELECT COUNT(*) 
                                    FROM inventory_smart.oms_orders_recommended
                                    WHERE order_gen_type in (''Recommended'',''Scenario'',''Edited'',''edited'') AND
                                    article = $1
                                    AND loc_code = $2
                                    AND %I::text = $3::text
                                    AND ($4::varchar[] IS NULL OR array_length($4::varchar[], 1) IS NULL OR loc_code = ANY($4::varchar[]))', timeperiod_column);
                                    
                                EXECUTE query_text INTO record_count
                                USING l0_record.p_article, l1_record.p_loc_code, fiscal_period.fiscal_timeperiod_id, selected_linked_store_codes;

                                -- Check if there are any orders for this combination
                                IF record_count = 0 THEN
                                    RAISE NOTICE 'No orders found for article % in time period % (column: %) at location %', 
                                                l0_record.p_article, fiscal_period.fiscal_timeperiod_id, timeperiod_column, l1_record.p_loc_code;
                                    RETURN;
                                END IF;

                                -- Update order_quantity directly using the provided ratio
                                query_text := format('
                                    UPDATE inventory_smart.oms_orders_recommended oor 
                                    SET order_quantity = CEIL(COALESCE(oor.roq_constrained, 0) * $1::FLOAT)::INTEGER,
                                    order_quantity_eaches = CASE WHEN oor.pack_id IS NOT NULL THEN oor.pack_config*CEIL(COALESCE(oor.roq_constrained, 0) * $1::FLOAT)::INTEGER ELSE CEIL(COALESCE(oor.roq_constrained, 0) * $1::FLOAT)::INTEGER END, order_gen_type  = ''Edited'', updated_by = $5, updated_at = CURRENT_TIMESTAMP
                                    WHERE oor.order_gen_type in (''Recommended'',''Scenario'',''Edited'',''edited'') AND
                                    oor.article = $2
                                    AND oor.loc_code = $3
                                    AND %I::text = $4::text
                                    AND ($6::varchar[] IS NULL OR array_length($6::varchar[], 1) IS NULL OR oor.loc_code = ANY($6::varchar[]))', timeperiod_column);
                                    
                                EXECUTE query_text
                                USING NULLIF(l1_record.ratio, ''), l0_record.p_article, l1_record.p_loc_code, fiscal_period.fiscal_timeperiod_id, user_id_int, selected_linked_store_codes;

                                RAISE NOTICE 'Successfully updated order quantities for article % in time period % at location % using ratio %', 
                                            l0_record.p_article, fiscal_period.fiscal_timeperiod_id, l1_record.p_loc_code, l1_record.ratio;
                        ELSIF l1_record.target_quantity IS NOT NULL AND l1_record.target_quantity != '' THEN
                            -- Calculate the sum of all roq_constrained values for this article with time period
                                query_text := format('
                                    SELECT SUM(COALESCE(roq_constrained, 0))::FLOAT 
                                    FROM inventory_smart.oms_orders_recommended
                                    WHERE order_gen_type in (''Recommended'',''Scenario'',''Edited'',''edited'') AND
                                    article = $1
                                    AND loc_code = $2
                                    AND %I::text = $3::text
                                    AND ($4::varchar[] IS NULL OR array_length($4::varchar[], 1) IS NULL OR loc_code = ANY($4::varchar[]))', timeperiod_column);
                                    
                                EXECUTE query_text INTO total_roq_constrained
                                USING l0_record.p_article, l1_record.p_loc_code, fiscal_period.fiscal_timeperiod_id, selected_linked_store_codes;

                                -- Count how many records we have
                                query_text := format('
                                    SELECT COUNT(*) 
                                    FROM inventory_smart.oms_orders_recommended
                                    WHERE order_gen_type in (''Recommended'',''Scenario'',''Edited'',''edited'') AND
                                    article = $1
                                    AND loc_code = $2
                                    AND %I::text = $3::text
                                    AND ($4::varchar[] IS NULL OR array_length($4::varchar[], 1) IS NULL OR loc_code = ANY($4::varchar[]))', timeperiod_column);
                                    
                                EXECUTE query_text INTO record_count
                                USING l0_record.p_article, l1_record.p_loc_code, fiscal_period.fiscal_timeperiod_id, selected_linked_store_codes;

                                -- Check if there are any orders for this combination
                                IF record_count = 0 THEN
                                    RAISE NOTICE 'No orders found for article % in time period % (column: %) at location %', 
                                                l0_record.p_article, fiscal_period.fiscal_timeperiod_id, timeperiod_column, l1_record.p_loc_code;
                                    RETURN;
                                END IF;

                                -- If total roq_constrained is zero, handle with equal split
                                IF total_roq_constrained IS NULL OR total_roq_constrained = 0 THEN
                                    RAISE NOTICE 'Total roq_constrained is zero for article % in time period % at location %. Using equal split.', 
                                                l0_record.p_article, fiscal_period.fiscal_timeperiod_id, l1_record.p_loc_code;
                                    
                                    -- Calculate equal split quantity
                                    equal_split_quantity := CEIL(NULLIF(l1_record.target_quantity, '')::INTEGER / record_count::INTEGER)::INTEGER;
                                    
                                    -- Update with equal split
                                    query_text := format('
                                        UPDATE inventory_smart.oms_orders_recommended oor 
                                        SET order_quantity = $1, 
                                        order_quantity_eaches = CASE WHEN oor.pack_id IS NOT NULL THEN oor.pack_config*$1 ELSE $1 END, updated_by = $5, updated_at = CURRENT_TIMESTAMP
                                        WHERE oor.order_gen_type in (''Recommended'',''Scenario'',''Edited'',''edited'') AND
                                        oor.article = $2
                                        AND oor.loc_code = $3
                                        AND %I::text = $4::text
                                        AND ($6::varchar[] IS NULL OR array_length($6::varchar[], 1) IS NULL OR oor.loc_code = ANY($6::varchar[]))', timeperiod_column);
                                        
                                    EXECUTE query_text
                                    USING equal_split_quantity, l0_record.p_article, l1_record.p_loc_code, fiscal_period.fiscal_timeperiod_id, user_id_int, selected_linked_store_codes;
                                ELSE
                                    -- Regular update: Update order_quantity based on proportion of roq_constrained
                                    quantity_ratio := NULLIF(l1_record.target_quantity, '')::FLOAT / total_roq_constrained::FLOAT;
                                    query_text := format('
                                        UPDATE inventory_smart.oms_orders_recommended oor 
                                        SET order_quantity = CASE 
                                            WHEN COALESCE(oor.roq_constrained, 0) = 0 THEN 0
                                            ELSE CEIL(COALESCE(oor.roq_constrained, 0) * $1)::INTEGER
                                        END,
                                            order_quantity_eaches = CASE 
                                            WHEN COALESCE(oor.roq_constrained, 0) = 0 THEN 0
                                            ELSE CEIL(COALESCE(oor.roq_constrained, 0) * $1)::INTEGER
                                        END, order_gen_type  = ''Edited'', updated_by = $5, updated_at = CURRENT_TIMESTAMP
                                        WHERE 
                                            oor.order_gen_type in (''Recommended'',''Scenario'',''Edited'',''edited'') AND
                                            oor.article = $2
                                            AND oor.loc_code = $3
                                            AND %I::text = $4::text
                                            AND ($6::varchar[] IS NULL OR array_length($6::varchar[], 1) IS NULL OR oor.loc_code = ANY($6::varchar[]))', timeperiod_column);
                                            
                                    EXECUTE query_text
                                    USING quantity_ratio, l0_record.p_article, l1_record.p_loc_code, fiscal_period.fiscal_timeperiod_id, user_id_int, selected_linked_store_codes;
                                END IF;

                                -- Update order_quantity_eaches based on updated order_quantity
                                query_text := format('
                                    UPDATE inventory_smart.oms_orders_recommended oor 
                                    SET order_quantity_eaches = CASE WHEN oor.pack_id IS NOT NULL THEN oor.pack_config*oor.order_quantity ELSE oor.order_quantity END, updated_by = $4, updated_at = CURRENT_TIMESTAMP,
                                        order_gen_type = ''Edited''
                                    WHERE oor.order_gen_type in (''Recommended'',''Scenario'',''Edited'',''edited'') AND
                                        oor.article = $1
                                        AND oor.loc_code = $2
                                        AND %I::text = $3::text
                                        AND ($5::varchar[] IS NULL OR array_length($5::varchar[], 1) IS NULL OR oor.loc_code = ANY($5::varchar[]))', timeperiod_column);
                                        
                                EXECUTE query_text
                                USING l0_record.p_article, l1_record.p_loc_code, fiscal_period.fiscal_timeperiod_id, user_id_int, selected_linked_store_codes;

                                RAISE NOTICE 'Successfully updated order quantities for article % in time period % (column: %) at location %', 
                                            l0_record.p_article, fiscal_period.fiscal_timeperiod_id, timeperiod_column, l1_record.p_loc_code;
                        END IF;
                        
                        -- Process level 2 (size level)
                        IF l1_record.l2 IS NOT NULL THEN
                            FOR l2_record IN
                                SELECT 
                                    t.name AS p_name,
                                    t.value AS target_quantity,
                                    t.ratio AS ratio,
                                    t.pack_id AS p_pack_id
                                FROM jsonb_to_recordset(l1_record.l2::jsonb) AS 
                                    t(name text, value text, ratio text, pack_id text)
                            LOOP
                                -- Process each size
                                IF l2_record.p_pack_id IS NOT NULL AND l2_record.p_pack_id != 'WP' THEN
                                    IF l2_record.target_quantity !='' THEN 
                                        -- Validate the inputs
                                        IF l0_record.p_article IS NULL OR l0_record.p_article = '' THEN
                                            RAISE EXCEPTION 'Article number cannot be null or empty';
                                        END IF;
                                        
                                        IF l1_record.p_loc_code IS NULL OR l1_record.p_loc_code = '' THEN
                                            RAISE EXCEPTION 'Location code cannot be null or empty';
                                        END IF;
                                        
                                        IF l2_record.p_name IS NULL OR l2_record.p_name = '' THEN
                                            RAISE EXCEPTION 'Pack ID cannot be null or empty';
                                        END IF;

                                        -- Calculate the sum of all order quantities for this article, location and pack_id using dynamic SQL
                                        query_text := format('
                                            SELECT SUM(pack_level_order_quantity)::FLOAT 
                                        FROM (
                                            SELECT 
                                                SUM(distinct order_quantity) AS pack_level_order_quantity
                                            FROM 
                                                inventory_smart.oms_orders_recommended
                                            WHERE 
                                                order_gen_type in (''Recommended'',''Scenario'',''Edited'',''edited'') AND
                                                article = $1 AND
                                                loc_code = $2 AND
                                                pack_id = $3 AND
                                                %I::text = $4::text
                                                AND ($5::varchar[] IS NULL OR array_length($5::varchar[], 1) IS NULL OR loc_code = ANY($5::varchar[]))
                                            GROUP BY 
                                                article,
                                                loc_code,
                                                pack_id,
                                                order_status_id,
                                                order_type
                                            ) AS pack_level_data', timeperiod_column);
                                            
                                            EXECUTE query_text INTO total_quantity
                                            USING l0_record.p_article, l1_record.p_loc_code, l2_record.p_name, fiscal_period.fiscal_timeperiod_id, selected_linked_store_codes;

                                        -- Check if there are any orders for this combination
                                        IF total_quantity IS NULL THEN
                                                RAISE NOTICE 'No orders found for article % at location % with pack ID %', l0_record.p_article, l1_record.p_loc_code, l2_record.p_name;
                                            RETURN;
                                        END IF;

                                        -- Count how many unique combinations we have
                                            query_text := format('
                                                SELECT COUNT(*) 
                                        FROM (
                                            SELECT 
                                                article, loc_code, pack_id, order_status_id, order_type
                                            FROM 
                                                inventory_smart.oms_orders_recommended
                                            WHERE 
                                                order_gen_type in (''Recommended'',''Scenario'',''Edited'',''edited'') AND
                                                article = $1 AND
                                                loc_code = $2 AND
                                                pack_id = $3 AND
                                                %I::text = $4::text
                                                AND ($5::varchar[] IS NULL OR array_length($5::varchar[], 1) IS NULL OR loc_code = ANY($5::varchar[]))
                                            GROUP BY 
                                                article, loc_code, pack_id, order_status_id, order_type
                                                ) AS unique_combinations', timeperiod_column);
                                                
                                                EXECUTE query_text INTO record_count
                                                USING l0_record.p_article, l1_record.p_loc_code, l2_record.p_name, fiscal_period.fiscal_timeperiod_id, selected_linked_store_codes;

                                        -- If total quantity is zero or record count is zero, handle with equal split
                                        IF total_quantity = 0 OR record_count = 0 THEN
                                            RAISE NOTICE 'Total quantity is zero for article % at location % with pack ID %. Using equal split.', 
                                                        l0_record.p_article, l1_record.p_loc_code, l2_record.p_name;
                                            
                                            -- Recalculate record count if it's zero
                                            IF record_count = 0 THEN
                                                    query_text := format('
                                                        SELECT COUNT(*) 
                                                FROM inventory_smart.oms_orders_recommended
                                                        WHERE order_gen_type in (''Recommended'',''Scenario'',''Edited'',''edited'') AND
                                                        article = $1 AND
                                                        loc_code = $2 AND
                                                        pack_id = $3 AND
                                                        %I::text = $4::text
                                                        AND ($5::varchar[] IS NULL OR array_length($5::varchar[], 1) IS NULL OR loc_code = ANY($5::varchar[]))', timeperiod_column);
                                                    
                                                    EXECUTE query_text INTO record_count
                                                    USING l0_record.p_article, l1_record.p_loc_code, l2_record.p_name, fiscal_period.fiscal_timeperiod_id, selected_linked_store_codes;
                                                
                                                IF record_count = 0 THEN
                                                    RAISE NOTICE 'No records found for article % at location % with pack ID %', 
                                                                l0_record.p_article, l1_record.p_loc_code, l2_record.p_name;
                                                    RETURN;
                                                END IF;
                                            END IF;
                                            
                                            -- Calculate equal split quantity
                                                equal_split_quantity := CEIL(NULLIF(l2_record.target_quantity, '')::FLOAT / record_count::FLOAT)::INTEGER;
                                            
                                            -- Update with equal split
                                                query_text := format('
                                            UPDATE inventory_smart.oms_orders_recommended oor 
                                                    SET order_quantity = $1, order_gen_type  = ''Edited'', updated_by = $6, updated_at = CURRENT_TIMESTAMP
                                                    WHERE oor.order_gen_type in (''Recommended'',''Scenario'',''Edited'',''edited'') AND
                                                    oor.article = $2 AND
                                                    loc_code = $3 AND
                                                    pack_id = $4 AND
                                                    %I::text = $5::text
                                                    AND ($7::varchar[] IS NULL OR array_length($7::varchar[], 1) IS NULL OR oor.loc_code = ANY($7::varchar[]))', timeperiod_column);
                                                    
                                                    EXECUTE query_text
                                                    USING equal_split_quantity, l0_record.p_article, l1_record.p_loc_code, l2_record.p_name, fiscal_period.fiscal_timeperiod_id, user_id_int, selected_linked_store_codes;
                                        ELSE
                                            -- Regular update: Update order_quantity based on proportion of total
                                                query_text := format('
                                            UPDATE inventory_smart.oms_orders_recommended oor 
                                            SET order_quantity = 
                                                CEIL(
                                                    (SELECT SUM(distinct oor2.order_quantity) 
                                                    FROM inventory_smart.oms_orders_recommended oor2
                                                    WHERE oor2.article = oor.article
                                                    AND oor2.pack_id = oor.pack_id
                                                    AND oor2.loc_code = oor.loc_code
                                                    AND oor2.order_type = oor.order_type
                                                    AND oor2.order_status_id = oor.order_status_id
                                                    AND oor2.%I::text = oor.%I::text
                                                    AND ($8::varchar[] IS NULL OR array_length($8::varchar[], 1) IS NULL OR oor2.loc_code = ANY($8::varchar[]))) 
                                                            * ($1 / $2)
                                                        )::INTEGER,
                                                        order_gen_type  = ''Edited'',
                                                        updated_by = $3,
                                                        updated_at = CURRENT_TIMESTAMP
                                            WHERE 
                                                        oor.order_gen_type in (''Recommended'',''Scenario'',''Edited'',''edited'') AND
                                                        oor.article = $4 AND
                                                        loc_code = $5 AND
                                                        pack_id = $6 AND
                                                        %I::text = $7::text
                                                        AND ($8::varchar[] IS NULL OR array_length($8::varchar[], 1) IS NULL OR oor.loc_code = ANY($8::varchar[]))', timeperiod_column, timeperiod_column, timeperiod_column);
                                                    
                                                    EXECUTE query_text
                                                    USING NULLIF(l2_record.target_quantity, '')::FLOAT, total_quantity, user_id_int, 
                                                          l0_record.p_article, l1_record.p_loc_code, l2_record.p_name, fiscal_period.fiscal_timeperiod_id, selected_linked_store_codes;
                                        END IF;

                                        -- Second update: Update order_quantity_eaches based on updated order_quantity
                                            query_text := format('
                                        UPDATE inventory_smart.oms_orders_recommended oor 
                                        SET order_quantity_eaches = CASE WHEN oor.pack_id IS NOT NULL THEN oor.pack_config*oor.order_quantity ELSE oor.order_quantity END, updated_by = $5, updated_at = CURRENT_TIMESTAMP,
                                            order_gen_type = ''Edited''
                                        WHERE 
                                                    oor.order_gen_type in (''Recommended'',''Scenario'',''Edited'',''edited'') AND
                                                    oor.article = $1 AND
                                                    loc_code = $2 AND
                                                    pack_id = $3 AND
                                                    %I::text = $4::text
                                                    AND ($6::varchar[] IS NULL OR array_length($6::varchar[], 1) IS NULL OR oor.loc_code = ANY($6::varchar[]))', timeperiod_column);
                                                    
                                                    EXECUTE query_text
                                                    USING l0_record.p_article, l1_record.p_loc_code, l2_record.p_name, fiscal_period.fiscal_timeperiod_id, user_id_int, selected_linked_store_codes;
                                        RAISE NOTICE 'Successfully updated order quantities for article % at location % with pack ID %', 
                                                l0_record.p_article, l1_record.p_loc_code, l2_record.p_name;
                                    END IF;
                                ELSIF l2_record.p_pack_id IS NOT NULL AND l2_record.p_pack_id = 'WP' THEN
                                    -- Weighted pack update
                                    IF l2_record.ratio IS NOT NULL AND l2_record.ratio != '' THEN
                                        -- Update order_quantity directly using the provided ratio
                                        query_text := format('
                                            UPDATE inventory_smart.oms_orders_recommended oor 
                                            SET order_quantity = CEIL(COALESCE(oor.roq_constrained, 0) * $1::FLOAT)::INTEGER,
                                            order_quantity_eaches = CASE WHEN oor.pack_id IS NOT NULL THEN oor.pack_config*CEIL(COALESCE(oor.roq_constrained, 0) * $1::FLOAT)::INTEGER ELSE CEIL(COALESCE(oor.roq_constrained, 0) * $1::FLOAT)::INTEGER END, order_gen_type  = ''Edited'', updated_by = $6, updated_at = CURRENT_TIMESTAMP
                                            WHERE oor.order_gen_type in (''Recommended'',''Scenario'',''Edited'',''edited'') AND
                                            oor.article = $2
                                            AND oor.loc_code = $3
                                            AND oor.size = $4
                                            AND %I::text = $5::text
                                            AND ($7::varchar[] IS NULL OR array_length($7::varchar[], 1) IS NULL OR oor.loc_code = ANY($7::varchar[]))', timeperiod_column);
                                        
                                        EXECUTE query_text
                                        USING NULLIF(l2_record.ratio, ''), l0_record.p_article, l1_record.p_loc_code, l2_record.p_name, fiscal_period.fiscal_timeperiod_id, user_id_int, selected_linked_store_codes;

                                        RAISE NOTICE 'Successfully updated order quantities for article % in time period % using ratio %', 
                                                    l0_record.p_article, fiscal_period.fiscal_timeperiod_id, l2_record.ratio;
                                    ELSIF l2_record.target_quantity IS NOT NULL AND l2_record.target_quantity != '' THEN
                                        -- Calculate the sum of all roq_constrained values for this article with time period
                                        query_text := format('
                                            SELECT SUM(COALESCE(roq_constrained, 0))::FLOAT 
                                            FROM inventory_smart.oms_orders_recommended
                                            WHERE order_gen_type in (''Recommended'',''Scenario'',''Edited'',''edited'') AND
                                            article = $1
                                            AND loc_code = $2
                                            AND size = $3
                                            AND %I::text = $4::text
                                            AND ($5::varchar[] IS NULL OR array_length($5::varchar[], 1) IS NULL OR loc_code = ANY($5::varchar[]))', timeperiod_column);
                                            
                                        EXECUTE query_text INTO total_roq_constrained
                                        USING l0_record.p_article, l1_record.p_loc_code, l2_record.p_name, fiscal_period.fiscal_timeperiod_id, selected_linked_store_codes;

                                        -- Count how many records we have
                                        query_text := format('
                                            SELECT COUNT(*) 
                                            FROM inventory_smart.oms_orders_recommended
                                            WHERE order_gen_type in (''Recommended'',''Scenario'',''Edited'',''edited'') AND
                                            article = $1
                                            AND loc_code = $2
                                            AND size = $3
                                            AND %I::text = $4::text
                                            AND ($5::varchar[] IS NULL OR array_length($5::varchar[], 1) IS NULL OR loc_code = ANY($5::varchar[]))', timeperiod_column);
                                            
                                        EXECUTE query_text INTO record_count
                                        USING l0_record.p_article, l1_record.p_loc_code, l2_record.p_name, fiscal_period.fiscal_timeperiod_id, selected_linked_store_codes;

                                        -- Check if there are any orders for this combination
                                        IF record_count = 0 THEN
                                            RAISE NOTICE 'No orders found for article % in time period % (column: %) at location %', 
                                                        l0_record.p_article, fiscal_period.fiscal_timeperiod_id, timeperiod_column, l1_record.p_loc_code;
                                            RETURN;
                                        END IF;

                                        -- If total roq_constrained is zero, handle with equal split
                                        IF total_roq_constrained IS NULL OR total_roq_constrained = 0 THEN
                                            RAISE NOTICE 'Total roq_constrained is zero for article % in time period % at location %. Using equal split.', 
                                                        l0_record.p_article, fiscal_period.fiscal_timeperiod_id, l1_record.p_loc_code;
                                            
                                            -- Calculate equal split quantity
                                            equal_split_quantity := CEIL(NULLIF(l2_record.target_quantity, '')::INTEGER / record_count::INTEGER)::INTEGER;
                                            
                                            -- Update with equal split
                                            query_text := format('
                                                UPDATE inventory_smart.oms_orders_recommended oor 
                                                SET order_quantity = $1, 
                                                order_quantity_eaches = CASE WHEN oor.pack_id IS NOT NULL THEN oor.pack_config*$1 ELSE $1 END, updated_by = $6, updated_at = CURRENT_TIMESTAMP
                                                WHERE oor.order_gen_type in (''Recommended'',''Scenario'',''Edited'',''edited'') AND
                                                oor.article = $2
                                                AND oor.loc_code = $3
                                                AND oor.size = $4
                                                AND %I::text = $5::text
                                                AND ($7::varchar[] IS NULL OR array_length($7::varchar[], 1) IS NULL OR oor.loc_code = ANY($7::varchar[]))', timeperiod_column);
                                                
                                            EXECUTE query_text
                                            USING equal_split_quantity, l0_record.p_article, l1_record.p_loc_code, l2_record.p_name, fiscal_period.fiscal_timeperiod_id, user_id_int, selected_linked_store_codes;
                                        ELSE
                                            -- Regular update: Update order_quantity based on proportion of roq_constrained
                                            quantity_ratio := NULLIF(l2_record.target_quantity, '')::FLOAT / total_roq_constrained::FLOAT;
                                            query_text := format('
                                                UPDATE inventory_smart.oms_orders_recommended oor 
                                                SET order_quantity = CASE 
                                                    WHEN COALESCE(oor.roq_constrained, 0) = 0 THEN 0
                                                    ELSE CEIL(COALESCE(oor.roq_constrained, 0) * $1)::INTEGER
                                                END, updated_by = $6, updated_at = CURRENT_TIMESTAMP, order_gen_type  = ''Edited''
                                                WHERE 
                                                    oor.order_gen_type in (''Recommended'',''Scenario'',''Edited'',''edited'') AND
                                                    oor.article = $2
                                                    AND oor.loc_code = $3
                                                    AND oor.size = $4
                                                    AND %I::text = $5::text
                                                    AND ($7::varchar[] IS NULL OR array_length($7::varchar[], 1) IS NULL OR oor.loc_code = ANY($7::varchar[]))', timeperiod_column);
                                                    
                                            EXECUTE query_text
                                            USING quantity_ratio, l0_record.p_article, l1_record.p_loc_code, l2_record.p_name, fiscal_period.fiscal_timeperiod_id, user_id_int, selected_linked_store_codes;
                                        END IF;

                                        -- Update order_quantity_eaches based on updated order_quantity
                                        query_text := format('
                                            UPDATE inventory_smart.oms_orders_recommended oor 
                                            SET order_quantity_eaches = CASE WHEN oor.pack_id IS NOT NULL THEN oor.pack_config*oor.order_quantity ELSE oor.order_quantity END, updated_by = $5, updated_at = CURRENT_TIMESTAMP,
                                                order_gen_type = ''Edited''
                                            WHERE 
                                                oor.order_gen_type in (''Recommended'',''Scenario'',''Edited'',''edited'') AND
                                                oor.article = $1
                                                AND oor.loc_code = $2
                                                AND oor.size = $3
                                                AND %I::text = $4::text
                                                AND ($6::varchar[] IS NULL OR array_length($6::varchar[], 1) IS NULL OR oor.loc_code = ANY($6::varchar[]))', timeperiod_column);
                                                
                                        EXECUTE query_text
                                        USING l0_record.p_article, l1_record.p_loc_code, l2_record.p_name, fiscal_period.fiscal_timeperiod_id, user_id_int, selected_linked_store_codes;

                                        RAISE NOTICE 'Successfully updated order quantities for article % in time period % (column: %) at location %', 
                                                    l0_record.p_article, fiscal_period.fiscal_timeperiod_id, timeperiod_column, l1_record.p_loc_code;
                                    END IF;
                                ELSIF l2_record.ratio IS NOT NULL AND l2_record.ratio != '' THEN
                                    -- Count how many records we have to make sure they exist
                                        query_text := format('
                                            SELECT COUNT(*) 
                                            FROM inventory_smart.oms_orders_recommended
                                            WHERE order_gen_type in (''Recommended'',''Scenario'',''Edited'',''edited'') AND
                                            article = $1
                                            AND loc_code = $2
                                            AND size = $3
                                            AND %I::text = $4::text
                                            AND ($5::varchar[] IS NULL OR array_length($5::varchar[], 1) IS NULL OR loc_code = ANY($5::varchar[]))', timeperiod_column);
                                            
                                        EXECUTE query_text INTO record_count
                                        USING l0_record.p_article, l1_record.p_loc_code, l2_record.p_name, fiscal_period.fiscal_timeperiod_id, selected_linked_store_codes;

                                        -- Check if there are any orders for this combination
                                        IF record_count = 0 THEN
                                            RAISE NOTICE 'No orders found for article % in time period % (column: %)', 
                                                        l0_record.p_article, fiscal_period.fiscal_timeperiod_id, timeperiod_column;
                                            RETURN;
                                        END IF;

                                        -- Update order_quantity directly using the provided ratio
                                        query_text := format('
                                            UPDATE inventory_smart.oms_orders_recommended oor 
                                            SET order_quantity = CEIL(COALESCE(oor.roq_constrained, 0) * $1::FLOAT)::INTEGER,
                                            order_quantity_eaches = CASE WHEN oor.pack_id IS NOT NULL THEN oor.pack_config*CEIL(COALESCE(oor.roq_constrained, 0) * $1::FLOAT)::INTEGER ELSE CEIL(COALESCE(oor.roq_constrained, 0) * $1::FLOAT)::INTEGER END, order_gen_type  = ''Edited'', updated_by = $6, updated_at = CURRENT_TIMESTAMP
                                            WHERE oor.order_gen_type in (''Recommended'',''Scenario'',''Edited'',''edited'') AND
                                            oor.article = $2
                                            AND oor.loc_code = $3
                                            AND oor.size = $4
                                            AND %I::text = $5::text
                                            AND ($7::varchar[] IS NULL OR array_length($7::varchar[], 1) IS NULL OR oor.loc_code = ANY($7::varchar[]))', timeperiod_column);
                                            
                                        EXECUTE query_text
                                        USING NULLIF(l2_record.ratio, ''), l0_record.p_article, l1_record.p_loc_code, l2_record.p_name, fiscal_period.fiscal_timeperiod_id, user_id_int, selected_linked_store_codes;

                                        RAISE NOTICE 'Successfully updated order quantities for article % in time period % using ratio %', 
                                                    l0_record.p_article, fiscal_period.fiscal_timeperiod_id, l2_record.ratio;
                                ELSIF l2_record.target_quantity IS NOT NULL AND l2_record.target_quantity != '' THEN
                                    -- Calculate the sum of all roq_constrained values for this article with time period
                                        query_text := format('
                                            SELECT SUM(COALESCE(roq_constrained, 0))::FLOAT 
                                            FROM inventory_smart.oms_orders_recommended
                                            WHERE order_gen_type in (''Recommended'',''Scenario'',''Edited'',''edited'') AND
                                            article = $1
                                            AND loc_code = $2
                                            AND size = $3
                                            AND %I::text = $4::text
                                            AND ($5::varchar[] IS NULL OR array_length($5::varchar[], 1) IS NULL OR loc_code = ANY($5::varchar[]))', timeperiod_column);
                                            
                                        EXECUTE query_text INTO total_roq_constrained
                                        USING l0_record.p_article, l1_record.p_loc_code, l2_record.p_name, fiscal_period.fiscal_timeperiod_id, selected_linked_store_codes;

                                        -- Count how many records we have
                                        query_text := format('
                                            SELECT COUNT(*) 
                                            FROM inventory_smart.oms_orders_recommended
                                            WHERE order_gen_type in (''Recommended'',''Scenario'',''Edited'',''edited'') AND
                                            article = $1
                                            AND loc_code = $2
                                            AND size = $3
                                            AND %I::text = $4::text
                                            AND ($5::varchar[] IS NULL OR array_length($5::varchar[], 1) IS NULL OR loc_code = ANY($5::varchar[]))', timeperiod_column);
                                            
                                        EXECUTE query_text INTO record_count
                                        USING l0_record.p_article, l1_record.p_loc_code, l2_record.p_name, fiscal_period.fiscal_timeperiod_id, selected_linked_store_codes;

                                        -- Check if there are any orders for this combination
                                        IF record_count = 0 THEN
                                            RAISE NOTICE 'No orders found for article % in time period % (column: %) at location %', 
                                                        l0_record.p_article, fiscal_period.fiscal_timeperiod_id, timeperiod_column, l1_record.p_loc_code;
                                            RETURN;
                                        END IF;

                                        -- If total roq_constrained is zero, handle with equal split
                                        IF total_roq_constrained IS NULL OR total_roq_constrained = 0 THEN
                                            RAISE NOTICE 'Total roq_constrained is zero for article % in time period % at location %. Using equal split.', 
                                                        l0_record.p_article, fiscal_period.fiscal_timeperiod_id, l1_record.p_loc_code;
                                            
                                            -- Calculate equal split quantity
                                            equal_split_quantity := CEIL(NULLIF(l2_record.target_quantity, '')::INTEGER / record_count::INTEGER)::INTEGER;
                                            
                                            -- Update with equal split
                                            query_text := format('
                                                UPDATE inventory_smart.oms_orders_recommended oor 
                                                SET order_quantity = $1, 
                                                order_quantity_eaches = CASE WHEN oor.pack_id IS NOT NULL THEN oor.pack_config*$1 ELSE $1 END, updated_by = $6, updated_at = CURRENT_TIMESTAMP
                                                WHERE oor.order_gen_type in (''Recommended'',''Scenario'',''Edited'',''edited'') AND
                                                oor.article = $2
                                                AND oor.loc_code = $3
                                                AND oor.size = $4
                                                AND %I::text = $5::text
                                                AND ($7::varchar[] IS NULL OR array_length($7::varchar[], 1) IS NULL OR oor.loc_code = ANY($7::varchar[]))', timeperiod_column);
                                                
                                            EXECUTE query_text
                                            USING equal_split_quantity, l0_record.p_article, l1_record.p_loc_code, l2_record.p_name, fiscal_period.fiscal_timeperiod_id, user_id_int, selected_linked_store_codes;
                                        ELSE
                                            -- Regular update: Update order_quantity based on proportion of roq_constrained
                                            quantity_ratio := NULLIF(l2_record.target_quantity, '')::FLOAT / total_roq_constrained::FLOAT;
                                            query_text := format('
                                                UPDATE inventory_smart.oms_orders_recommended oor 
                                                SET order_quantity = CASE 
                                                    WHEN COALESCE(oor.roq_constrained, 0) = 0 THEN 0
                                                    ELSE CEIL(COALESCE(oor.roq_constrained, 0) * $1)::INTEGER
                                                END,
                                                order_quantity_eaches = CASE 
                                                    WHEN COALESCE(oor.roq_constrained, 0) = 0 THEN 0
                                                    ELSE CEIL(COALESCE(oor.roq_constrained, 0) * $1)::INTEGER
                                                END, order_gen_type  = ''Edited'', updated_by = $6, updated_at = CURRENT_TIMESTAMP
                                                WHERE oor.order_gen_type in (''Recommended'',''Scenario'',''Edited'',''edited'') AND
                                                    oor.article = $2
                                                    AND oor.loc_code = $3
                                                    AND oor.size = $4
                                                    AND %I::text = $5::text
                                                    AND ($7::varchar[] IS NULL OR array_length($7::varchar[], 1) IS NULL OR oor.loc_code = ANY($7::varchar[]))', timeperiod_column);
                                                    
                                            EXECUTE query_text
                                            USING quantity_ratio, l0_record.p_article, l1_record.p_loc_code, l2_record.p_name, fiscal_period.fiscal_timeperiod_id, user_id_int, selected_linked_store_codes;
                                        END IF;
                                        RAISE NOTICE 'Successfully updated order quantities for article % in time period % (column: %) at location %', 
                                                    l0_record.p_article, fiscal_period.fiscal_timeperiod_id, timeperiod_column, l1_record.p_loc_code;
                                END IF;
                            END LOOP; -- End of l2 loop
                        END IF; -- End of l2 check
                    END LOOP; -- End of l1 loop
                END IF; -- End of l1 check
            END LOOP; -- End of style loop
        END LOOP; -- End of fiscal period loop
        
        -- Commit the transaction if everything succeeds
        RAISE NOTICE 'All updates completed successfully';
    EXCEPTION WHEN OTHERS THEN
        -- Roll back on any error
        RAISE NOTICE 'Error occurred, rolling back: %', SQLERRM;
        RAISE;
    END;
    
END;
$function$
;
