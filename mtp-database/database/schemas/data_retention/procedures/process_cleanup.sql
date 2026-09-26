--liquibase formatted sql
--changeset srinivasgowda.sg@impactanalytics.co:process_cleanup runOnChange:true stripComments:false splitStatements:false context:process_cleanup labels:liquibase_project_start
--comment: Create stored procedure for process_cleanup

DROP PROCEDURE IF EXISTS data_retention.process_cleanup();

CREATE OR REPLACE procedure  data_retention.process_cleanup()
LANGUAGE plpgsql
AS $procedure$
DECLARE
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'data_retention.process_cleanup';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
    rec RECORD;
    table_exists BOOLEAN;
    cold_storage_table TEXT;
    col_info RECORD;
    col_defs TEXT;
    create_table_sql TEXT;
    insert_sql TEXT;
    delete_sql TEXT;
    affected_count INT;
    full_data_type TEXT;
    timestamp_suffix TEXT;
BEGIN
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
    
    FOR rec IN
        SELECT * FROM data_retention.cleanup_policies
        ORDER BY sl_no
    LOOP
        RAISE NOTICE 'Processing cleanup policy for: %.%', rec.schema_name, rec.table_name;
        -- check the existence of the table 
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.tables  
            WHERE table_schema = rec.schema_name
            AND table_name = rec.table_name
        ) THEN 
            RAISE NOTICE 'Table %.% does not exist, skipping', rec.schema_name, rec.table_name;
            CONTINUE;
        END IF;
          -- run for cold storage       
        IF rec.cleanup_strategy = 'Cold Storage' THEN
            ------------- timestamp -------------------
            timestamp_suffix := to_char(current_timestamp, 'YYYYMMDD_HH24MISS');
            cold_storage_table := 'data_retention.' || rec.table_name || '_' || timestamp_suffix;
            
            -- Get column def from the table
            col_defs := '';
            
            FOR col_info IN
                SELECT column_name, data_type, udt_name, character_maximum_length, 
                       numeric_precision, numeric_scale, is_nullable
                FROM information_schema.columns
                WHERE table_schema = rec.schema_name
                AND table_name = rec.table_name
                ORDER BY ordinal_position
            LOOP
                IF col_defs <> '' THEN
                    col_defs := col_defs || ', ';
                END IF;
                
                -- Handle data type properly, including arrays
                SELECT format_type(a.atttypid, a.atttypmod) INTO full_data_type
                FROM pg_catalog.pg_attribute a
                JOIN pg_catalog.pg_class c ON a.attrelid = c.oid
                JOIN pg_catalog.pg_namespace n ON c.relnamespace = n.oid
                WHERE n.nspname = rec.schema_name
                AND c.relname = rec.table_name
                AND a.attname = col_info.column_name
                AND a.attnum > 0
                AND NOT a.attisdropped;
                                
                col_defs := col_defs || 
                            quote_ident(col_info.column_name) || ' ' || 
                            full_data_type || ' ' ||
                            CASE WHEN col_info.is_nullable = 'NO' 
                                 THEN 'NOT NULL' 
                                 ELSE 'NULL' 
                            END;
            END LOOP;
            
            create_table_sql := 'CREATE TABLE ' || cold_storage_table || ' (' || col_defs || ')';
            EXECUTE create_table_sql;
            
            insert_sql := 'INSERT INTO ' || cold_storage_table || 
                          ' SELECT * FROM ' || quote_ident(rec.schema_name) || '.' || 
                          quote_ident(rec.table_name) || 
                          ' WHERE ' || rec.cleanup_condition;
            EXECUTE insert_sql;
            
            delete_sql := 'DELETE FROM ' || quote_ident(rec.schema_name) || '.' || 
                          quote_ident(rec.table_name) || 
                          ' WHERE ' || rec.cleanup_condition;
               EXECUTE delete_sql;
           
        ELSIF rec.cleanup_strategy = 'Data Purging' THEN
            delete_sql := 'DELETE FROM ' || quote_ident(rec.schema_name) || '.' || 
                          quote_ident(rec.table_name) || 
                          ' WHERE ' || rec.cleanup_condition;
               EXECUTE delete_sql;
       
        ELSE
            RAISE NOTICE 'Unknown cleanup strategy: %, skipping', rec.cleanup_strategy;
            CONTINUE;
        END IF;
        
        UPDATE data_retention.cleanup_policies
        SET last_cleanup_time = NOW()
        WHERE schema_name = rec.schema_name 
        AND table_name = rec.table_name;        
        RAISE NOTICE 'Completed processing for table: %.%', rec.schema_name, rec.table_name;
    END LOOP;
    
    RAISE NOTICE 'Data retention cleanup process completed';
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
END;
$procedure$; 