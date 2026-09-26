--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:fn_reporting_r1_get_hierarchy_names runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: stacking changes for fn_reporting_r1_get_hierarchy_names

DROP FUNCTION IF EXISTS price_promo_opt.fn_reporting_r1_get_hierarchy_names;
CREATE OR REPLACE FUNCTION price_promo_opt.fn_reporting_r1_get_hierarchy_names(hierarchy_levels integer[], hierarchy_type text, additional_columns text[], make_null boolean DEFAULT false, _impute_text_columns boolean DEFAULT false)
 RETURNS text
 LANGUAGE plpgsql
AS $function$

-- Purpose – Generates a list of unique column names for SQL queries based on configuration from tb_tool_configurations
-- 
-- Example – SELECT price_promo_opt.fn_reporting_r1_get_hierarchy_names(ARRAY[0, 1, 2], 'product', ARRAY['FOB']::text[], false);
-- 
-- Other Functions Used:
-- * None
-- 
-- Tables Used:
-- * price_promo.tb_tool_configurations - Stores the configuration for hierarchy column mappings
-- 
-- Returns – A text string containing unique column names for SQL queries based on configuration, optionally with NULL values if make_null is true

DECLARE
    column_names text := '';
    level_name integer;
    col_name text;
    config_module text;
    _config_name text;
    config_json jsonb;
    level_config jsonb;
    config_columns text[];
    overall_level_id integer;
    all_columns text[];
    unique_columns text[];
    column_to_add text;
	type_to_add text;
    final_columns text := '';
	i INT;
    col_type text;
    column_type_map jsonb := '{}';
BEGIN
    -- Validate hierarchy_type
    IF hierarchy_type != 'product' AND hierarchy_type != 'store' AND hierarchy_type != 'customer' THEN
        RAISE EXCEPTION 'Invalid hierarchy_type: %. Must be either ''product'' or ''store'' or ''customer''', hierarchy_type;
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

    -- Get configuration from tb_tool_configurations
    SELECT config_value::jsonb INTO config_json
    FROM price_promo.tb_tool_configurations
    WHERE module = config_module AND config_name = _config_name;

    -- If configuration doesn't exist, throw an exception
    IF config_json IS NULL THEN
        RAISE EXCEPTION 'No configuration found for module % and config_name %. Configuration must be added to price_promo.tb_tool_configurations.', config_module, _config_name;
    ELSE
        -- First collect all columns from the configuration
        all_columns := '{}';
        
        -- Use the configuration to build the column names
        FOREACH level_name IN ARRAY hierarchy_levels LOOP
            level_config := config_json->>(level_name::text);
            
            IF level_config IS NOT NULL THEN
                -- Standard format: [{"display":"Display Name","column":"column_name","type":"data_type"}]
                -- For this function we only care about the column names
                FOR i IN 0..jsonb_array_length(level_config)-1 LOOP
                    IF level_config->i->>'column' IS NOT NULL THEN
                        column_to_add := level_config->i->>'column';
                        type_to_add := level_config->i->>'type';
                        -- Add the column to our array
                        all_columns := array_append(all_columns, column_to_add);
                        IF type_to_add IS NOT NULL THEN
                             column_type_map := column_type_map || jsonb_build_object(column_to_add, type_to_add);
                        END IF;
                    END IF;
                END LOOP;
            ELSE
                -- If level is not found in configuration, raise an exception
                RAISE EXCEPTION 'No configuration found for level % in module % and config_name %.', level_name, config_module, _config_name;
            END IF;
        END LOOP;
        
        -- Add additional columns
        IF additional_columns IS NOT NULL AND array_length(additional_columns, 1) > 0 THEN
            FOREACH col_name IN ARRAY additional_columns LOOP
                all_columns := array_append(all_columns, col_name);
            END LOOP;
        END IF;
        
        -- Remove duplicates by selecting distinct elements
        SELECT ARRAY(SELECT DISTINCT unnest FROM unnest(all_columns) ORDER BY unnest) INTO unique_columns;
        

		  FOR i IN array_lower(unique_columns, 1) .. array_upper(unique_columns, 1) LOOP
		    -- Extract the type for the current column
		    SELECT column_type_map->>unique_columns[i] INTO col_type;
		    IF col_type IS NULL THEN
		        col_type := 'text'; -- default type
		    END IF;

		    IF make_null THEN
		        final_columns := final_columns || ', NULL::' || col_type || ' AS ' || unique_columns[i];
		    ELSE
		        IF _impute_text_columns AND col_type = 'text' THEN
		            final_columns := final_columns || ', price_promo.impute_special_characters(' || unique_columns[i] || ') AS ' || unique_columns[i];
		        ELSE
		            final_columns := final_columns || ', ' || unique_columns[i];
		        END IF;
		    END IF;
		  END LOOP;

        -- Set the result
        column_names := final_columns;
    END IF;
    RETURN TRIM(LEADING ', ' FROM column_names);
END;
$function$
;
