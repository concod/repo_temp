--liquibase formatted sql
--changeset hemanth.cs@impactanalytics.co liquibase:update_global_choice_status runOnChange:true  stripComments:false splitStatements:false context:MTP-95105 labels:liquibase_project_start
--comment: Update global_choice_status for line_review_plan_master table
--rollback: SELECT 1

DROP FUNCTION IF EXISTS assort_smart.update_global_choice_status(int4[], boolean);

CREATE OR REPLACE FUNCTION assort_smart.update_global_choice_status(
    p_plan_codes integer[],
    p_status boolean
)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
    /*
        Function/Procedure name: assort_smart.update_global_choice_status
        Created at: 07-Jul-2025
        No of input parameter: 2
        Parameter Description:
                $1 = p_plan_codes (integer[]) - Array of plan codes to update
                $2 = p_status (boolean) - Status to set for global_choice_status

        Purpose: This function updates the global_choice_status for the specified plan codes
        in the line_review_plan_master table. It also updates the updated_at timestamp
        and sets the updated_by user ID.
        
        Calling Statement:
        SELECT assort_smart.update_global_choice_status(ARRAY[1, 2, 3], true);
        SELECT assort_smart.update_global_choice_status(ARRAY[4, 5, 6], false);
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

        -- Update the global_choice_status for the given plan codes
        UPDATE assort_smart.line_review_plan_master
        SET 
            global_choice_status = p_status,
            updated_at = NOW()
        WHERE 
            line_review_plan_master_id = ANY(p_plan_codes);
        
        GET DIAGNOSTICS v_count_updated = ROW_COUNT;
        
        -- Log the results
        RAISE NOTICE 'Updated global_choice_status to % for % plan(s)', 
            p_status, v_count_updated;
            
        -- If no rows were updated, log a message
        IF v_count_updated = 0 THEN
            RAISE NOTICE 'No records found for the provided plan codes';
        END IF;
        
    -- If any error occurs, the transaction will be rolled back
    EXCEPTION WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS v_error_message = MESSAGE_TEXT;
        RAISE EXCEPTION 'Error updating global_choice_status: %', v_error_message;
    END;
END
$function$
;