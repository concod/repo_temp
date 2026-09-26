--liquibase formatted sql
--changeset hemanth.cs@impactanalytics.co liquibase:insert_line_arch_status runOnChange:true  stripComments:false splitStatements:false context:MTP-75018 labels:liquibase_project_start
--comment: Update line_arch_plan_status and line_arch_final_level_status tables based on line_plan_review_target table
--rollback: SELECT 1

DROP FUNCTION IF EXISTS assort_smart.update_line_arch_status(integer[], text, boolean, text[], integer);
CREATE OR REPLACE FUNCTION assort_smart.update_line_arch_status(
    p_plan_codes integer[], 
    p_status text, 
    p_plan_level_only boolean DEFAULT false, 
    p_final_levels text[] DEFAULT NULL::text[],
    p_created_by integer DEFAULT NULL
) RETURNS void
 LANGUAGE plpgsql
AS $function$
    /*
        Function/Procedure name: assort_smart.update_line_arch_status
        Created at: 17-Mar-2025
        No of input parameter: 5
        Parameter Description:
                $1 = plan_codes (integer array) - Array of plan codes to process
                $2 = status (text) - Status to set ('In Progress', 'Completed', or 'failed')
                $3 = plan_level_only (boolean) - When true, only update plan status (default: false)
                $4 = final_levels (text array) - Array of final levels to update (optional when plan_level_only=true)
                $5 = created_by (integer) - User ID who created the update (optional)

        Purpose: This function updates status values in line_arch_final_level_status and 
        conditionally updates line_arch_plan_status based on the given status value.
        When status is 'Completed' or 'failed', the function also checks if all final levels 
        for a plan code share the same status, and updates the plan status accordingly.
        When plan_level_only is true, only updates plan status from 'Not Started' to 'In Progress'.
        
        Calling Statement:
        SELECT assort_smart.update_line_arch_status(ARRAY[59, 60], 'In Progress', false, ARRAY['level1', 'level2'], 1);
        SELECT assort_smart.update_line_arch_status('{59, 60}'::int4[], 'Completed', false, ARRAY['level1', 'level2'], 1);
        SELECT assort_smart.update_line_arch_status('{59}'::int4[], 'Failed', false, '{CORE DENIM}'::text[], 1);
        SELECT assort_smart.update_line_arch_status('{59}'::int4[], 'In Progress', true, NULL, 1);
    */
DECLARE
    v_count_updated INTEGER := 0;
    v_count_plan_updated INTEGER := 0;
    v_plan_code int4;
    v_normalized_status text;
    v_current_time timestamptz;
