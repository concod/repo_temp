--liquibase formatted sql
--changeset liquibase:update_store_transfer_material_mapping_v5 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for update_store_transfer_material_mapping_v5
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.update_store_transfer_material_mapping(refcursor, jsonb, jsonb, int4, jsonb, int4, text);
CREATE OR REPLACE FUNCTION inventory_smart.update_store_transfer_material_mapping(result_cursor refcursor, p_product_attribute_query jsonb, p_store_attribute_query jsonb, p_rule_id integer, p_table_query jsonb, p_user_id integer, p_operation_type text)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_article_count integer := 0;
    v_values_json jsonb;
    v_articles_array text[];
    v_channels_array text[];
    v_article text;
    v_channel_value text;
    v_check_all boolean := false;
    
    -- Default values from store_to_store_default_param
    v_default_transfer_strategy text := 'min_demand';
    v_default_dc_inventory_threshold integer := 0;
    v_default_source_wos_threshold numeric := 4;
    v_default_dest_wos_threshold numeric := 4;
    v_default_recommend_store_transfer boolean := TRUE;
    
    -- Filter building variables (aligned with get_store_transfer_material_mapping_list)
    v_product_join text := '';
    v_product_where text := '';
    v_store_where text := '';
    v_where_clause text := '';
    v_has_where boolean := false;
    
    -- Extract channel and l0_name using helper functions
    v_channel text[] := inventory_smart.get_channel_from_input_new(p_store_attribute_query);
    v_l0_name text[] := inventory_smart.get_l0_name_from_input(p_product_attribute_query);
    
    -- Dynamic filter building
    v_key text;
    v_filter_array jsonb;
    v_values text[];
    
    -- Query variables
    v_filter_query text;
    v_executed_query text := '';
    v_update_query text := '';
