--liquibase formatted sql
--changeset kumar.shubham@impactanalytics.co:remove_gender_column runOnChange:true stripComments:false splitStatements:false context:remove_gender_column labels:liquibase_project_start
--comment: optimize the execution 
--rollback: SELECT 1

DROP FUNCTION IF EXISTS space_smart.bulk_update_optimized_table(jsonb);

CREATE OR REPLACE FUNCTION space_smart.bulk_update_optimized_table(json_data jsonb)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
/*
 * Function: bulk_update_optimized_table
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
    table_name text;
    batch_size int := 10000; -- Process 10K records at a time
    total_records int;
    batch_number int := 0;
    max_batch int;
    current_batch_tables text[];
    update_query text;
BEGIN
    -- Create temporary table
    CREATE TEMP TABLE temp_record_data (
        row_id SERIAL,
        table_name text,
        store_number text,
        cloud_task_id text,
        l3_name text,
        l4_name text,
        l5_name text,
        season text,
        sellable_sqft float,
        forecasted_units float,
        sales float,
        gm float,
        store_parent_block text,
        parent_block text,
        optimized_min_cc float,
        optimized_max_cc float,
        store_group text,
        last_optimized_by text,
        space_elasticity text,
        is_last_optimize boolean,
        batch_number int -- Add batch number column
    );
    
    -- Load all data into temp table and assign batch numbers
    INSERT INTO temp_record_data(
        table_name, store_number, cloud_task_id, l3_name, l4_name, l5_name, 
        season, sellable_sqft, forecasted_units, sales, gm, store_parent_block, 
        parent_block, optimized_min_cc, optimized_max_cc, store_group, 
        last_optimized_by, space_elasticity, is_last_optimize, batch_number
    )
    SELECT 
        x.rec->>'table_name',
        x.rec->>'store_number',
        x.rec->>'cloud_task_id',
        x.rec->>'l3_name',
        x.rec->>'l4_name',
        x.rec->>'l5_name',
        x.rec->>'season',
        (x.rec->>'sellable_sqft')::FLOAT,
        (x.rec->>'forecasted_units')::FLOAT,
        (x.rec->>'sales')::FLOAT,
        (x.rec->>'gm')::FLOAT,
        x.rec->>'store_parent_block',
        x.rec->>'parent_block',
        (x.rec->>'optimized_min_cc')::FLOAT,
        (x.rec->>'optimized_max_cc')::FLOAT,
        x.rec->>'store_group',
        x.rec->>'last_optimized_by',
        (x.rec->>'space_elasticity')::TEXT,
        x.rec ? 'last_optimize' AND (x.rec->>'last_optimize')::BOOLEAN = TRUE,
        (row_number() OVER()) / batch_size -- Pre-assign batch numbers
    FROM jsonb_array_elements(json_data) AS x(rec);
    
    -- Create indexes for performance
    CREATE INDEX idx_temp_batch_table ON temp_record_data(batch_number, table_name);
    CREATE INDEX idx_temp_join_fields ON temp_record_data(store_number, l3_name, l4_name, l5_name, season);
    CREATE INDEX idx_temp_join_fields_t ON temp_record_data(store_number, l3_name, l4_name, l5_name, season,cloud_task_id);
    
    -- Find the maximum batch number
    SELECT MAX(batch_number) INTO max_batch FROM temp_record_data;
    
    -- Outer loop: iterate through all batches
    FOR batch_number IN 0..max_batch LOOP
        -- Get distinct table names in this batch
        SELECT ARRAY_AGG(DISTINCT table_name) 
        INTO current_batch_tables 
        FROM temp_record_data 
        WHERE batch_number = batch_number 
        AND table_name IS NOT NULL;
        
        -- Skip if no tables in this batch
        CONTINUE WHEN current_batch_tables IS NULL;
        
        -- Inner loop: process each table in the current batch
        FOREACH table_name IN ARRAY current_batch_tables LOOP
            -- For each table in this batch, build and execute the update query
            update_query := format(
                'UPDATE %I t
                SET 
                    sellable_sqft = COALESCE(u.sellable_sqft, t.sellable_sqft),
                    forecasted_units = COALESCE(u.forecasted_units, t.forecasted_units),
                    sales = COALESCE(u.sales, t.sales),
                    gm = COALESCE(u.gm, t.gm),
                    store_parent_block = COALESCE(u.store_parent_block, t.store_parent_block),
                    parent_block = COALESCE(u.parent_block, t.parent_block),
                    optimized_min_cc = COALESCE(u.optimized_min_cc, t.optimized_min_cc),
                    optimized_max_cc = COALESCE(u.optimized_max_cc, t.optimized_max_cc),
                    store_group = COALESCE(u.store_group, t.store_group),
                    updated_at = (CURRENT_TIMESTAMP AT TIME ZONE ''Asia/Kolkata''),
                    last_optimized = (CURRENT_TIMESTAMP AT TIME ZONE ''Asia/Kolkata''),
                    last_optimized_by = COALESCE(u.last_optimized_by, t.last_optimized_by),
                    space_elasticity = COALESCE(u.space_elasticity, t.space_elasticity)
                FROM (
                    SELECT * FROM temp_record_data u
                    WHERE u.table_name = %L
                    AND u.batch_number = %s
                ) u
                WHERE 
                    t.store_number = u.store_number AND
                    t.l3_name = u.l3_name AND
                    t.l4_name = u.l4_name AND
                    t.l5_name = u.l5_name AND
                    t.season = u.season AND
                    (
                        u.is_last_optimize OR 
                        (NOT u.is_last_optimize AND t.cloud_task_id = u.cloud_task_id)
                    )',
                table_name, table_name, batch_number
            );
            
            -- Execute the update for this table in the current batch
            EXECUTE update_query;
        END LOOP;
    END LOOP;
    
    -- Clean up
    DROP TABLE temp_record_data;
    
EXCEPTION WHEN OTHERS THEN
    -- Clean up temp table in case of errors
    DROP TABLE IF EXISTS temp_record_data;
    RAISE;
END;
$function$;