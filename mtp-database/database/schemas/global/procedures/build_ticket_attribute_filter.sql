--liquibase formatted sql
--changeset arnab.nandy@impactanalytics.co:build_ticket_attribute_filter_MTP-44678 runOnChange:true stripComments:false splitStatements:false context:MTP-44678 labels:MTP-44678
--comment: Updating storage procedure build_ticket_attribute_filter to handle empty ticket scenario
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS global.build_ticket_attribute_filter();
CREATE OR REPLACE PROCEDURE global.build_ticket_attribute_filter()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
DECLARE 
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'global.build_ticket_attribute_filter';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
        _ticket_master_column_names text;
        _ticket_attribute_column_names text;
        _ticket_master_column text;
        _ticket_attribute_column text;
        _query text;
        _create_query text;
        _drop_table_query text;
	BEGIN
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
        SELECT string_agg(distinct attribute_name::text, ' text,'), string_agg(distinct attribute_name::text, ',') into _ticket_attribute_column_names, _ticket_attribute_column  from global.ticket_attributes ta ;
        SELECT string_agg(column_name::text || ' ' || udt_name::text, ', '), string_agg(column_name::text, ', ') into _ticket_master_column_names, _ticket_master_column  FROM INFORMATION_SCHEMA.columns where table_schema = 'global' and table_name = 'ticket_master' and column_name != 'id';
		
        if _ticket_attribute_column_names is null then 
			_ticket_attribute_column_names := '';
		else 
			_ticket_attribute_column_names := ', ' || _ticket_attribute_column_names || ' text';
		end if;
		if _ticket_attribute_column is null then
			_ticket_attribute_column := '';
		else
			_ticket_attribute_column := ' ,' || _ticket_attribute_column;
		end if;
		
        _create_query := 'CREATE TABLE global.ticket_attributes_filter (
            id int4 PRIMARY KEY,
            ' || _ticket_master_column_names || '
            ' || _ticket_attribute_column_names ||
        ')';
        _drop_table_query := 'DROP TABLE IF EXISTS global.ticket_attributes_filter;';
        RAISE NOTICE '%', _drop_table_query;
        execute _drop_table_query;
        RAISE NOTICE '%', _create_query;
        execute _create_query;

        _query := '
            with ticket_cte as(
                SELECT *
                FROM crosstab(''select id, attribute_name, attribute_value
	                            from global.ticket_attributes ta 
	                            order by 1, 2'',
	                          ''SELECT DISTINCT attribute_name FROM global.ticket_attributes ORDER BY 1''
                            ) as ct (id int4 ' || _ticket_attribute_column_names || ' )
            )
            INSERT INTO global.ticket_attributes_filter (id, ' || _ticket_master_column || _ticket_attribute_column || ')
            SELECT id, ' || _ticket_master_column || _ticket_attribute_column || '
            FROM ticket_cte JOIN global.ticket_master USING (id); 
        ';
        RAISE NOTICE '%', _query;
        EXECUTE _query;
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
	END;
$procedure$
;
