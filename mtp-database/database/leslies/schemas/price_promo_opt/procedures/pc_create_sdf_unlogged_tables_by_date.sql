--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:pc_create_sdf_unlogged_tables_by_date runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_create_sdf_unlogged_tables_by_date

DROP PROCEDURE IF EXISTS price_promo_opt.pc_create_sdf_unlogged_tables_by_date ;
CREATE OR REPLACE PROCEDURE price_promo_opt.pc_create_sdf_unlogged_tables_by_date(IN source_table_name character varying, IN start_date date, IN end_date date)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
DECLARE
    current_date_iter date;
    dest_table_name text;
    date_suffix text;
    total_start_time timestamp;
    step_start_time timestamp;
    step_duration interval;
    table_count integer := 0;
BEGIN
    total_start_time := clock_timestamp();
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'CREATE UNLOGGED TABLES BY DATE';
    RAISE NOTICE 'Source Table: %', source_table_name;
    RAISE NOTICE 'Date Range: % to %', start_date, end_date;
    RAISE NOTICE '========================================';
    
    -- Validate date range
    IF start_date > end_date THEN
        RAISE EXCEPTION 'Start date (%) cannot be after end date (%)', start_date, end_date;
    END IF;
    
    -- Loop through each date
    current_date_iter := start_date;
    
    WHILE current_date_iter <= end_date LOOP
        step_start_time := clock_timestamp();
        
        -- Generate date suffix (YYYYMMDD format)
        date_suffix := to_char(current_date_iter, 'YYYYMMDD');
        
        -- Generate destination table name
        dest_table_name := source_table_name || '_' || date_suffix;
        
        RAISE NOTICE 'Creating table: %', dest_table_name;
        
        -- Create UNLOGGED table with date filter
        BEGIN
            EXECUTE format(
                'DROP TABLE IF EXISTS %s;  
                 CREATE UNLOGGED TABLE %s AS 
                 SELECT * FROM %s 
                 WHERE date = %L',
                dest_table_name,
                dest_table_name,
                source_table_name,
                current_date_iter
            );
            
            step_duration := clock_timestamp() - step_start_time;
            RAISE NOTICE '  ✓ Time: % seconds', EXTRACT(EPOCH FROM step_duration);
            table_count := table_count + 1;
            
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING '  ✗ Error creating table for date %: %', current_date_iter, SQLERRM;
        END;
        
        -- Move to next date
        current_date_iter := current_date_iter + interval '1 day';
    END LOOP;
    
    -- Summary
    step_duration := clock_timestamp() - total_start_time;
    RAISE NOTICE 'Total tables created: %', table_count;
    RAISE NOTICE 'Total time: % seconds', EXTRACT(EPOCH FROM step_duration);
    
END;
$procedure$
;
