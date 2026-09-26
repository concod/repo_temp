--liquibase formatted sql
--changeset abhilash.kirtikumar@impactanalytics.co liquibase:apply_constraint_add_st_receipts_added_total_inv_units_tb runOnChange:true  stripComments:false splitStatements:false context:MTP-96027 labels:liquibase_add_st_receipts_added_total_inv_units_tb
--comment: added st and receipts column added_total_inv_units for tb
--rollback: SELECT 1
DROP FUNCTION IF EXISTS assort_smart.apply_constraint(jsonb, integer[]);

CREATE OR REPLACE FUNCTION assort_smart.apply_constraint(p_input_data jsonb, p_plan_codes integer[])
 RETURNS void
 LANGUAGE plpgsql
AS $function$
    /*
        Function/Procedure name: assort_smart.apply_constraint
        Created at: 08-Aug-2025
        No of input parameter: 2
        Parameter Description:
                $1 = p_input_data (jsonb) - JSON array containing objects with id and receipts_units and below_moq_flag.
                $2 = p_plan_codes (integer[]) - Array of plan codes where these IDs are present

        Purpose: This function updates the receipts_units and below_moq_flag values in the line_plan_choice_launch table
        based on the id and receipts_units and below_moq_flag pairs provided in the input data. The function only updates
        records where the plan_code matches one of the values in the p_plan_codes array.
        
        Calling Statement:
        SELECT assort_smart.apply_constraint(
            (789, 1, '{"season": 340, "lifecycle": 340.12, "season_reco": 340.12, "lifecycle_reco": 340.12}')
            ARRAY[5]
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
            id INTEGER,
            below_moq_flag SMALLINT,
            receipt_units JSONB,
            flow_cluster_perc FLOAT8,
            receipts JSONB,
            st JSONB,
            total_inv_units JSONB
        ) ON COMMIT DROP;
        
        -- Insert the data from JSON into the temp table (faster than CTE for large datasets)
        INSERT INTO temp_id_mapping
        SELECT 
            (elem->>'id')::integer as id,
            (elem->>'below_moq_flag')::smallint as below_moq_flag,
            (elem->>'receipt_units')::jsonb as receipt_units,
            (elem->>'flow_cluster_perc')::float8 AS flow_cluster_perc,
            (elem->>'receipts')::jsonb as receipts,
            (elem->>'st')::jsonb as st,
            (elem->>'total_inv_units')::jsonb as total_inv_units
        FROM jsonb_array_elements(p_input_data) elem;
        
        -- Create an index on the temp table for better join performance
        CREATE INDEX ON temp_id_mapping (id);
        
        -- Perform the update using the temp table
        UPDATE assort_smart.line_plan_choice_launch lpcl
        SET 
            below_moq_flag = tim.below_moq_flag,
            receipt_units = tim.receipt_units,
            flow_cluster_perc = tim.flow_cluster_perc,
            receipts = tim.receipts,
            st = tim.st,
            total_inv_units = tim.total_inv_units,
            updated_at = NOW()
        FROM temp_id_mapping tim
        WHERE lpcl.id = tim.id
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