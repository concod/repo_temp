--liquibase formatted sql
--changeset priyansh.gautam@impactanalytics.co:get_lws_x_data1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:MTP-89055
--comment: initial changeset for get_lws_x_data
--rollback: SELECT 1

DROP FUNCTION IF EXISTS ada_configurator.get_lws_x_data(int4);

CREATE OR REPLACE FUNCTION ada_configurator.get_lws_x_data(p_lws_level_id integer)
 RETURNS TABLE(product_where_clause text, store_where_clause text, product_data jsonb, store_data jsonb)
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_grouping_id INTEGER;
    v_has_product_columns BOOLEAN;
    v_has_store_columns BOOLEAN;
    v_product_where_clause TEXT;
    v_store_where_clause TEXT;
    v_product_data JSONB;
    v_store_data JSONB;
    v_product_columns TEXT[];
    v_store_columns TEXT[];
    v_product_display_names TEXT[];
    v_store_display_names TEXT[];
    v_product_query TEXT;
    v_store_query TEXT;
    v_product_info_query TEXT;
    v_store_info_query TEXT;
BEGIN
    -- Get the lws_mapping_id and grouping_id
    SELECT twl.grouping_id INTO v_grouping_id
    FROM ada_configurator.lws_mapping tlm
    JOIN ada_configurator.workstream_level twl ON twl.lws_mapping_id = tlm.lws_mapping_mapping_id
    WHERE tlm.lws_level_id = p_lws_level_id
    LIMIT 1;
    
    -- Check if we have product columns
    SELECT EXISTS (
        SELECT 1 FROM ada_configurator.workstream_output_product_level_names
        WHERE lws_level_id = p_lws_level_id
        LIMIT 1
    ) INTO v_has_product_columns;
    
    -- Check if we have store columns
    SELECT EXISTS (
        SELECT 1 FROM ada_configurator.workstream_output_store_level_names
        WHERE lws_level_id = p_lws_level_id
        LIMIT 1
    ) INTO v_has_store_columns;
    
    -- Get product WHERE clause if needed
    IF v_has_product_columns THEN
        -- Call your existing SP to get product WHERE clause
        SELECT ada_configurator.get_cascaded_conditions_workstream('product', v_grouping_id) INTO v_product_where_clause;
    ELSE
        v_product_where_clause := '(true)';
    END IF;
    
    -- Get store WHERE clause if needed
    IF v_has_store_columns THEN
        -- Call your existing SP to get store WHERE clause
        SELECT ada_configurator.get_cascaded_conditions_workstream('store', v_grouping_id) INTO v_store_where_clause;
    ELSE
        v_store_where_clause := '(true)';
    END IF;

    -- Get product target columns with display names
    v_product_info_query := '
    SELECT 
        array_agg(twopln.product_level_name) AS column_names,
        array_agg(COALESCE(pgsm.display_name, pgsm.source_column_name, pgsm.generic_column_name)) AS display_names
    FROM ada_configurator.workstream_output_product_level_names twopln
    LEFT JOIN global.product_generic_schema_mapping pgsm ON twopln.product_level_name = pgsm.generic_column_name
    WHERE twopln.lws_level_id = ' || p_lws_level_id;
    
    EXECUTE v_product_info_query INTO v_product_columns, v_product_display_names;

    -- Get store target columns with display names
    v_store_info_query := '
    SELECT 
        array_agg(twosln.store_level_name) AS column_names,
        array_agg(COALESCE(sgsm.display_name, sgsm.source_column_name, sgsm.generic_column_name)) AS display_names
    FROM ada_configurator.workstream_output_store_level_names twosln
    LEFT JOIN global.store_generic_schema_mapping sgsm ON twosln.store_level_name = sgsm.generic_column_name
    WHERE twosln.lws_level_id = ' || p_lws_level_id;
    
    EXECUTE v_store_info_query INTO v_store_columns, v_store_display_names;

    -- Fetch product data with target columns and display names
    IF v_has_product_columns AND v_product_columns IS NOT NULL AND array_length(v_product_columns, 1) > 0 THEN
        -- Build dynamic jsonb_build_object with all product target columns
        v_product_query := 'SELECT jsonb_build_object(';
        
        -- Add each target column to the query
        FOR i IN 1..array_length(v_product_columns, 1) LOOP
            -- Add comma if not the first item
            IF i > 1 THEN
                v_product_query := v_product_query || ', ';
            END IF;
            
            -- Use display name as the key instead of column name
            v_product_query := v_product_query || format(
                '%L, (SELECT jsonb_agg(DISTINCT paf.%I) FROM global.product_attributes_filter paf WHERE %s AND paf.%I IS NOT NULL)',
                v_product_display_names[i], 
                v_product_columns[i], 
                v_product_where_clause, 
                v_product_columns[i]
            );
        END LOOP;
        
        -- Close the query
        v_product_query := v_product_query || ')';
        
        -- Execute the query to get product data
        EXECUTE v_product_query INTO v_product_data;
    ELSE
        v_product_data := '{}'::jsonb;
    END IF;
    
    -- Fetch store data with target columns and display names
    IF v_has_store_columns AND v_store_columns IS NOT NULL AND array_length(v_store_columns, 1) > 0 THEN
        -- Build dynamic jsonb_build_object with all store target columns
        v_store_query := 'SELECT jsonb_build_object(';
        
        -- Add each target column to the query
        FOR i IN 1..array_length(v_store_columns, 1) LOOP
            -- Add comma if not the first item
            IF i > 1 THEN
                v_store_query := v_store_query || ', ';
            END IF;
            
            -- Use display name as the key instead of column name
            v_store_query := v_store_query || format(
                '%L, (SELECT jsonb_agg(DISTINCT saf.%I) FROM global.store_attributes_filter saf WHERE %s AND saf.%I IS NOT NULL)',
                v_store_display_names[i], 
                v_store_columns[i], 
                v_store_where_clause, 
                v_store_columns[i]
            );
        END LOOP;
        
        -- Close the query
        v_store_query := v_store_query || ')';
        
        -- Execute the query to get store data
        EXECUTE v_store_query INTO v_store_data;
    ELSE
        v_store_data := '{}'::jsonb;
    END IF;

    -- Return the results
    RETURN QUERY SELECT 
        v_product_where_clause, 
        v_store_where_clause, 
        COALESCE(v_product_data, '{}'::jsonb), 
        COALESCE(v_store_data, '{}'::jsonb);

EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error getting data for LWS ID %: %', p_lws_level_id, SQLERRM;
END;
$function$
;