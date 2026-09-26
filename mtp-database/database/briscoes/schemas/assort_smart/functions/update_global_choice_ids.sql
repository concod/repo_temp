--liquibase formatted sql
--changeset paras.jain@impactanalytics.co liquibase:update_global_style_ids_style_ids runOnChange:true  stripComments:false splitStatements:false context:MTP-109340 labels:liquibase_project_start
--comment: initial changeset for update_global_choice_ids function
--rollback: SELECT 1
DROP FUNCTION IF EXISTS assort_smart.update_global_choice_ids(jsonb, int4[]);

CREATE OR REPLACE FUNCTION assort_smart.update_global_choice_ids(p_input_data jsonb, p_plan_codes integer[])
 RETURNS void
 LANGUAGE plpgsql
AS $function$
    /*
        Function/Procedure name: assort_smart.update_global_choice_ids
        Created at: 10-Jul-2025
        No of input parameter: 2
        Parameter Description:
                $1 = p_input_data (jsonb) - JSON array containing objects with id, global_choice_id, global_style_id, global_choice_id_order, and global_style_id_order fields
                $2 = p_plan_codes (integer[]) - Array of plan codes where these IDs are present

        Purpose: This function updates the global_choice_id, global_style_id, global_choice_id_order, and global_style_id_order values
        in the line_plan_choice_launch table based on the id and corresponding fields provided in the input data.
        The function only updates records where the plan_code matches one of the values in the p_plan_codes array.

        Calling Statement:
        SELECT assort_smart.update_global_choice_ids(
            '[{"id": 1, "global_choice_id": "88-10-060 - Men__ia_char_01s Pants Linen---Global---choice_8", "global_style_id": "style_1", "global_choice_id_order": 1, "global_style_id_order": 2}]'::jsonb,
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
        CREATE TEMPORARY TABLE temp_id_mapping (
            id integer,
            global_choice_id text,
            global_style_id text,
            global_choice_id_order integer,
            global_style_id_order integer
        ) ON COMMIT DROP;

        -- Insert the data from JSON into the temp table (faster than CTE for large datasets)
        INSERT INTO temp_id_mapping
        SELECT
            (elem->>'id')::integer as id,
            elem->>'global_choice_id' as global_choice_id,
            elem->>'global_style_id' as global_style_id,
            (elem->>'global_choice_id_order')::integer as global_choice_id_order,
            (elem->>'global_style_id_order')::integer as global_style_id_order
        FROM jsonb_array_elements(p_input_data) elem;

        -- Create an index on the temp table for better join performance
        CREATE INDEX ON temp_id_mapping (id);

        -- Perform the update using the temp table
        UPDATE assort_smart.line_plan_choice_launch lpcl
        SET
            global_choice_id = tim.global_choice_id,
            global_style_id = tim.global_style_id,
            global_choice_id_order = tim.global_choice_id_order,
            global_style_id_order = tim.global_style_id_order,
            updated_at = NOW()
        FROM temp_id_mapping tim
        WHERE lpcl.id = tim.id
        AND lpcl.plan_code = ANY(p_plan_codes);

        -- Get the number of rows updated
        GET DIAGNOSTICS v_count_updated = ROW_COUNT;

        -- Log the results
        RAISE NOTICE 'Updated global_choice_id, global_style_id, global_choice_id_order & global_style_id_order for % record(s)', v_count_updated;

        -- If no rows were updated, log a message
        IF v_count_updated = 0 THEN
            RAISE NOTICE 'No records found matching the provided IDs and plan codes';
        END IF;

    -- If any error occurs, the transaction will be rolled back
    EXCEPTION WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS v_error_message = MESSAGE_TEXT;
        RAISE EXCEPTION 'Error updating global_choice_id, global_style_id, global_choice_id_order & global_style_id_order values: %', v_error_message;
    END;
END
$function$
;