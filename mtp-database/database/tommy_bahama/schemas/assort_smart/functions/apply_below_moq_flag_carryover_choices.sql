--liquibase formatted sql
--changeset hemanth.cs@impactanalytics.co liquibase:created_new_sp_to_handle_below_moq_flag_for_carryover_choices runOnChange:true  stripComments:false splitStatements:false context:MTP-96027 labels:created_new_sp_to_handle_below_moq_flag_for_carryover_choices
--comment: new sp to handle below moq flag for carryover choices
--rollback: SELECT 1
DROP FUNCTION IF EXISTS assort_smart.apply_below_moq_flag_for_carryover_choices(integer[], text[]);

CREATE OR REPLACE FUNCTION assort_smart.apply_below_moq_flag_for_carryover_choices(p_plan_codes INTEGER[], p_final_levels TEXT[])
 RETURNS void
 LANGUAGE plpgsql
AS $function$
    /*
        Function/Procedure name: assort_smart.apply_below_moq_flag_for_carryover_choices
        Created at: 04-Mar-2026
        No of input parameter: 2
        Parameter Description:
                $1 = p_plan_codes (integer[]) - Array of plan codes
                $2 = p_final_levels (text[]) - Array of final levels

        Purpose: This function updates the below_moq_flag in the line_plan_choice_launch table
        for carryover choices (style_tag = 'Carryover'). It compares receipt_units->>'season' 
        with moq from plan_wedge_opt_constraint_wp table.
        - If receipt_units->>'season' >= moq, below_moq_flag = 0
        - If receipt_units->>'season' < moq, below_moq_flag = 1
        
        Calling Statement:
        SELECT assort_smart.apply_below_moq_flag_for_carryover_choices('{101, 102}', '{"Final Level 1","Final Level 2"}');
    */
DECLARE
    v_count_updated INTEGER := 0;
    v_error_message TEXT;
BEGIN
    -- Begin transaction
    BEGIN
        -- Input validation
        IF p_plan_codes IS NULL OR array_length(p_plan_codes, 1) IS NULL THEN
            RAISE EXCEPTION 'Plan codes array cannot be empty or null';
        END IF;
        
        IF p_final_levels IS NULL OR array_length(p_final_levels, 1) IS NULL THEN
            RAISE EXCEPTION 'Final levels array cannot be empty or null';
        END IF;

        -- Create a temporary table with MOQ data for better join performance
        CREATE TEMP TABLE temp_moq_mapping (
            plan_code INTEGER,
            hierarchy_code TEXT,
            moq INTEGER
        ) ON COMMIT DROP;
        
        -- Insert MOQ data from constraint table (distinct to avoid duplicates across clusters)
        INSERT INTO temp_moq_mapping
        SELECT DISTINCT
            c.plan_code,
            c.hierarchy_code,
            c.moq
        FROM assort_smart.plan_wedge_opt_constraint_wp c
        WHERE c.plan_code = ANY(p_plan_codes);
        
        -- Create an index on the temp table for better join performance
        CREATE INDEX idx_temp_moq_mapping ON temp_moq_mapping (plan_code, hierarchy_code);
        
        -- Analyze temp table for better query planning with large datasets
        ANALYZE temp_moq_mapping;
        
        -- Perform the update using the temp table
        UPDATE assort_smart.line_plan_choice_launch lp
        SET 
            below_moq_flag = CASE 
                WHEN COALESCE((lp.receipt_units->>'season')::NUMERIC, 0) >= COALESCE(tm.moq, 0) THEN 0
                ELSE 1
            END,
            updated_at = CURRENT_TIMESTAMP
        FROM temp_moq_mapping tm
        WHERE lp.plan_code = tm.plan_code
          AND lp.hierarchy_code = tm.hierarchy_code
          AND lp.final_level = ANY(p_final_levels)
          AND lp.style_tag = 'Carryover'
          AND lp.is_deleted = FALSE;
        
        -- Get the number of rows updated
        GET DIAGNOSTICS v_count_updated = ROW_COUNT;
        
        -- Log the results
        RAISE NOTICE 'Updated below_moq_flag for % record(s)', v_count_updated;
            
        -- If no rows were updated, log a message
        IF v_count_updated = 0 THEN
            RAISE NOTICE 'No carryover records found matching the provided plan codes and final levels';
        END IF;
        
    -- If any error occurs, the transaction will be rolled back
    EXCEPTION WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS v_error_message = MESSAGE_TEXT;
        RAISE EXCEPTION 'Error updating below_moq_flag values: %', v_error_message;
    END;
END
$function$;