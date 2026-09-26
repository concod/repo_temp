--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:fn_reporting_r1_get_hierarchy_names_for_json runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for fn_reporting_r1_get_hierarchy_names_for_json

DROP FUNCTION IF EXISTS price_promo_opt.fn_reporting_r1_get_hierarchy_names_for_json ;
CREATE OR REPLACE FUNCTION price_promo_opt.fn_reporting_r1_get_hierarchy_names_for_json(hierarchy_levels integer[], hierarchy_type text, additional_columns text[])
 RETURNS text
 LANGUAGE plpgsql
AS $function$

-- Purpose – Formats unique hierarchy column names for JSON output in reporting functions based on configuration
-- 
-- Example – SELECT price_promo_opt.fn_reporting_r1_get_hierarchy_names_for_json(ARRAY[0,1,2], 'product', ARRAY['FOB']::text[]);
-- 
-- Other Functions Used:
-- * None
-- 
-- Tables Used:
-- * price_promo.tb_tool_configurations - Stores the configuration for hierarchy column mappings with display names
-- 
-- Returns – A text string containing unique formatted column names for JSON construction in reporting queries

DECLARE
    column_names text := '';
    level_name integer;
    config_module text;
    _config_name text;
    config_json jsonb;
    level_config jsonb;
    config_columns text[];
    overall_level_id integer;
    _display_name text;
    column_display_name text;
    all_columns text[] := '{}';
    all_display_names text[] := '{}';
    unique_columns text[] := '{}';
    column_to_add text;
    final_columns text := '';
    i integer;
    column_index integer;
BEGIN
    -- Validate hierarchy_type
    IF hierarchy_type != 'product' AND hierarchy_type != 'store' AND hierarchy_type != 'customer' THEN
        RAISE EXCEPTION 'Invalid hierarchy_type: %. Must be either ''product'' or ''store''', hierarchy_type;
    END IF;
    
    -- Determine the configuration module and name based on hierarchy_type
    config_module := 'reporting';
    
    IF hierarchy_type = 'product' THEN
        _config_name := 'product_filter';
    ELSIF hierarchy_type = 'store' THEN
        _config_name := 'store_filter';
    ELSIF hierarchy_type = 'customer' THEN
        _config_name := 'customer_filter';
    END IF;

    -- Check if -200 exists in hierarchy_levels, if so return an empty string
    IF -200 = ANY(hierarchy_levels) THEN
        RETURN '';
    END IF;
    
    -- Get the configuration from the tool_configurations table
    SELECT config_value::jsonb INTO config_json
    FROM price_promo.tb_tool_configurations
    WHERE module = config_module AND config_name = _config_name;
    
    -- If configuration doesn't exist, throw an exception
    IF config_json IS NULL THEN
        RAISE EXCEPTION 'No configuration found for module % and config_name %. Configuration must be added to price_promo.tb_tool_configurations.', config_module, _config_name;
    ELSE
        -- First collect all columns and display names from the configuration
        FOREACH level_name IN ARRAY hierarchy_levels LOOP
            level_config := config_json->>(level_name::text);
            
            IF level_config IS NOT NULL THEN
                -- Standard format: [{"display":"Display Name","column":"column_name"}]
                FOR i IN 0..jsonb_array_length(level_config)-1 LOOP
                    IF level_config->i->>'column' IS NOT NULL THEN
                        column_to_add := level_config->i->>'column';
                        
                        -- Get display name, or use column name if display name is not provided
                        column_display_name := level_config->i->>'display';
                        IF column_display_name IS NULL THEN
                            column_display_name := column_to_add;
                        END IF;
                        
                        -- Add the column and its display name to our arrays
                        all_columns := array_append(all_columns, column_to_add);
                        all_display_names := array_append(all_display_names, column_display_name);
                    END IF;
                END LOOP;
            ELSE
                -- If level is not found in configuration, raise an exception
                RAISE EXCEPTION 'No configuration found for level % in module % and config_name %.', level_name, config_module, _config_name;
            END IF;
        END LOOP;
        
        -- Get unique columns while preserving the first display name for each column
        -- First, create a temporary table to store unique columns with their positions
        CREATE TEMP TABLE IF NOT EXISTS temp_unique_columns (
            column_name text,
            display_name text,
            position integer
        ) ON COMMIT DROP;
        
        -- Clear the temp table
        DELETE FROM temp_unique_columns;
        
        -- Insert unique columns with their first occurrence position
        WITH column_data AS (
            SELECT 
                column_name,
                display_name,
                array_position(all_columns, column_name) as position,
                ROW_NUMBER() OVER (PARTITION BY column_name ORDER BY array_position(all_columns, column_name)) as rn
            FROM 
                unnest(all_columns) WITH ORDINALITY AS t1(column_name, idx)
                JOIN unnest(all_display_names) WITH ORDINALITY AS t2(display_name, idx) ON t1.idx = t2.idx
        )
        INSERT INTO temp_unique_columns
        SELECT column_name, display_name, position
        FROM column_data
        WHERE rn = 1;
        
        -- Get the results ordered by original position
        SELECT 
            array_agg(column_name ORDER BY position),
            array_agg(display_name ORDER BY position)
        INTO 
            unique_columns,
            all_display_names
        FROM 
            temp_unique_columns;
            
        -- Build the final column list with unique columns
        FOR i IN 1..array_length(unique_columns, 1) LOOP
            final_columns := final_columns || ' ''' || all_display_names[i] || ''', ' || unique_columns[i] || ', ';
        END LOOP;
        
        -- Set the result
        column_names := final_columns;
    END IF;
    
    RETURN TRIM(LEADING ', ' FROM column_names); -- Trim trailing comma and space
END;
$function$
;
