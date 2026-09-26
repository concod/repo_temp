--liquibase formatted sql
--changeset priyansh.gautam@impactanalytics.co:find_matching_forecast_for_lower1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:MTP-89055
--comment: initial changeset for find_matching_forecast_for_lower
--rollback: SELECT 1

DROP FUNCTION IF EXISTS ada_configurator.find_matching_forecast_for_lower(jsonb, int4);

CREATE OR REPLACE FUNCTION ada_configurator.find_matching_forecast_for_lower(p_json_input jsonb, p_level_id integer DEFAULT NULL::integer)
 RETURNS TABLE(forecast_id integer, match_found boolean)
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_product_hierarchy JSONB;
    v_store_hierarchy JSONB;
    v_time_hierarchy JSONB;
    v_forecast_ids INTEGER[];
    v_curr_forecast_id INTEGER;
    v_match_found BOOLEAN;
    v_any_found BOOLEAN := FALSE;
BEGIN
    -- Extract hierarchies from JSON input
    v_product_hierarchy := p_json_input->'product_level';
    v_store_hierarchy := p_json_input->'store_level';
    v_time_hierarchy := p_json_input->'time_level';
    
    RAISE NOTICE 'Starting search with JSON: %', p_json_input;
    
    -- If level_id is provided, only check that specific forecast
    IF p_level_id IS NOT NULL THEN
        RAISE NOTICE 'Checking specific forecast_id: %', p_level_id;
        v_match_found := ada_configurator.check_aggregation_for_lower_level_forecast(p_json_input, p_level_id);
        -- Use column aliases to avoid ambiguity
        RETURN QUERY SELECT p_level_id, v_match_found;
        RETURN;
    END IF;
    
    -- If no level_id provided, get all distinct forecast_ids from the tables
    WITH combined_ids AS (
        SELECT DISTINCT e.forecast_id 
        FROM ada_configurator.experiment_product_level_names e
        inner join ada_configurator.experiment_level el on 
        el.level_id = e.forecast_id 
		inner join ada_configurator.experiment_master em on
		em.experiment_id = el.experiment_id
		where em.level = 'High' and el.exp_level_type = 'forecast'
        UNION
        SELECT DISTINCT e.forecast_id 
        FROM ada_configurator.experiment_store_level_names e
 		inner join ada_configurator.experiment_level el on 
        el.level_id = e.forecast_id 
		inner join ada_configurator.experiment_master em on
		em.experiment_id = el.experiment_id
		where em.level = 'High' and el.exp_level_type = 'forecast'
        UNION
        SELECT DISTINCT e.forecast_id 
        FROM ada_configurator.experiment_time_level_names e
		inner join ada_configurator.experiment_level el on 
        el.level_id = e.forecast_id 
		inner join ada_configurator.experiment_master em on
		em.experiment_id = el.experiment_id
		where em.level = 'High' and el.exp_level_type = 'forecast'
    )
    SELECT array_agg(c.forecast_id) INTO v_forecast_ids FROM combined_ids c;
    
    RAISE NOTICE 'Searching through % forecast IDs', array_length(v_forecast_ids, 1);
    
    -- Check each forecast_id for a match
    FOREACH v_curr_forecast_id IN ARRAY v_forecast_ids
    LOOP
        RAISE NOTICE 'Checking forecast_id: %', v_curr_forecast_id;
        
        -- Use the existing check_hierarchies_test function
        v_match_found := ada_configurator.check_aggregation_for_lower_level_forecast(p_json_input, v_curr_forecast_id);
        
        -- If a match is found, return the forecast_id and true
        IF v_match_found THEN
            RAISE NOTICE 'Match found for forecast_id: %', v_curr_forecast_id;
            v_any_found := TRUE;
            -- Use RETURN QUERY to avoid ambiguity
            RETURN QUERY SELECT v_curr_forecast_id, v_match_found;
        END IF;
    END LOOP;
    
    -- If we didn't find any matches, return NULL with false
    IF NOT v_any_found THEN
        RAISE NOTICE 'No matching forecast_id found';
        RETURN QUERY SELECT NULL::INTEGER, FALSE;
    END IF;
    
    RETURN;
END;
$function$
;
