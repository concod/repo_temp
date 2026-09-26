--liquibase formatted sql
--changeset ashish:build_rcl_version runOnChange:true stripComments:false splitStatements:false context:Release_2 labels:CI-137
--comment: initial changeset for build_rcl_version
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.build_rcl_version(IN _version integer, IN _module integer, IN _l0_names text[]);
DROP PROCEDURE IF EXISTS public.build_rcl_version(IN _version integer, IN _module integer, IN _l0_names text[], IN _tbl_name text);
CREATE OR REPLACE PROCEDURE public.build_rcl_version(IN _version integer, IN _module integer, IN _l0_names text[], IN _tbl_name text DEFAULT 'global.rcl_versions_constraint'::text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.build_rcl_version';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
	_table_schema text;
	_l0_name text;
    _tbl text;
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin

	_tbl:= CASE WHEN _module = 170 THEN ' global.rcl_vc_' || _version || ''
				WHEN _module = 101 THEN 'global.psm_rcl_vs_' || _version || ''
				WHEN _module = 10003 THEN ' global.rcl_dc_store_vs_' || _version || '' 
				WHEN _module = 71 THEN  ' inventory_smart.rcl_network_' || _version || '' 
				END ;
	
	_table_schema := '
		CREATE TABLE IF NOT EXISTS '|| _tbl ||'  (LIKE '|| _tbl_name ||' INCLUDING ALL) PARTITION BY LIST (l0_name);';
	if cardinality(_l0_names) > 0 THEN
		FOREACH _l0_name in array _l0_names loop
			_table_schema := _table_schema || '
				CREATE TABLE IF NOT EXISTS '|| _tbl ||'_'|| lower(regexp_replace(_l0_name, '\W+', '', 'g')) || ' PARTITION OF '|| _tbl ||' FOR VALUES IN (' || quote_literal(_l0_name) || ');';
		end loop;
	end if;
	execute _table_schema;
	raise notice '_table_schema: %', _table_schema;
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
end;
$procedure$
;
