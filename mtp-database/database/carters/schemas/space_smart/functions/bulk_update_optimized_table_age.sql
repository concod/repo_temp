--liquibase formatted sql
--changeset paras.jain@impactanalytics.co:Adding_exceute runOnChange:true stripComments:false splitStatements:false context:Adding_exceute labels:liquibase_project_start
--comment: Adding_exceute
--rollback: SELECT 1


DROP FUNCTION IF EXISTS space_smart.bulk_update_optimized_table_age(jsonb);

CREATE OR REPLACE FUNCTION space_smart.bulk_update_optimized_table_age(json_data jsonb)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
/*
 * Function: bulk_update_optimized_table_age
 * -----------------------------------------
 * Description:
 * This function performs bulk updates on an optimized table based on the provided JSONB data.
 * It processes the JSON array and updates rows in the table using the WHERE clause based on
 * matching conditions.
 *
 * Parameters:
 * - json_data: A JSONB array where each element is a JSON object representing a record to be
 *   updated in the target table.
 */
DECLARE
    record JSONB; -- Declare record as JSONB to hold each element from the JSON array
    where_clause TEXT; -- Declare a variable to store the WHERE clause dynamically
	query TEXT;
BEGIN
    -- Loop through each record in the JSON array
    FOR record IN SELECT jsonb_array_elements(json_data)
    LOOP
        -- Determine the appropriate WHERE clause based on 'last_optimizer' key
        IF (record->>'last_optimize')::BOOLEAN IS TRUE THEN
            where_clause := format(
                'store_number = %L AND l4_name = %L AND season = %L',
                (record->>'store_number'),
                (record->>'l4_name'),
                (record->>'season')
            );
        ELSE
            where_clause := format(
                'store_number = %L AND cloud_task_id = %L AND  l4_name = %L AND season = %L',
                (record->>'store_number'),
                (record->>'cloud_task_id'),
                (record->>'l4_name'),
                (record->>'season')
            );
        END IF;

        -- Execute the update query with the dynamically constructed WHERE clause
        query := format(
            'UPDATE ' || (record->>'table_name')::TEXT || ' SET
                sellable_sqft = COALESCE(%L, sellable_sqft),
                forecasted_units = COALESCE(%L, forecasted_units),
                sales = COALESCE(%L, sales),
                gm = COALESCE(%L, gm),
                store_parent_block = COALESCE(%L, store_parent_block),
                parent_block = COALESCE(%L, parent_block),
                optimized_min_cc = COALESCE(%L, optimized_min_cc),
                optimized_max_cc = COALESCE(%L, optimized_max_cc),
                store_group = COALESCE(%L, store_group),
                updated_at = (CURRENT_TIMESTAMP AT TIME ZONE ''Asia/Kolkata''),
                last_optimized = (CURRENT_TIMESTAMP AT TIME ZONE ''Asia/Kolkata''),
                last_optimized_by = COALESCE(%L, last_optimized_by),
                space_elasticity = COALESCE(%L, space_elasticity)
            WHERE ' || where_clause,
            (record->>'sellable_sqft')::FLOAT,
            (record->>'forecasted_units')::FLOAT,
            (record->>'sales')::FLOAT,
            (record->>'gm')::FLOAT,
            (record->>'store_parent_block')::TEXT,
            (record->>'parent_block')::TEXT,
            (record->>'optimized_min_cc')::FLOAT,
            (record->>'optimized_max_cc')::FLOAT,
            (record->>'store_group')::TEXT,
            (record->>'last_optimized_by')::TEXT,
            (record->>'space_elasticity')::text,
            where_clause
        );
        EXECUTE query;
    END LOOP;
--	RAISE NOTICE 'Executing query: %', query;

    -- Optional: Print a notice indicating the function completion
    RAISE NOTICE 'Bulk update operation completed.';
END;
$function$
;
