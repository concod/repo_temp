--liquibase formatted sql
--changeset priyansh.gautam:oms_calculate_lead_time_and_validate runOnChange:true stripComments:false splitStatements:false context:intial labels:oms_calculate_lead_time_and_validate
--comment: intial changeset for oms_calculate_lead_time_and_validate
--rollback: SELECT 1
DROP FUNCTION IF EXISTS oms.oms_calculate_lead_time_and_validate(jsonb, jsonb);

CREATE OR REPLACE FUNCTION oms.oms_calculate_lead_time_and_validate(p_input jsonb, p_config jsonb)
 RETURNS TABLE(is_valid boolean, results jsonb, failed_records jsonb)
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_is_sub_level BOOLEAN;
    v_total_key TEXT;
    v_delta_key TEXT;
    v_sublevel_keys TEXT[];
    v_row JSONB;
    v_where_clause TEXT;
    v_existing_json JSONB;
    v_key TEXT;
    v_value NUMERIC;
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
    v_query TEXT;
    v_sublevel_raw JSONB;
BEGIN
    -- Check is_sub_level flag
    IF jsonb_typeof(p_config->'lead_time_is_sub_level') = 'array' THEN
        v_is_sub_level := (p_config->'lead_time_is_sub_level'->>0)::BOOLEAN;
    ELSE
        v_is_sub_level := COALESCE((p_config->>'lead_time_is_sub_level')::BOOLEAN, FALSE);
    END IF;
    -- Extract total_key (handle both string and array format)
    IF jsonb_typeof(p_config->'lead_time_total_lead_time_key') = 'array' THEN
        v_total_key := p_config->'lead_time_total_lead_time_key'->>0;
    ELSE
        v_total_key := p_config->>'lead_time_total_lead_time_key';
    END IF;
    -- If is_sub_level is FALSE, only do >0 validation
    IF NOT v_is_sub_level THEN
        FOR v_row IN SELECT * FROM jsonb_array_elements(p_input)
        LOOP
            v_row_valid := TRUE;
            v_row_result := '{}'::JSONB;
            v_error_msg := NULL;
            v_where_clause := v_row->>'where_clause';
            -- Validate input values > 0 (skip where_clause)
            FOR v_key, v_value IN 
                SELECT key, value::TEXT::NUMERIC 
                FROM jsonb_each(v_row)
                WHERE key != 'where_clause'
            LOOP
                IF v_value IS NULL OR v_value <= 0 THEN
                    v_row_valid := FALSE;
                    v_error_msg := COALESCE(v_error_msg || ', ', '') || v_key || ' must be > 0';
                ELSE
                    v_row_result := v_row_result || jsonb_build_object(v_key, v_value);
                END IF;
            END LOOP;
            v_row_result := v_row_result || jsonb_build_object('where_clause', v_where_clause);
            IF v_row_valid THEN
                v_all_results := v_all_results || jsonb_build_array(v_row_result);
            ELSE
                v_all_valid := FALSE;
                v_failed_records := v_failed_records || jsonb_build_array(
                    jsonb_build_object('where_clause', v_where_clause, 'error', v_error_msg)
                );
            END IF;
        END LOOP;
        RETURN QUERY SELECT v_all_valid, v_all_results, v_failed_records;
        RETURN;
    END IF;
    -- is_sub_level = TRUE: Full validation logic
    -- Extract delta_key
    IF jsonb_typeof(p_config->'lead_time_delta_key') = 'array' THEN
        v_delta_key := p_config->'lead_time_delta_key'->>0;
    ELSE
        v_delta_key := p_config->>'lead_time_delta_key';
    END IF;
    -- Extract sublevel_keys
    v_sublevel_raw := p_config->'lead_time_sub_level';
    IF jsonb_typeof(v_sublevel_raw) = 'array' THEN
        SELECT array_agg(elem::TEXT) INTO v_sublevel_keys
        FROM jsonb_array_elements_text(v_sublevel_raw) AS elem;
    ELSE
        v_sublevel_keys := ARRAY[p_config->>'lead_time_sub_level'];
    END IF;
    -- Process each row with full validation
    FOR v_row IN SELECT * FROM jsonb_array_elements(p_input)
    LOOP
        v_row_valid := TRUE;
        v_row_result := '{}'::JSONB;
        v_new_total := 0;
        v_error_msg := NULL;
        v_where_clause := v_row->>'where_clause';
        v_is_total_update := v_row ? v_total_key;
        -- Validate input values > 0 (skip where_clause)
        FOR v_key, v_value IN 
            SELECT key, value::TEXT::NUMERIC 
            FROM jsonb_each(v_row)
            WHERE key != 'where_clause'
        LOOP
            IF v_value IS NULL OR v_value <= 0 THEN
                v_row_valid := FALSE;
                v_error_msg := COALESCE(v_error_msg || ', ', '') || v_key || ' must be > 0';
            END IF;
        END LOOP;
        IF v_row_valid THEN
            -- Fetch existing record as JSON using dynamic where clause
            v_query := 'SELECT row_to_json(t)::jsonb FROM (SELECT * FROM oms.oms_constraints_lead_time ' || v_where_clause || ' LIMIT 1) t';
            EXECUTE v_query INTO v_existing_json;
            IF v_existing_json IS NULL THEN
                v_row_valid := FALSE;
                v_error_msg := 'Record not found for: ' || v_where_clause;
            ELSE
                v_existing_total := (v_existing_json->>v_total_key)::NUMERIC;
                IF v_is_total_update THEN
                    v_new_total := (v_row->>v_total_key)::NUMERIC;
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
                        IF v_row ? v_key THEN
                            v_value := (v_row->>v_key)::NUMERIC;
                        ELSE
                            v_value := (v_existing_json->>v_key)::NUMERIC;
                        END IF;
                        v_row_result := v_row_result || jsonb_build_object(v_key, v_value);
                        v_new_total := v_new_total + COALESCE(v_value, 0);
                    END LOOP;
                    v_row_result := jsonb_build_object(v_total_key, v_new_total) || v_row_result;
                END IF;
            END IF;
        END IF;
        v_row_result := v_row_result || jsonb_build_object('where_clause', v_where_clause);
        IF v_row_valid THEN
            v_all_results := v_all_results || jsonb_build_array(v_row_result);
        ELSE
            v_all_valid := FALSE;
            v_failed_records := v_failed_records || jsonb_build_array(
                jsonb_build_object('where_clause', v_where_clause, 'error', v_error_msg)
            );
        END IF;
    END LOOP;
    RETURN QUERY SELECT v_all_valid, v_all_results, v_failed_records;
END;
$function$
;

