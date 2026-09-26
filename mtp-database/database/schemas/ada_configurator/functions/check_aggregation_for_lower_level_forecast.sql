--liquibase formatted sql
--changeset priyansh.gautam@impactanalytics.co:check_aggregation_for_lower_level_forecast1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:MTP-89055
--comment: initial changeset for check_aggregation_for_lower_level_forecast
--rollback: SELECT 1

DROP FUNCTION IF EXISTS ada_configurator.check_aggregation_for_lower_level_forecast(jsonb, int4);

CREATE OR REPLACE FUNCTION ada_configurator.check_aggregation_for_lower_level_forecast(p_json_input jsonb, p_level_id integer)
 RETURNS boolean
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_product_match BOOLEAN := TRUE;
    v_store_match BOOLEAN := TRUE;
    v_time_match BOOLEAN := TRUE;
    v_product_hierarchy JSONB;
    v_store_hierarchy JSONB;
    v_time_hierarchy JSONB;
    v_product_levels JSONB;
    v_store_levels JSONB;
    v_time_levels JSONB;
    v_level TEXT;
    v_level_value TEXT;
    v_hierarchy_type TEXT;
    v_time_type TEXT;
    v_json_product_levels INTEGER[];
    v_json_store_levels INTEGER[];
    v_json_time_levels INTEGER[];
    v_db_product_levels INTEGER[];
    v_db_store_levels INTEGER[];
    v_db_time_levels INTEGER[];
