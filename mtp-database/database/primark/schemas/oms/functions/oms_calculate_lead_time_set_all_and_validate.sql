--liquibase formatted sql
--changeset priyansh.gautam:oms_calculate_lead_time_set_all_and_validate2 runOnChange:true stripComments:false splitStatements:false context:intial labels:oms_calculate_lead_time_set_all_and_validate
--comment: intial changeset for oms_calculate_lead_time_set_all_and_validate
--rollback: SELECT 1

DROP FUNCTION IF EXISTS oms.oms_calculate_lead_time_set_all_and_validate(jsonb, jsonb, jsonb);
DROP FUNCTION IF EXISTS oms.oms_calculate_lead_time_set_all_and_validate(jsonb, jsonb, jsonb, integer);

CREATE OR REPLACE FUNCTION oms.oms_calculate_lead_time_set_all_and_validate(p_ids jsonb, p_values jsonb, p_config jsonb, p_user_id integer)
 RETURNS TABLE(is_valid boolean, results jsonb, failed_records jsonb, updated_count integer)
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_is_sub_level BOOLEAN;
    v_total_key TEXT;
    v_delta_key TEXT;
    v_sublevel_keys TEXT[];
    v_id INTEGER;
    v_existing_json JSONB;
    v_key TEXT;
    v_value NUMERIC;
    v_input_value NUMERIC;
    v_new_total NUMERIC;
    v_existing_total NUMERIC;
    v_delta NUMERIC;
    v_row_result JSONB;
    v_all_results JSONB := '[]'::JSONB;
    v_failed_records JSONB := '[]'::JSONB;
    v_row_valid BOOLEAN;
    v_all_valid BOOLEAN := TRUE;
    v_is_total_update BOOLEAN;
    v_delta_key_new_value NUMERIC;
    v_error_msg TEXT;
    v_ids_array INTEGER[];
    v_sublevel_raw JSONB;
    v_update_count INTEGER := 0;
    v_single_update_count INTEGER;
    v_update_query TEXT;
    v_set_clause TEXT;
