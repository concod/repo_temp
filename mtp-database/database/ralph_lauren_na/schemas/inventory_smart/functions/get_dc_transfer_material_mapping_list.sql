--liquibase formatted sql
--changeset surya.kuruvadi:get_dc_transfer_material_mapping_list_v2 runOnChange:true stripComments:false splitStatements:false context:MTP-126522-2 labels:MTP-126522
--comment: MTP-126522 created SP for fetching material mapped to created DC to DC rules, Joined on paf.article instead of paf.product_code, included distinct level search , updated order by logic
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.get_dc_transfer_material_mapping_list(input refcursor, p_product_attribute_query jsonb, p_store_attribute_query jsonb, p_application_code integer, p_client_columns text, p_table_query jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.get_dc_transfer_material_mapping_list(input refcursor, p_product_attribute_query jsonb, p_store_attribute_query jsonb, p_application_code integer, p_client_columns text, p_table_query jsonb)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
/*
 Material to DC Transfer Rule Mapping List
 
 Calling example:
 SELECT * FROM inventory_smart.get_dc_transfer_material_mapping_list(
    'my_cur',
    '{"l0_name": [{"type": "list", "operator": "in", "values": ["MENS"]}], 
      "brand": [{"type": "list", "operator": "in", "values": ["POLO RALPH LAUREN"]}]}',
    '{"channel": [{"type": "list", "operator": "in", "values": ["FULL PRICE"]}]}',
    1,
    '',
    '{"limit": {"page": 1, "limit": 10}, "sort": [{"column": "brand", "order": "ASC"}]}'
 );
 FETCH ALL IN "my_cur";
*/
DECLARE
    v_query_combine TEXT := '';
    v_query_table_filters TEXT := '';
    v_product_join TEXT := '';
    v_product_where TEXT := '';
    v_store_where TEXT := '';
    v_where_clause TEXT := '';
    v_has_where BOOLEAN := FALSE;
    
    -- Extract channel using helper function
    v_channel TEXT[] := inventory_smart.get_channel_from_input_new(p_store_attribute_query);
    v_l0_name TEXT[] := inventory_smart.get_l0_name_from_input(p_product_attribute_query);
    
    -- Variables for dynamic filter building
    v_key TEXT;
    v_filter_array JSONB;
    v_values TEXT[];
BEGIN
    -- ==========================================
    -- 1. BUILD STORE FILTERS (CHANNEL)
    -- ==========================================
    IF array_length(v_channel, 1) > 0 THEN
        v_store_where := format('m.channel = ANY(%L)', v_channel);
        v_has_where := TRUE;
    END IF;
    
    -- ==========================================
    -- 2. BUILD PRODUCT FILTERS DYNAMICALLY
    -- ==========================================
    IF p_product_attribute_query IS NOT NULL 
       AND p_product_attribute_query <> '{}'::jsonb THEN
        
        -- Add JOIN with product_attributes_filter
        v_product_join := ' JOIN global.product_attributes_filter paf ON m.article = paf.article ';
        
        -- Loop through all product attribute keys dynamically
        FOR v_key IN SELECT jsonb_object_keys(p_product_attribute_query)
        LOOP
            v_filter_array := p_product_attribute_query->v_key;
            
            -- Check if filter array has elements
            IF jsonb_array_length(v_filter_array) > 0 THEN
                -- Extract values from first filter object
                v_values := ARRAY(
                    SELECT jsonb_array_elements_text(v_filter_array->0->'values')
                );
                
                -- Build WHERE clause for this attribute
                IF array_length(v_values, 1) > 0 THEN
                    IF v_product_where <> '' THEN
                        v_product_where := v_product_where || ' AND ';
                    END IF;
                    
                    v_product_where := v_product_where || format(
                        'paf.%I = ANY(%L)',
                        v_key,
                        v_values
                    );
                    v_has_where := TRUE;
                END IF;
            END IF;
        END LOOP;
    END IF;
    
    -- ==========================================
    -- 3. COMBINE WHERE CLAUSES
    -- ==========================================
    IF v_has_where THEN
        v_where_clause := ' WHERE ';
        
        IF v_store_where <> '' THEN
            v_where_clause := v_where_clause || v_store_where;
        END IF;
        
        IF v_product_where <> '' THEN
            IF v_store_where <> '' THEN
                v_where_clause := v_where_clause || ' AND ';
            END IF;
            v_where_clause := v_where_clause || v_product_where;
        END IF;
    END IF;
    
    -- ==========================================
    -- 4. BUILD TABLE FILTERS (PAGINATION, SORT, SEARCH)
    -- ==========================================
    v_query_table_filters := global.form_table_query(p_table_query);
    
    -- ==========================================
    -- 5. BUILD FINAL QUERY
    -- ==========================================
    v_query_combine := format('
        WITH ph_data AS (
            SELECT DISTINCT ON (m.article, m.channel)
                m.article,
                m.channel,
                m.product_description,
                m.style_color_id,
                m.l0_name,
                m.l1_name,
				m.l2_name,
                m.l3_name,
                m.l4_name,
                m.brand,
                m.aur,
                m.gm_perc
            FROM 
                inventory_smart.dc_to_dc_material_master m
            %s
            %s
        ),
        mapped_data AS (
            SELECT 
                ph.*,
                COALESCE(r.rule_name, ''-'') as transfer_rule,
                r.rule_id,
                COALESCE(map.recommend_dc_transfer, false) as recommend_dc_transfer
            FROM ph_data ph
            LEFT JOIN inventory_smart.dc_transfer_material_rule_mapping map 
                ON ph.article = map.article
            LEFT JOIN inventory_smart.dc_transfer_rule r 
                ON map.rule_id = r.rule_id 
                AND ph.channel = r.channel
            ORDER BY map.updated_at DESC NULLS LAST
        )
        SELECT 
            *,
            COUNT(*) OVER() as total_count
        FROM mapped_data
    ',
    v_product_join,
    v_where_clause
    );
    
    -- Log the generated query for debugging
    RAISE NOTICE 'Generated Query: %', v_query_combine || v_query_table_filters;
    
    -- ==========================================
    -- 6. EXECUTE QUERY WITH TABLE FILTERS
    -- ==========================================
    OPEN input FOR EXECUTE v_query_combine || v_query_table_filters;
    
    RETURN v_query_combine;
END;
$function$
;