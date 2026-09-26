--liquibase formatted sql
--changeset abhilash.kirtikumar@impactanalytics.co liquibase:created_new_sp_to_upload_in_lpcl_delivey_table_changed_file_type runOnChange:true  stripComments:false splitStatements:false context:MTP-96027 labels:liquibase_lpcl_delivery_new_sp__changed_file_type_briscoes
--comment: new sp to upload data in lpcl_delivery_sql_type
--rollback: SELECT 1
DROP FUNCTION IF EXISTS assort_smart.apply_constraint_line_review_delivery(jsonb, integer[]);

CREATE OR REPLACE FUNCTION assort_smart.apply_constraint_line_review_delivery(p_input_data jsonb, p_plan_codes integer[])
 RETURNS void
 LANGUAGE plpgsql
AS $function$
    /*
        Function/Procedure name: assort_smart.apply_constraint_line_review_delivery
        Created at: 12-Aug-2025
        No of input parameter: 2
        Parameter Description:
                $1 = p_input_data (jsonb) - JSON array containing objects with id and receipts_units
                $2 = p_plan_codes (integer[]) - Array of plan codes where these IDs are present

        Purpose: This function updates the receipts_units  values in the line_arch_store_week table
        based on the id and receipts_units pairs provided in the input data. The function only updates
        records where the plan_code matches one of the values in the p_plan_codes array.
        
        Calling Statement:
        SELECT assort_smart.apply_constraint_line_review_delivery(
            (789, 340.12')
        );
    */
DECLARE
    v_count_updated INTEGER := 0;
    v_error_message TEXT;
BEGIN
    -- Begin transaction
    BEGIN
        -- Input validation
        IF p_input_data IS NULL OR jsonb_array_length(p_input_data) = 0 THEN
            RAISE EXCEPTION 'Input data cannot be empty or null';
        END IF;
        
        IF p_plan_codes IS NULL OR array_length(p_plan_codes, 1) IS NULL THEN
            RAISE EXCEPTION 'Plan codes array cannot be empty or null';
        END IF;

        -- Create a temporary table for better performance with large datasets
        CREATE TEMP TABLE temp_id_mapping (
            plan_choice_launch_delivery_id INTEGER,
            receipt_units FLOAT8,
            receipts FLOAT8
        ) ON COMMIT DROP;
        
        -- Insert the data from JSON into the temp table (faster than CTE for large datasets)
        INSERT INTO temp_id_mapping
        SELECT 
            (elem->>'plan_choice_launch_delivery_id')::integer as plan_choice_launch_delivery_id,
            (elem->'receipt_units')::float8 as receipt_units,
            (elem->'receipts')::float8 as receipts
        FROM jsonb_array_elements(p_input_data) elem;
        
        -- Create an index on the temp table for better join performance
        CREATE INDEX ON temp_id_mapping (plan_choice_launch_delivery_id);
        
        -- Perform the update using the temp table
        UPDATE assort_smart.line_plan_choice_launch_delivery lpcl
        SET 
            receipt_units = tim.receipt_units,
            receipts = tim.receipts,
            updated_at = NOW()
        FROM temp_id_mapping tim
        WHERE lpcl.plan_choice_launch_delivery_id = tim.plan_choice_launch_delivery_id
        AND lpcl.plan_code = ANY(p_plan_codes);
        
        -- Get the number of rows updated
        GET DIAGNOSTICS v_count_updated = ROW_COUNT;
        
        -- Log the results
        RAISE NOTICE 'Updated id for % record(s)', v_count_updated;
            
        -- If no rows were updated, log a message
        IF v_count_updated = 0 THEN
            RAISE NOTICE 'No records found matching the provided IDs and plan codes';
        END IF;
        
    -- If any error occurs, the transaction will be rolled back
    EXCEPTION WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS v_error_message = MESSAGE_TEXT;
        RAISE EXCEPTION 'Error updating id values: %', v_error_message;
    END;
END
$function$
;