BEGIN
    -- Check is_sub_level flag
    IF jsonb_typeof(p_config->'lead_time_is_sub_level') = 'array' THEN
        v_is_sub_level := (p_config->'lead_time_is_sub_level'->>0)::BOOLEAN;
    ELSE
        v_is_sub_level := (p_config->>'lead_time_is_sub_level')::BOOLEAN;
    END IF;
    -- Extract IDs array
    SELECT array_agg(elem::INTEGER) INTO v_ids_array
    FROM jsonb_array_elements_text(p_ids) AS elem;
    -- Validate input values > 0 (applies to both sub_level true/false)
    FOR v_key, v_input_value IN 
        SELECT key, value::TEXT::NUMERIC 
        FROM jsonb_each(p_values)
    LOOP
        IF v_input_value IS NULL OR v_input_value <= 0 THEN
            RETURN QUERY SELECT 
                FALSE, 
                NULL::JSONB, 
                jsonb_build_array(jsonb_build_object('error', v_key || ' must be > 0')),
                0;
            RETURN;
        END IF;
    END LOOP;
    -- If is_sub_level is FALSE, skip validation and directly update
    IF NOT v_is_sub_level THEN
        -- Build SET clause from p_values
        v_set_clause := '';
        FOR v_key, v_value IN 
            SELECT key, value::TEXT::NUMERIC 
            FROM jsonb_each(p_values)
        LOOP
            IF v_set_clause != '' THEN
                v_set_clause := v_set_clause || ', ';
            END IF;
            v_set_clause := v_set_clause || quote_ident(v_key) || ' = ' || v_value;
        END LOOP;
        v_set_clause := v_set_clause || ', updated_at = CURRENT_TIMESTAMP, updated_by = ' || p_user_id;
        -- Update all IDs directly
        v_update_query := 'UPDATE oms.oms_constraints_lead_time SET ' || v_set_clause || 
                          ' WHERE id = ANY($1)';
        EXECUTE v_update_query USING v_ids_array;
        GET DIAGNOSTICS v_update_count = ROW_COUNT;
        -- Build results
        FOREACH v_id IN ARRAY v_ids_array
        LOOP
            v_all_results := v_all_results || jsonb_build_array(p_values || jsonb_build_object('id', v_id));
        END LOOP;
        RETURN QUERY SELECT TRUE, v_all_results, '[]'::JSONB, v_update_count;
        RETURN;
    END IF;
    -- is_sub_level = TRUE: Full validation logic
    -- Extract config keys
    IF jsonb_typeof(p_config->'lead_time_total_lead_time_key') = 'array' THEN
        v_total_key := p_config->'lead_time_total_lead_time_key'->>0;
    ELSE
        v_total_key := p_config->>'lead_time_total_lead_time_key';
    END IF;
    IF jsonb_typeof(p_config->'lead_time_delta_key') = 'array' THEN
        v_delta_key := p_config->'lead_time_delta_key'->>0;
    ELSE
        v_delta_key := p_config->>'lead_time_delta_key';
    END IF;
    v_sublevel_raw := p_config->'lead_time_sub_level';
    IF jsonb_typeof(v_sublevel_raw) = 'array' THEN
        SELECT array_agg(elem::TEXT) INTO v_sublevel_keys
        FROM jsonb_array_elements_text(v_sublevel_raw) AS elem;
    ELSE
        v_sublevel_keys := ARRAY[p_config->>'lead_time_sub_level'];
    END IF;
    v_is_total_update := p_values ? v_total_key;
    -- Process each ID for validation
    FOREACH v_id IN ARRAY v_ids_array
    LOOP
        v_row_valid := TRUE;
        v_row_result := '{}'::JSONB;
        v_new_total := 0;
        v_error_msg := NULL;
        SELECT row_to_json(t)::jsonb INTO v_existing_json
        FROM (SELECT * FROM oms.oms_constraints_lead_time WHERE id = v_id) t;
        IF v_existing_json IS NULL THEN
            v_row_valid := FALSE;
            v_error_msg := 'Record not found for id: ' || v_id;
        ELSE
            v_existing_total := (v_existing_json->>v_total_key)::NUMERIC;
            IF v_is_total_update THEN
                v_new_total := (p_values->>v_total_key)::NUMERIC;
                v_delta := v_new_total - v_existing_total;
                v_delta_key_new_value := (v_existing_json->>v_delta_key)::NUMERIC + v_delta;
                IF v_delta_key_new_value <= 0 THEN
                    v_row_valid := FALSE;
                    v_error_msg := v_delta_key || ' would become ' || v_delta_key_new_value || ' (invalid)';
                ELSE
                    v_row_result := jsonb_build_object(v_total_key, v_new_total);
                    FOREACH v_key IN ARRAY v_sublevel_keys
                    LOOP
                        IF v_key = v_delta_key THEN
                            v_row_result := v_row_result || jsonb_build_object(v_key, v_delta_key_new_value);
                        ELSE
                            v_row_result := v_row_result || jsonb_build_object(v_key, (v_existing_json->>v_key)::NUMERIC);
                        END IF;
                    END LOOP;
                END IF;
            ELSE
                FOREACH v_key IN ARRAY v_sublevel_keys
                LOOP
                    IF p_values ? v_key THEN
                        v_value := (p_values->>v_key)::NUMERIC;
                    ELSE
                        v_value := (v_existing_json->>v_key)::NUMERIC;
                    END IF;
                    v_row_result := v_row_result || jsonb_build_object(v_key, v_value);
                    v_new_total := v_new_total + COALESCE(v_value, 0);
                END LOOP;
                v_row_result := jsonb_build_object(v_total_key, v_new_total) || v_row_result;
            END IF;
        END IF;
        v_row_result := v_row_result || jsonb_build_object('id', v_id);
        IF v_row_valid THEN
            v_all_results := v_all_results || jsonb_build_array(v_row_result);
        ELSE
            v_all_valid := FALSE;
            v_failed_records := v_failed_records || jsonb_build_array(
                jsonb_build_object('id', v_id, 'error', v_error_msg)
            );
        END IF;
    END LOOP;
    -- If all valid, perform the UPDATE
    IF v_all_valid THEN
        FOR v_row_result IN SELECT * FROM jsonb_array_elements(v_all_results)
        LOOP
            v_id := (v_row_result->>'id')::INTEGER;
            
            v_set_clause := '';
            FOR v_key, v_value IN 
                SELECT key, value::TEXT::NUMERIC 
                FROM jsonb_each(v_row_result)
                WHERE key != 'id' AND value::TEXT != 'null'
            LOOP
                IF v_set_clause != '' THEN
                    v_set_clause := v_set_clause || ', ';
                END IF;
                v_set_clause := v_set_clause || quote_ident(v_key) || ' = ' || v_value;
            END LOOP;
            v_set_clause := v_set_clause || ', updated_at = CURRENT_TIMESTAMP, updated_by = ' || p_user_id;
            v_update_query := 'UPDATE oms.oms_constraints_lead_time SET ' || v_set_clause || ' WHERE id = ' || v_id;
            EXECUTE v_update_query;
            GET DIAGNOSTICS v_single_update_count = ROW_COUNT;
            v_update_count := v_update_count + v_single_update_count;
        END LOOP;
    END IF;
    RETURN QUERY SELECT v_all_valid, v_all_results, v_failed_records, v_update_count;
END;
$function$
;