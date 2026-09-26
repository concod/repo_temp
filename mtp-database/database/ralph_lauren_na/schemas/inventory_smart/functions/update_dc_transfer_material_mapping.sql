--liquibase formatted sql
--changeset surya.kuruvadi:update_dc_transfer_material_mapping_v1 runOnChange:true stripComments:false splitStatements:false context:MTP-126522-2 labels:MTP-126522
--comment: Set-all function for mapping/unmapping materials to DC transfer rules, updated toggle button logic , updated checkAll logic
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.update_dc_transfer_material_mapping(refcursor, jsonb, jsonb, integer, jsonb, integer, text);
CREATE OR REPLACE FUNCTION inventory_smart.update_dc_transfer_material_mapping(
    result_cursor refcursor,
    p_product_attribute_query jsonb,
    p_store_attribute_query jsonb,
    p_rule_id integer,
    p_table_query jsonb,
    p_user_id integer,
    p_operation_type text
)
RETURNS text
LANGUAGE plpgsql
AS $function$
DECLARE
    v_article_count integer := 0;
    v_values_json jsonb;
    v_articles_array text[];
    v_article text;
    v_check_all boolean := false;
    
    -- Filter building variables (aligned with get_dc_transfer_material_mapping_list)
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
        
        v_executed_query := format('Articles provided: %s', array_to_string(v_articles_array, ', '));
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
                -- Build count query aligned with get_dc_transfer_material_mapping_list
                v_filter_query := format('
                    SELECT COUNT(DISTINCT m.article)
                    FROM inventory_smart.dc_to_dc_material_master m
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
                -- Get all articles matching the filters
                v_filter_query := format('
                    SELECT DISTINCT m.article
                    FROM inventory_smart.dc_to_dc_material_master m
                    %s
                    %s
                ', 
                COALESCE(v_product_join, ''),
                COALESCE(v_where_clause, '')
                );
                
                -- Execute to get articles array
                EXECUTE format('SELECT ARRAY(%s)', v_filter_query) INTO v_articles_array;
                
                -- Build UPDATE/INSERT query samples for debugging
                IF p_rule_id IS NULL THEN
                    v_update_query := format('
UPDATE inventory_smart.dc_transfer_material_rule_mapping
SET rule_id = NULL, dc_target_wos = NULL, recommend_dc_transfer = FALSE, updated_at = NOW()
WHERE article = ''<article>'';

-- IF NOT FOUND:
INSERT INTO inventory_smart.dc_transfer_material_rule_mapping 
    (article, rule_id, dc_target_wos, recommend_dc_transfer, created_at, updated_at)
VALUES (''<article>'', NULL, NULL, FALSE, NOW(), NOW());
                    ');
                ELSE
                    v_update_query := format('
UPDATE inventory_smart.dc_transfer_material_rule_mapping
SET rule_id = %s, dc_target_wos = NULL, updated_at = NOW()
WHERE article = ''<article>'';

-- IF NOT FOUND:
INSERT INTO inventory_smart.dc_transfer_material_rule_mapping 
    (article, rule_id, dc_target_wos, recommend_dc_transfer, created_at, updated_at)
VALUES (''<article>'', %s, NULL, TRUE, NOW(), NOW());
                    ', p_rule_id, p_rule_id);
                END IF;
                
                v_executed_query := format(E'SELECT Query:\n%s\n\nUPDATE/INSERT Query:\n%s\n\nArticles found: %s', 
                    v_filter_query, 
                    v_update_query,
                    COALESCE(array_length(v_articles_array, 1), 0)
                );
            ELSE
                -- Build UPDATE query for selected articles
                IF p_rule_id IS NULL THEN
                    v_update_query := format('UPDATE SET rule_id = NULL for articles: %s', array_to_string(v_articles_array, ', '));
                ELSE
                    v_update_query := format('UPDATE SET rule_id = %s for articles: %s', p_rule_id, array_to_string(v_articles_array, ', '));
                END IF;
                
                v_executed_query := v_update_query;
            END IF;
            
            -- Execute actual updates (common for both modes)
            IF v_articles_array IS NOT NULL AND array_length(v_articles_array, 1) > 0 THEN
                FOR v_article IN SELECT DISTINCT unnest(v_articles_array) LOOP
                    IF p_rule_id IS NULL THEN
                        -- Unassign rule
                        UPDATE inventory_smart.dc_transfer_material_rule_mapping
                        SET rule_id = NULL, 
                            dc_target_wos = NULL, 
                            recommend_dc_transfer = FALSE, 
                            updated_at = NOW()
                        WHERE article = v_article;
                        
                        IF NOT FOUND THEN
                            INSERT INTO inventory_smart.dc_transfer_material_rule_mapping 
                                (article, rule_id, dc_target_wos, recommend_dc_transfer, created_at, updated_at)
                            VALUES (v_article, NULL, NULL, FALSE, NOW(), NOW());
                        END IF;
                    ELSE
                        -- Assign rule
                        UPDATE inventory_smart.dc_transfer_material_rule_mapping
                        SET rule_id = p_rule_id, 
                            dc_target_wos = NULL, 
                            updated_at = NOW()
                        WHERE article = v_article;
                        
                        IF NOT FOUND THEN
                            INSERT INTO inventory_smart.dc_transfer_material_rule_mapping 
                                (article, rule_id, dc_target_wos, recommend_dc_transfer, created_at, updated_at)
                            VALUES (v_article, p_rule_id, NULL, TRUE, NOW(), NOW());
                        END IF;
                    END IF;
                    v_article_count := v_article_count + 1;
                END LOOP;
            END IF;

            -- Return update result
            OPEN result_cursor FOR
            SELECT json_build_object(
                'count', json_build_object(
                    'record_count', v_article_count,
                    'sku_count', v_article_count
                ),
                'message', format('Successfully updated %s material(s)', v_article_count)
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