BEGIN
    -- Print current time for debugging
    v_current_time := now();
    RAISE NOTICE 'Current timestamp: %', v_current_time;
    RAISE NOTICE 'Created by: %', COALESCE(p_created_by::text, 'NULL');
    
    -- Normalize the status value to handle case-insensitivity
    IF UPPER(p_status) = 'IN PROGRESS' THEN
        v_normalized_status := 'In Progress';
    ELSIF UPPER(p_status) = 'COMPLETED' THEN
        v_normalized_status := 'Completed';
    ELSIF UPPER(p_status) = 'FAILED' THEN
        v_normalized_status := 'failed';
    ELSE
        v_normalized_status := p_status;
    END IF;

    -- Begin transaction
    BEGIN
        -- Handle plan_level_only case
        IF p_plan_level_only = true THEN
            IF UPPER(v_normalized_status) <> 'IN PROGRESS' THEN
                RAISE EXCEPTION 'When plan_level_only is true, status must be In Progress';
            END IF;
            
            -- Only update the plan status from 'Not Started' to 'In Progress'
            UPDATE assort_smart.line_arch_plan_status
            SET status = 'In Progress',
                updated_at = v_current_time,
                created_by = COALESCE(p_created_by, created_by)
            WHERE plan_code = ANY(p_plan_codes)
            AND UPPER(status) = 'NOT STARTED';
            
            GET DIAGNOSTICS v_count_plan_updated = ROW_COUNT;
            
            RAISE NOTICE 'Updated % plan status records from Not Started to In Progress with timestamp %', 
                         v_count_plan_updated, v_current_time;
            
            -- Log individual plan codes that were processed
            FOREACH v_plan_code IN ARRAY p_plan_codes
            LOOP
                RAISE NOTICE 'Processed plan_code: %', v_plan_code;
            END LOOP;
            
            -- Exit the function early
            RETURN;
        END IF;
        
        -- Validate parameters for non-plan_level_only mode
        IF p_final_levels IS NULL OR array_length(p_final_levels, 1) IS NULL THEN
            RAISE EXCEPTION 'final_levels parameter is required when plan_level_only is false';
        END IF;
        
        -- Step 1: Update the status in line_arch_final_level_status for given plan_codes and final_levels
        UPDATE assort_smart.line_arch_final_level_status
        SET status = v_normalized_status,
            updated_at = v_current_time,
            created_by = COALESCE(p_created_by, created_by)
        WHERE plan_code = ANY(p_plan_codes) 
        AND final_level = ANY(p_final_levels);
        
        GET DIAGNOSTICS v_count_updated = ROW_COUNT;
        RAISE NOTICE 'Updated final_level_status records with timestamp %', v_current_time;
        
        -- For 'Completed' status
        IF UPPER(v_normalized_status) = 'COMPLETED' THEN
            -- For each plan_code, check if all final_levels are 'Completed'
            -- If yes, update the plan status to 'Completed'
            UPDATE assort_smart.line_arch_plan_status
            SET status = 'Completed',
                updated_at = v_current_time,
                created_by = COALESCE(p_created_by, created_by)
            WHERE plan_code = ANY(p_plan_codes)
            AND NOT EXISTS (
                SELECT 1
                FROM assort_smart.line_arch_final_level_status
                WHERE plan_code = line_arch_plan_status.plan_code
                AND UPPER(status) <> 'COMPLETED'
            );
            
            GET DIAGNOSTICS v_count_plan_updated = ROW_COUNT;
            RAISE NOTICE 'Updated plan_status records to Completed with timestamp %', v_current_time;
        
        -- For 'failed' status
        ELSIF UPPER(v_normalized_status) = 'FAILED' THEN
            -- For each plan_code, check if all final_levels are 'failed'
            -- If yes, update the plan status to 'failed'
            UPDATE assort_smart.line_arch_plan_status
            SET status = 'failed',
                updated_at = v_current_time,
                created_by = COALESCE(p_created_by, created_by)
            WHERE plan_code = ANY(p_plan_codes)
            AND NOT EXISTS (
                SELECT 1
                FROM assort_smart.line_arch_final_level_status
                WHERE plan_code = line_arch_plan_status.plan_code
                AND UPPER(status) <> 'FAILED'
            );
            
            GET DIAGNOSTICS v_count_plan_updated = ROW_COUNT;
            RAISE NOTICE 'Updated plan_status records to failed with timestamp %', v_current_time;
        
        -- 'In Progress' status only updates the final_level_status table, which is already done above
        END IF;
        
        -- Log the results
        RAISE NOTICE 'Updated % final level status records with status: %', v_count_updated, v_normalized_status;
        
        IF UPPER(v_normalized_status) IN ('COMPLETED', 'FAILED') THEN
            RAISE NOTICE 'Updated % plan status records to %', v_count_plan_updated, v_normalized_status;
        END IF;
        
        -- If no rows were updated, log a message
        IF v_count_updated = 0 THEN
            RAISE NOTICE 'No matching records found for plan_codes % and final_levels %', 
                p_plan_codes, p_final_levels;
        END IF;
        
        -- Log individual plan codes that were processed
        FOREACH v_plan_code IN ARRAY p_plan_codes
        LOOP
            RAISE NOTICE 'Processed plan_code: %', v_plan_code;
        END LOOP;
        
    -- If any error occurs, the transaction will be rolled back
    EXCEPTION WHEN OTHERS THEN
        RAISE EXCEPTION 'Error updating status for plan_codes % and final_levels %: %', 
            p_plan_codes, p_final_levels, SQLERRM;
    END;
END
$function$
;