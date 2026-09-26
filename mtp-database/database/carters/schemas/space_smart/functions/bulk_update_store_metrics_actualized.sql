--liquibase formatted sql
--changeset paras.jain@impactanalytics.co:Creating SP to insert bulk data in store_metrics_actualized runOnChange:true stripComments:false splitStatements:false context:MTP-62961 labels:liquibase_project_start
--comment: MTP-62961 Creating SP to insert bulk data in store_metrics_actualized
--rollback: SELECT 1

DROP FUNCTION  IF Exists space_smart.bulk_update_store_metrics_actualized(jsonb);

CREATE OR REPLACE FUNCTION space_smart.bulk_update_store_metrics_actualized(json_data jsonb)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
/*
 * Function: store_metrics_actualized
 * -----------------------------------------
 * Description:
 * This function performs bulk updates or inserts into the 'space_smart.store_metrics_actualized' table
 * based on the provided JSONB data. It handles conflicts by updating existing rows that match
 * the specified unique constraints.
 * store_number  season l4_name   gender         l3_name        l5_name
 * Parameters:
 * - json_data: A JSONB array where each element is a JSON object representing a record to be
 *   inserted or updated in the 'space_smart.store_metrics_actualized' table.
 *
 * Example JSON Input:
 * [
 *   {
 *     "store_number": "0855",
 *     "season": "ACCESSORIES",
 *     "l4_name": "USA",
 *     "gender": "UNDERWEAR",
 *     "l3_name": "KIDS",
 *     "l5_name": "GIRL",
 *     "forecasted_units": "12.1231",
 *     "sales": "157.00",
 *     "gm": "120.65",
 *     "sellable_sqft": "1.6113",
 *     "optimized_min_cc": "21.4834",
 *     "optimized_max_cc": "40.2813",
 *     "store_parent_block": "M-M-M",
 *     "parent_block": "M",
 *     "actualized_cc": "1"
 *   }
 * ]
 *
 * The function processes the JSON data in bulk and uses the 'ON CONFLICT' clause to handle
 * existing records. If a record with the same unique constraint exists, it is updated with
 * the new values from the JSON data.
 *
 * Note:
 * - 'ON CONFLICT' clause uses the unique constraints specified on the 'space_smart.store_metrics_actualized'
 *   table to detect conflicts.
 *
 * Exceptions:
 * - If the JSONB data is malformed or if any data type conversions fail, the function will raise
 *   an error.
 */
BEGIN
    -- Insert or update records in the space_smart.space_constraints table
    INSERT INTO space_smart.store_metrics_actualized_temp (
        store_number, season, l4_name, gender, l3_name, l5_name,
        forecasted_units, sales, gm, sellable_sqft,optimized_min_cc,optimized_max_cc,
        store_parent_block, parent_block, actualized_cc
    )
    SELECT
        record->>'store_number' AS store_number,
        record->>'season' AS season,
        record->>'l4_name' AS l4_name,
        record->>'gender' AS gender,
        record->>'l3_name' AS l3_name,
        record->>'l5_name' AS l5_name,
		(COALESCE(NULLIF(record->>'forecasted_units', '')::FLOAT, NULL)) AS forecasted_units,
		(COALESCE(NULLIF(record->>'sales', '')::FLOAT, NULL)) AS sales,
		(COALESCE(NULLIF(record->>'gm', '')::FLOAT, NULL)) AS gm,
		(COALESCE(NULLIF(record->>'sellable_sqft', '')::FLOAT, NULL)) AS sellable_sqft,
        --(record->>'sellable_sqft_min')::FLOAT AS sellable_sqft_min,
        --(record->>'sellable_sqft_max')::FLOAT AS sellable_sqft_max,
		(COALESCE(NULLIF(record->>'optimized_min_cc', '')::FLOAT, NULL)) AS optimized_min_cc,
		(COALESCE(NULLIF(record->>'optimized_max_cc', '')::FLOAT, NULL)) AS optimized_max_cc,
        record->>'store_parent_block' AS store_parent_block,
        record->>'parent_block' AS parent_block,
        (record->>'actualized_cc')::INT AS actualized_cc
    FROM jsonb_array_elements(json_data) AS record
    ON CONFLICT (store_number, l3_name, l5_name, l4_name, gender, season)
    DO UPDATE SET
        forecasted_units = EXCLUDED.forecasted_units,
        sales = EXCLUDED.sales,
        gm = EXCLUDED.gm,
        sellable_sqft = EXCLUDED.sellable_sqft,
        optimized_min_cc = EXCLUDED.optimized_min_cc,
        optimized_max_cc = EXCLUDED.optimized_max_cc,
        store_parent_block = EXCLUDED.store_parent_block,
        parent_block = EXCLUDED.parent_block,
		actualized_cc = EXCLUDED.actualized_cc;


    -- Optional: Print a notice indicating the function completion
    RAISE NOTICE 'Bulk update operation completed.';
END;
$function$
;
