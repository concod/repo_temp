--liquibase formatted sql
--changeset hemanth.cs@impactanalytics.co liquibase:insert_line_arch_status runOnChange:true  stripComments:false splitStatements:false context:MTP-75018 labels:liquibase_project_start
--comment: Update line_arch_plan_status and line_arch_final_level_status tables based on line_plan_review_target table
--rollback: SELECT 1

DROP FUNCTION IF EXISTS assort_smart.insert_line_arch_status(integer, integer);

CREATE OR REPLACE FUNCTION assort_smart.insert_line_arch_status(p_plan_code integer, p_created_by integer DEFAULT NULL::integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
    /*
        Function/Procedure name: assort_smart.insert_line_arch_status
        Created at: 17-Mar-2025
        No of input parameter: 2
        Parameter Description:
                $1 = plan_code (integer)
                $2 = created_by (integer), optional

        Purpose: This function deletes existing records and inserts new records into 
        the line_arch_plan_status table and line_arch_final_level_status table 
        based on the distinct plan_code and final_level values from the 
        line_plan_review_target table for a specific plan_code.
        
        Calling Statement:
        SELECT assort_smart.insert_line_plan_status(59);
        SELECT assort_smart.insert_line_plan_status(59, 123);
    */
DECLARE
    v_count_plan_deleted INTEGER := 0;
    v_count_level_deleted INTEGER := 0;
    v_count_plan_inserted INTEGER := 0;
    v_count_level_inserted INTEGER := 0;
BEGIN
    -- Begin transaction
    BEGIN
        -- First, delete existing records for this plan_code from line_arch_plan_status
        DELETE FROM assort_smart.line_arch_plan_status
        WHERE plan_code = p_plan_code;
        
        GET DIAGNOSTICS v_count_plan_deleted = ROW_COUNT;
        
        -- Delete existing records for this plan_code from line_arch_final_level_status
        DELETE FROM assort_smart.line_arch_final_level_status
        WHERE plan_code = p_plan_code;
        
        GET DIAGNOSTICS v_count_level_deleted = ROW_COUNT;
        
        -- Insert records into line_arch_plan_status from line_plan_review_target
        INSERT INTO assort_smart.line_arch_plan_status
            (plan_code, created_by)
        SELECT 
            lprt.plan_code,
            p_created_by
        FROM 
            assort_smart.line_plan_review_target lprt
        WHERE 
            lprt.plan_code = p_plan_code
        GROUP BY 
            lprt.plan_code;
        
        GET DIAGNOSTICS v_count_plan_inserted = ROW_COUNT;
        
        -- Insert records into line_arch_final_level_status from line_plan_review_target
        INSERT INTO assort_smart.line_arch_final_level_status
            (plan_code, final_level, created_by)
        SELECT 
            lprt.plan_code,
            lprt.final_level,
            p_created_by
        FROM 
            assort_smart.line_plan_review_target lprt
        WHERE 
            lprt.plan_code = p_plan_code
        GROUP BY 
            lprt.plan_code, lprt.final_level;
        
        GET DIAGNOSTICS v_count_level_inserted = ROW_COUNT;
        
        -- Log the results
        RAISE NOTICE 'Plan code %: Deleted % plan status records, inserted % new records', 
            p_plan_code, v_count_plan_deleted, v_count_plan_inserted;
        RAISE NOTICE 'Plan code %: Deleted % final level status records, inserted % new records', 
            p_plan_code, v_count_level_deleted, v_count_level_inserted;
        
        -- If no rows were inserted, log a message
        IF v_count_plan_inserted = 0 AND v_count_level_inserted = 0 THEN
            RAISE NOTICE 'No records found for plan_code % in line_plan_review_target table', p_plan_code;
        END IF;
        
    -- If any error occurs, the transaction will be rolled back
    EXCEPTION WHEN OTHERS THEN
        RAISE EXCEPTION 'Error processing plan_code %: %', p_plan_code, SQLERRM;
    END;
END
$function$
;