BEGIN
    -- ==========================================
    -- 0. FETCH DEFAULT VALUES FROM store_to_store_default_param
    -- ==========================================
    SELECT COALESCE(value::text, 'min_demand') INTO v_default_transfer_strategy
    FROM inventory_smart.store_to_store_default_param 
    WHERE attribute = 'transfer_strategy';
    
    SELECT COALESCE(value::integer, 0) INTO v_default_dc_inventory_threshold
    FROM inventory_smart.store_to_store_default_param 
    WHERE attribute = 'dc_inventory_threshold';
    
    SELECT COALESCE(value::numeric, 4) INTO v_default_source_wos_threshold
    FROM inventory_smart.store_to_store_default_param 
    WHERE attribute = 'source_wos_threshold_multiplier';
    
    SELECT COALESCE(value::numeric, 4) INTO v_default_dest_wos_threshold
    FROM inventory_smart.store_to_store_default_param 
    WHERE attribute = 'dest_wos_threshold_multiplier';
    
    SELECT COALESCE(value::boolean, TRUE) INTO v_default_recommend_store_transfer
    FROM inventory_smart.store_to_store_default_param 
    WHERE attribute = 'recommend_store_transfer';
    
    -- Extract values object from table_query
    v_values_json := p_table_query->'values';
    
    -- Check if checkAll flag is set
    IF v_values_json ? 'checkAll' THEN
        v_check_all := (v_values_json->>'checkAll')::boolean;
    END IF;
    
    -- ==========================================
    -- VALIDATION BASED ON MODE
    -- ==========================================
    IF NOT v_check_all THEN
        -- Normal mode: articles array is required
        IF v_values_json IS NULL OR NOT (v_values_json ? 'articles') THEN
            RAISE EXCEPTION 'values.articles is required when checkAll is false';
        END IF;
        
        -- Extract articles array from JSON
        SELECT ARRAY(
            SELECT jsonb_array_elements_text(v_values_json->'articles')
        ) INTO v_articles_array;
        
        -- Validate that articles array is not empty
        IF array_length(v_articles_array, 1) IS NULL OR array_length(v_articles_array, 1) = 0 THEN
            RAISE EXCEPTION 'values.articles cannot be empty when checkAll is false';
        END IF;
        
        -- Extract channel value for non-checkAll mode
        IF array_length(v_channel, 1) > 0 THEN
            v_channel_value := v_channel[1];
        END IF;
        
        v_executed_query := format('Articles provided: %s, Channel: %s', array_to_string(v_articles_array, ', '), COALESCE(v_channel_value, 'NULL'));
    ELSE
        -- ==========================================
        -- BUILD FILTERS (ALIGNED WITH EXISTING MODEL)
        -- ==========================================
        
        -- 1. BUILD STORE FILTERS (CHANNEL)
        IF array_length(v_channel, 1) > 0 THEN
            v_store_where := format('m.channel = ANY(%L)', v_channel);
            v_has_where := TRUE;
        END IF;
        
        -- 2. BUILD PRODUCT FILTERS DYNAMICALLY
        -- Check if product filters exist
        IF p_product_attribute_query IS NOT NULL AND jsonb_typeof(p_product_attribute_query) = 'object' THEN
            -- Need to join with product_attributes_filter table
            v_product_join := 'LEFT JOIN global.product_attributes_filter paf ON m.article = paf.article';
            
            -- Iterate through all keys in product_attribute_query
            FOR v_key IN SELECT * FROM jsonb_object_keys(p_product_attribute_query) LOOP
                -- Get the filter array for this key
                v_filter_array := p_product_attribute_query->v_key;
                
                -- Extract values from the filter array
                -- Assuming format: [{"type": "list", "operator": "in", "values": ["val1", "val2"]}]
                SELECT ARRAY(
                    SELECT jsonb_array_elements_text(
                        (jsonb_array_elements(v_filter_array)->>'values')::jsonb
                    )
                ) INTO v_values;
                
                -- Build the WHERE condition for this key
                IF array_length(v_values, 1) > 0 THEN
                    v_product_where := v_product_where || format(' AND paf.%I = ANY(%L)', v_key, v_values);
                END IF;
            END LOOP;
        END IF;
        
        -- 3. COMBINE WHERE CLAUSES
        IF v_has_where THEN
            v_where_clause := ' WHERE ' || v_store_where;
            IF v_product_where <> '' THEN
                v_where_clause := v_where_clause || v_product_where;
            END IF;
        ELSIF v_product_where <> '' THEN
            v_where_clause := ' WHERE 1=1' || v_product_where;
        END IF;
    END IF;

    BEGIN
        -- ==========================================
        -- EXECUTE BASED ON OPERATION TYPE
        -- ==========================================
        IF p_operation_type = 'record_count' THEN
            -- Count operation
            IF v_check_all THEN
                -- Build count query aligned with get_store_transfer_material_mapping_list
                v_filter_query := format('
                    SELECT COUNT(DISTINCT m.article)
                    FROM inventory_smart.store_to_store_material_master m
                    %s
                    %s
                ', 
                COALESCE(v_product_join, ''),
                COALESCE(v_where_clause, '')
                );
                
                v_executed_query := v_filter_query;
                EXECUTE v_filter_query INTO v_article_count;
            ELSE
                -- Count distinct articles in provided array
                v_article_count := array_length(ARRAY(SELECT DISTINCT unnest(v_articles_array)), 1);
            END IF;

            -- Return count result
            OPEN result_cursor FOR
            SELECT json_build_object(
                'count', json_build_object(
                    'record_count', v_article_count,
                    'sku_count', v_article_count
                )
            ) as result;
            
        ELSIF p_operation_type = 'insert_update' THEN
            -- Update operation
            v_article_count := 0;
            
            IF v_check_all THEN
                -- Get all articles and channels matching the filters
                v_filter_query := format('
                    SELECT DISTINCT m.article, m.channel
                    FROM inventory_smart.store_to_store_material_master m
                    %s
                    %s
                ', 
                COALESCE(v_product_join, ''),
                COALESCE(v_where_clause, '')
                );
                
                -- Execute to get articles and channels arrays
                EXECUTE format('SELECT ARRAY(SELECT t.article FROM (%s) t)', v_filter_query) INTO v_articles_array;
                EXECUTE format('SELECT ARRAY(SELECT t.channel FROM (%s) t)', v_filter_query) INTO v_channels_array;
                
                -- Build UPDATE/INSERT query samples for debugging
                IF p_rule_id IS NULL THEN
                    v_update_query := format('
UPDATE inventory_smart.store_transfer_material_rule_mapping
SET rule_id = NULL, transfer_strategy = NULL, dc_inventory_threshold = NULL, 
    source_wos_threshold = NULL, dest_wos_threshold = NULL, recommend_store_transfer = FALSE, updated_at = NOW()
WHERE article = ''<article>'' AND channel = ''<channel>'';

-- IF NOT FOUND:
INSERT INTO inventory_smart.store_transfer_material_rule_mapping 
    (article, channel, rule_id, transfer_strategy, dc_inventory_threshold, source_wos_threshold, 
     dest_wos_threshold, recommend_store_transfer, created_at, updated_at)
VALUES (''<article>'', ''<channel>'', NULL, NULL, NULL, NULL, NULL, FALSE, NOW(), NOW());
                    ');
                ELSE
                    -- Get transfer strategy from values if provided
                    DECLARE
                        v_transfer_strategy text := COALESCE(v_values_json->>'transfer_strategy', v_default_transfer_strategy);
                    BEGIN
                        v_update_query := format('
UPDATE inventory_smart.store_transfer_material_rule_mapping
SET rule_id = %s, transfer_strategy = %L, dc_inventory_threshold = %s, 
    source_wos_threshold = %s, dest_wos_threshold = %s, recommend_store_transfer = %s, updated_at = NOW()
WHERE article = ''<article>'' AND channel = ''<channel>'';

-- IF NOT FOUND:
INSERT INTO inventory_smart.store_transfer_material_rule_mapping 
    (article, channel, rule_id, transfer_strategy, dc_inventory_threshold, source_wos_threshold, 
     dest_wos_threshold, recommend_store_transfer, created_at, updated_at)
VALUES (''<article>'', ''<channel>'', %s, %L, %s, %s, %s, %s, NOW(), NOW());
                        ', p_rule_id, v_transfer_strategy, v_default_dc_inventory_threshold,
                           v_default_source_wos_threshold, v_default_dest_wos_threshold,
                           v_default_recommend_store_transfer, p_rule_id, v_transfer_strategy,
                           v_default_dc_inventory_threshold, v_default_source_wos_threshold,
                           v_default_dest_wos_threshold, v_default_recommend_store_transfer);
                    END;
                END IF;
                
                v_executed_query := format(E'SELECT Query:\n%s\n\nUPDATE/INSERT Query:\n%s\n\nArticles found: %s', 
                    v_filter_query, 
                    v_update_query,
                    COALESCE(array_length(v_articles_array, 1), 0)
                );
            ELSE
                -- Build actual SQL query for selected articles (for debugging)
                IF p_rule_id IS NULL THEN
                    v_update_query := format(
                        'INSERT INTO inventory_smart.store_transfer_material_rule_mapping '
                        '(article, channel, rule_id, transfer_strategy, dc_inventory_threshold, source_wos_threshold, '
                        'dest_wos_threshold, recommend_store_transfer, created_at, updated_at) '
                        'VALUES (<article>, %L, NULL, NULL, NULL, NULL, NULL, FALSE, NOW(), NOW()) '
                        'ON CONFLICT (article) DO UPDATE SET channel = EXCLUDED.channel, rule_id = NULL, '
                        'transfer_strategy = NULL, dc_inventory_threshold = NULL, source_wos_threshold = NULL, '
                        'dest_wos_threshold = NULL, recommend_store_transfer = FALSE, updated_at = NOW(); '
                        '-- Articles: %s',
                        v_channel_value, array_to_string(v_articles_array, ', '));
                ELSE
                    DECLARE
                        v_transfer_strategy text := COALESCE(v_values_json->>'transfer_strategy', v_default_transfer_strategy);
                    BEGIN
                        v_update_query := format(
                            'INSERT INTO inventory_smart.store_transfer_material_rule_mapping '
                            '(article, channel, rule_id, transfer_strategy, dc_inventory_threshold, source_wos_threshold, '
                            'dest_wos_threshold, recommend_store_transfer, created_at, updated_at) '
                            'VALUES (<article>, %L, %s, %L, %s, %s, %s, %s, NOW(), NOW()) '
                            'ON CONFLICT (article) DO UPDATE SET channel = EXCLUDED.channel, rule_id = EXCLUDED.rule_id, '
                            'transfer_strategy = COALESCE(store_transfer_material_rule_mapping.transfer_strategy, EXCLUDED.transfer_strategy), '
                            'dc_inventory_threshold = COALESCE(store_transfer_material_rule_mapping.dc_inventory_threshold, EXCLUDED.dc_inventory_threshold), '
                            'source_wos_threshold = COALESCE(store_transfer_material_rule_mapping.source_wos_threshold, EXCLUDED.source_wos_threshold), '
                            'dest_wos_threshold = COALESCE(store_transfer_material_rule_mapping.dest_wos_threshold, EXCLUDED.dest_wos_threshold), '
                            'recommend_store_transfer = COALESCE(store_transfer_material_rule_mapping.recommend_store_transfer, EXCLUDED.recommend_store_transfer), '
                            'updated_at = NOW(); '
                            '-- Articles: %s',
                            v_channel_value, p_rule_id, v_transfer_strategy, v_default_dc_inventory_threshold,
                            v_default_source_wos_threshold, v_default_dest_wos_threshold,
                            v_default_recommend_store_transfer,
                            array_to_string(v_articles_array, ', '));
                    END;
                END IF;
                
                v_executed_query := v_update_query;
            END IF;
            
            -- Execute actual updates (common for both modes)
            IF v_articles_array IS NOT NULL AND array_length(v_articles_array, 1) > 0 THEN
                FOR i IN 1..array_length(v_articles_array, 1) LOOP
                    v_article := v_articles_array[i];
                    
                    -- Get channel for this article
                    IF v_check_all AND v_channels_array IS NOT NULL THEN
                        v_channel_value := v_channels_array[i];
                    END IF;
                    -- For non-checkAll mode, v_channel_value is already set above
                    
                    DECLARE
                        v_transfer_strategy text := COALESCE(v_values_json->>'transfer_strategy', v_default_transfer_strategy);
                    BEGIN
                        IF p_rule_id IS NULL THEN
                            -- Unassign rule
                            v_update_query := FORMAT('
                                INSERT INTO inventory_smart.store_transfer_material_rule_mapping 
                                    (article, channel, rule_id, transfer_strategy, dc_inventory_threshold, source_wos_threshold, 
                                     dest_wos_threshold, recommend_store_transfer, created_at, updated_at)
                                VALUES (%L, %L, NULL, NULL, NULL, NULL, NULL, FALSE, NOW(), NOW())
                                ON CONFLICT (article) DO UPDATE SET
                                    channel = EXCLUDED.channel,
                                    rule_id = NULL, 
                                    transfer_strategy = NULL,
                                    dc_inventory_threshold = NULL,
                                    source_wos_threshold = NULL,
                                    dest_wos_threshold = NULL,
                                    recommend_store_transfer = FALSE,
                                    updated_at = NOW()
                            ', v_article, v_channel_value);
                        ELSE
                            -- Assign rule with transfer strategy and default values
                            v_update_query := FORMAT('
                                INSERT INTO inventory_smart.store_transfer_material_rule_mapping 
                                    (article, channel, rule_id, transfer_strategy, dc_inventory_threshold, source_wos_threshold, 
                                     dest_wos_threshold, recommend_store_transfer, created_at, updated_at)
                                VALUES (%L, %L, %s, %L, %s, %s, %s, %L::boolean, NOW(), NOW())
                                ON CONFLICT (article) DO UPDATE SET
                                    channel = EXCLUDED.channel,
                                    rule_id = EXCLUDED.rule_id, 
                                    transfer_strategy = COALESCE(store_transfer_material_rule_mapping.transfer_strategy, EXCLUDED.transfer_strategy),
                                    dc_inventory_threshold = COALESCE(store_transfer_material_rule_mapping.dc_inventory_threshold, EXCLUDED.dc_inventory_threshold),
                                    source_wos_threshold = COALESCE(store_transfer_material_rule_mapping.source_wos_threshold, EXCLUDED.source_wos_threshold),
                                    dest_wos_threshold = COALESCE(store_transfer_material_rule_mapping.dest_wos_threshold, EXCLUDED.dest_wos_threshold),
                                    recommend_store_transfer = COALESCE(store_transfer_material_rule_mapping.recommend_store_transfer, EXCLUDED.recommend_store_transfer),
                                    updated_at = NOW()
                            ', v_article, v_channel_value, p_rule_id, v_transfer_strategy,
                               v_default_dc_inventory_threshold, v_default_source_wos_threshold,
                               v_default_dest_wos_threshold, v_default_recommend_store_transfer);
                        END IF;

                        RAISE NOTICE '%', v_update_query;
                        EXECUTE v_update_query;
                    END;
                    v_article_count := v_article_count + 1;
                END LOOP;
            END IF;

            v_executed_query := v_update_query;

            -- Return update result
            OPEN result_cursor FOR
            SELECT json_build_object(
                'count', json_build_object(
                    'record_count', v_article_count,
                    'sku_count', v_article_count
                ),
                'message', format('Successfully updated %s material(s)', v_article_count),
                'executed_query', v_executed_query
            ) as result;
            
        ELSE
            RAISE EXCEPTION 'Invalid operation_type: %. Must be "record_count" or "insert_update"', p_operation_type;
        END IF;

        RETURN v_executed_query;

    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Transaction failed: %', SQLERRM;
            RAISE EXCEPTION 'Failed to update material mappings. %', SQLERRM;
    END;
END;
$function$;