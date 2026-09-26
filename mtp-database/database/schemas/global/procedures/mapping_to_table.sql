--liquibase formatted sql
--changeset liquibase:mapping_to_table runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for mapping_to_table
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS global.mapping_to_table(IN input text);
CREATE OR REPLACE PROCEDURE global.mapping_to_table(IN input text)
 LANGUAGE plpgsql
  SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'global.mapping_to_table';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
	_create_sql text;
	_cols text;
	_pk_constrains text := '';
	_un_constrains text := '';
	_pk_count int;
	_un_count int;
	begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
		execute 'select count(1) from "global".' || $1 || '_generic_schema_mapping where is_pk;' into _pk_count;
		execute 'select count(1) from "global".' || $1 || '_generic_schema_mapping where unique_by;' into _un_count;
		execute 'DROP TABLE IF EXISTS "public"."' || $1 || '";';
		execute 'select string_agg(concat(''"'', generic_column_name, ''"'', '' '', generic_column_datatype, (case when is_null_allowed then '' NULL'' else '' NOT NULL'' end), (case when formula is not null then concat('' default '', formula) else '''' end)), '', '') from "global".' || $1 || '_generic_schema_mapping;' into _cols;
		raise notice '%', _cols;
		if _un_count > 0 then
			execute 'select concat('', CONSTRAINT ' || $1 || '_un UNIQUE ('', string_agg(generic_column_name, '', ''), '')'') from "global".' || $1 || '_generic_schema_mapping where unique_by;' into _un_constrains;
		end if;
		if _pk_count > 0 then
			execute 'select concat('', CONSTRAINT ' || $1 || '_pk PRIMARY KEY ('', string_agg(generic_column_name, '', ''), '')'') from "global".' || $1 || '_generic_schema_mapping where is_pk;' into _pk_constrains;
		end if;
		_create_sql := 'CREATE TABLE public.' || $1 || '(' ||
			_cols || _un_constrains || _pk_constrains ||
		');';
		-- raise notice '%', _create_sql;
		execute _create_sql;
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
	end
$procedure$
;