BEGIN
    -- Log input parameters
    RAISE NOTICE 'Starting check_aggregation_for_lower_level_forecast with level_id: % and json: %', p_level_id, p_json_input;
    
    -- Extract hierarchies from JSON input
    v_product_hierarchy := p_json_input->'product_level';
    v_store_hierarchy := p_json_input->'store_level';
    v_time_hierarchy := p_json_input->'time_level';
    
    -- Extract levels objects from each hierarchy
    v_product_levels := v_product_hierarchy->'levels';
    v_store_levels := v_store_hierarchy->'levels';
    v_time_levels := v_time_hierarchy->'levels';
    
    RAISE NOTICE 'Extracted hierarchies - Product: %, Store: %, Time: %', 
                v_product_hierarchy IS NOT NULL, 
                v_store_hierarchy IS NOT NULL, 
                v_time_hierarchy IS NOT NULL;
    
    RAISE NOTICE 'Extracted levels - Product: %, Store: %, Time: %', 
                v_product_levels IS NOT NULL, 
                v_store_levels IS NOT NULL, 
                v_time_levels IS NOT NULL;
    
    -- Check if product hierarchy exists in the input
    IF v_product_hierarchy IS NOT NULL AND v_product_levels IS NOT NULL THEN
        v_hierarchy_type := v_product_hierarchy->>'hierarchy_type';
        RAISE NOTICE 'Product hierarchy type: %', v_hierarchy_type;
        
        -- Get all level numbers from JSON
        SELECT ARRAY_AGG(key::INTEGER)
        INTO v_json_product_levels
        FROM jsonb_each_text(v_product_levels)
        WHERE key ~ '^[0-9]+$';
        
        -- Get all level numbers from database
        SELECT ARRAY_AGG(DISTINCT hierarchy)
        INTO v_db_product_levels
        FROM ada_configurator.experiment_product_level_names
        WHERE forecast_id = p_level_id;
        
        RAISE NOTICE 'Product levels - JSON: %, DB: %', v_json_product_levels, v_db_product_levels;
        
        -- Check if JSON levels match exactly with DB levels
        IF v_json_product_levels IS DISTINCT FROM v_db_product_levels THEN
            v_product_match := FALSE;
            RAISE NOTICE 'Product match failed: JSON levels do not exactly match DB levels';
        ELSE
            -- Check if each level in the JSON matches with the database
            FOR v_level, v_level_value IN 
                SELECT * FROM jsonb_each_text(v_product_levels)
                WHERE key ~ '^[0-9]+$'
            LOOP
                RAISE NOTICE 'Checking product level: %, value: %', v_level, v_level_value;
                
                PERFORM 1
                FROM ada_configurator.experiment_product_level_names
                WHERE forecast_id = p_level_id
                  AND product_level_id = v_level_value
                  AND hierarchy = v_level::integer;
                
                IF NOT FOUND THEN
                    v_product_match := FALSE;
                    RAISE NOTICE 'Product match failed for level: %, value: %', v_level, v_level_value;
                    EXIT;
                ELSE
                    RAISE NOTICE 'Product match succeeded for level: %, value: %', v_level, v_level_value;
                END IF;
            END LOOP;
        END IF;
    ELSE
        -- If product hierarchy doesn't exist in JSON but exists in DB, fail the match
        SELECT ARRAY_AGG(DISTINCT hierarchy)
        INTO v_db_product_levels
        FROM ada_configurator.experiment_product_level_names
        WHERE forecast_id = p_level_id;
        
        IF v_db_product_levels IS NOT NULL AND array_length(v_db_product_levels, 1) > 0 THEN
            v_product_match := FALSE;
            RAISE NOTICE 'Product match failed: DB has product levels but JSON does not';
        END IF;
    END IF;
    
    RAISE NOTICE 'Product hierarchy match result: %', v_product_match;
    
    -- Check if store hierarchy exists in the input
    IF v_store_hierarchy IS NOT NULL AND v_store_levels IS NOT NULL THEN
        v_hierarchy_type := v_store_hierarchy->>'hierarchy_type';
        RAISE NOTICE 'Store hierarchy type: %', v_hierarchy_type;
        
        -- Get all level numbers from JSON
        SELECT ARRAY_AGG(key::INTEGER)
        INTO v_json_store_levels
        FROM jsonb_each_text(v_store_levels)
        WHERE key ~ '^[0-9]+$';
        
        -- Get all level numbers from database
        SELECT ARRAY_AGG(DISTINCT hierarchy)
        INTO v_db_store_levels
        FROM ada_configurator.experiment_store_level_names
        WHERE forecast_id = p_level_id;
        
        RAISE NOTICE 'Store levels - JSON: %, DB: %', v_json_store_levels, v_db_store_levels;
        
        -- Check if JSON levels match exactly with DB levels
        IF v_json_store_levels IS DISTINCT FROM v_db_store_levels THEN
            v_store_match := FALSE;
            RAISE NOTICE 'Store match failed: JSON levels do not exactly match DB levels';
        ELSE
            -- Check if each level in the JSON matches with the database
            FOR v_level, v_level_value IN 
                SELECT * FROM jsonb_each_text(v_store_levels)
                WHERE key ~ '^[0-9]+$'
            LOOP
                RAISE NOTICE 'Checking store level: %, value: %', v_level, v_level_value;
                
                PERFORM 1
                FROM ada_configurator.experiment_store_level_names
                WHERE forecast_id = p_level_id
                  AND store_level_id = v_level_value
                  AND hierarchy = v_level::integer;
                
                IF NOT FOUND THEN
                    v_store_match := FALSE;
                    RAISE NOTICE 'Store match failed for level: %, value: %', v_level, v_level_value;
                    EXIT;
                ELSE
                    RAISE NOTICE 'Store match succeeded for level: %, value: %', v_level, v_level_value;
                END IF;
            END LOOP;
        END IF;
    ELSE
        -- If store hierarchy doesn't exist in JSON but exists in DB, fail the match
        SELECT ARRAY_AGG(DISTINCT hierarchy)
        INTO v_db_store_levels
        FROM ada_configurator.experiment_store_level_names
        WHERE forecast_id = p_level_id;
        
        IF v_db_store_levels IS NOT NULL AND array_length(v_db_store_levels, 1) > 0 THEN
            v_store_match := FALSE;
            RAISE NOTICE 'Store match failed: DB has store levels but JSON does not';
        END IF;
    END IF;
    
    RAISE NOTICE 'Store hierarchy match result: %', v_store_match;
    
    -- Check if time hierarchy exists in the input
    IF v_time_hierarchy IS NOT NULL AND v_time_levels IS NOT NULL THEN
        v_hierarchy_type := v_time_hierarchy->>'hierarchy_type';
        v_time_type := v_time_hierarchy->>'time_type';
        RAISE NOTICE 'Time hierarchy type: %, time type: %', v_hierarchy_type, v_time_type;
        
        -- Get all level numbers from JSON
        SELECT ARRAY_AGG(key::INTEGER)
        INTO v_json_time_levels
        FROM jsonb_each_text(v_time_levels)
        WHERE key ~ '^[0-9]+$';
        
        -- Get all level numbers from database
        SELECT ARRAY_AGG(DISTINCT hierarchy)
        INTO v_db_time_levels
        FROM ada_configurator.experiment_time_level_names
        WHERE forecast_id = p_level_id;
        
        RAISE NOTICE 'Time levels - JSON: %, DB: %', v_json_time_levels, v_db_time_levels;
        
        -- Check if JSON levels match exactly with DB levels
        IF v_json_time_levels IS DISTINCT FROM v_db_time_levels THEN
            v_time_match := FALSE;
            RAISE NOTICE 'Time match failed: JSON levels do not exactly match DB levels';
        ELSE
            -- Check if each level in the JSON matches with the database
            FOR v_level, v_level_value IN 
                SELECT * FROM jsonb_each_text(v_time_levels)
                WHERE key ~ '^[0-9]+$'
            LOOP
                RAISE NOTICE 'Checking time level: %, value: %', v_level, v_level_value;
                
                PERFORM 1
                FROM ada_configurator.experiment_time_level_names
                WHERE forecast_id = p_level_id
                  AND time_level_name = v_level_value
                  AND hierarchy = v_level::integer
                  AND calendar_type = v_time_type;
                
                IF NOT FOUND THEN
                    v_time_match := FALSE;
                    RAISE NOTICE 'Time match failed for level: %, value: %', v_level, v_level_value;
                    EXIT;
                ELSE
                    RAISE NOTICE 'Time match succeeded for level: %, value: %', v_level, v_level_value;
                END IF;
            END LOOP;
        END IF;
    ELSE
        -- If time hierarchy doesn't exist in JSON but exists in DB, fail the match
        SELECT ARRAY_AGG(DISTINCT hierarchy)
        INTO v_db_time_levels
        FROM ada_configurator.experiment_time_level_names
        WHERE forecast_id = p_level_id;
        
        IF v_db_time_levels IS NOT NULL AND array_length(v_db_time_levels, 1) > 0 THEN
            v_time_match := FALSE;
            RAISE NOTICE 'Time match failed: DB has time levels but JSON does not';
        END IF;
    END IF;
    
    RAISE NOTICE 'Time hierarchy match result: %', v_time_match;
    
    -- Calculate final result
    RETURN v_product_match AND v_store_match AND v_time_match;
END;
$function$
;
