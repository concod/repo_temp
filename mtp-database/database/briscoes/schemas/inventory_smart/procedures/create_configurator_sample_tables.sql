--liquibase formatted sql
--changeset rajan.sahu@impactanalytics.co:Dynamic table creation for configurator sample calculations runOnChange:true stripComments:false splitStatements:false context:MTP-119036 commit labels:MTP-119036
--comment: MTP-119036-dynamic_table_creation_for_configurator_sample_calculations
--rollback: SELECT 1

drop PROCEDURE if exists  inventory_smart.create_configurator_sample_tables( JSON);

CREATE OR REPLACE PROCEDURE inventory_smart.create_configurator_sample_tables(p_drop_flags JSON)
LANGUAGE plpgsql
AS $$
DECLARE
    src TEXT;
    should_drop BOOLEAN;
    expected_cols TEXT;
    ddl TEXT;
    v_table_name TEXT;
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'inventory_smart.create_configurator_sample_tables';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
BEGIN
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
    -- Loop every unique data_source in master table
    FOR src IN (
        SELECT DISTINCT data_source
        FROM inventory_smart.kpi_field_master
        WHERE data_source IS NOT NULL
        ORDER BY data_source
    )
    LOOP
        v_table_name := 'sample_table_' || src;
        -- Read flag from JSON argument
        should_drop := COALESCE((p_drop_flags ->> src)::BOOLEAN, FALSE);
        RAISE NOTICE 'Processing table: %, DropFlag=%', v_table_name, should_drop;
        -- Build CREATE TABLE column definition
        SELECT string_agg(
            quote_ident(field_name) || ' ' ||
            CASE LOWER(field_type)
                WHEN 'string'  THEN 'TEXT'
                WHEN 'integer' THEN 'INTEGER'
                WHEN 'decimal' THEN 'NUMERIC'
                WHEN 'date'    THEN 'DATE'
                ELSE 'TEXT'
            END,
            ', ' ORDER BY field_id)
        INTO expected_cols
        FROM inventory_smart.kpi_field_master
        WHERE data_source = src;
        ddl := 'CREATE TABLE inventory_smart.' || quote_ident(v_table_name) 
            || ' (' || expected_cols || ');';
        -- Drop table based on JSON flag
        IF should_drop THEN
            IF EXISTS (
                SELECT 1 FROM information_schema.tables as i
                WHERE table_schema = 'inventory_smart'
                  AND i.table_name = v_table_name
            ) THEN
                RAISE NOTICE 'Dropping table: %', v_table_name;
                EXECUTE 'DROP TABLE inventory_smart.' || quote_ident(v_table_name) || ' CASCADE';
            END IF;
        END IF;
        -- Create table only if missing
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.tables as i
            WHERE table_schema = 'inventory_smart'
              AND i.table_name = v_table_name
        ) THEN
            RAISE NOTICE 'Creating table: %', ddl;
            EXECUTE ddl;
        ELSE
            RAISE NOTICE 'Table already exists & drop=false. Skipping creation.';
        END IF;
    END LOOP;
    RAISE NOTICE 'Done creating dynamic tables!';
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
END;
$$;
