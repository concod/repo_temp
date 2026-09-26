--liquibase formatted sql
--changeset rishabh.kumar@impactanalytics.co:dynamic_column_names_updated runOnChange:true stripComments:false splitStatements:false context:MTP-56800 labels:liquibase_project_start
--comment: Add function to update space constraint data
--rollback: SELECT 1

DROP FUNCTION IF Exists space_smart.last_optimizer_store(jsonb);

CREATE OR REPLACE FUNCTION space_smart.bulk_update_space_constraints(json_data jsonb)
RETURNS void
LANGUAGE plpgsql
AS $function$
/*
 * Function: bulk_update_space_constraints
 * -----------------------------------------
 * Description:
 * This function performs bulk updates or inserts into the 'space_smart.space_constraints' table
 * based on the provided JSONB data. It handles conflicts by updating existing rows that match
 * the specified unique constraints.
 *
 * Parameters:
 * - json_data: A JSONB array where each element is a JSON object representing a record to be
 *   inserted or updated in the 'space_smart.space_constraints' table.
 *
 * Example JSON Input:
 * [
 *   {
 *     "store_code": "0855",
 *     "l3_name": "ACCESSORIES",
 *     "l0_name": "USA",
 *     "l5_name": "UNDERWEAR",
 *     "l4_name": "KIDS",
 *     "gender": "GIRL",
 *     "parent_block_min": "L",
 *     "parent_block_max": "XL",
 *     "ml_min": "0.8593",
 *     "ml_max": "1.6113",
 *     "sellable_sqft_min": "21.4834",
 *     "sellable_sqft_max": "40.2813",
 *     "sq_ft_control": "Fixed",
 *     "sq_ft_fixed": "13ft",
 *     "season_code": "31"
 *   }
 * ]
 *
 * The function processes the JSON data in bulk and uses the 'ON CONFLICT' clause to handle
 * existing records. If a record with the same unique constraint exists, it is updated with
 * the new values from the JSON data.
 *
 * Note:
 * - 'ON CONFLICT' clause uses the unique constraints specified on the 'space_smart.space_constraints'
 *   table to detect conflicts.
 *
 * Exceptions:
 * - If the JSONB data is malformed or if any data type conversions fail, the function will raise
 *   an error.
 */
BEGIN
    -- Insert or update records in the space_smart.space_constraints table
    INSERT INTO space_smart.space_constraints (
        store_code, l3_name, l0_name, l5_name, l4_name, gender,
        parent_block_min, parent_block_max, ml_min, ml_max,
        sellable_sqft_min, sellable_sqft_max, sq_ft_control, sq_ft_fixed, season_code
    )
    SELECT
        record->>'store_code' AS store_code,
        record->>'l3_name' AS l3_name,
        record->>'l0_name' AS l0_name,
        record->>'l5_name' AS l5_name,
        record->>'l4_name' AS l4_name,
        record->>'gender' AS gender,
        record->>'parent_block_min' AS parent_block_min,
        record->>'parent_block_max' AS parent_block_max,
        record->>'ml_min' AS ml_min,
        record->>'ml_max' AS ml_max,
        (record->>'sellable_sqft_min')::FLOAT AS sellable_sqft_min,
        (record->>'sellable_sqft_max')::FLOAT AS sellable_sqft_max,
        record->>'sq_ft_control' AS sq_ft_control,
        record->>'sq_ft_fixed' AS sq_ft_fixed,
        (record->>'season_code')::INT AS season_code
    FROM jsonb_array_elements(json_data) AS record
    ON CONFLICT (store_code, l3_name, l0_name, l5_name, l4_name, gender, season_code)
    DO UPDATE SET
        parent_block_min = EXCLUDED.parent_block_min,
        parent_block_max = EXCLUDED.parent_block_max,
        ml_min = EXCLUDED.ml_min,
        ml_max = EXCLUDED.ml_max,
        sellable_sqft_min = EXCLUDED.sellable_sqft_min,
        sellable_sqft_max = EXCLUDED.sellable_sqft_max,
        sq_ft_control = EXCLUDED.sq_ft_control,
        sq_ft_fixed = EXCLUDED.sq_ft_fixed;
        
END;
$function$;
