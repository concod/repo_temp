--liquibase formatted sql
--changeset liquibase:build_store_hierarchies_filter_flattern runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for build_store_hierarchies_filter_flattern
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS global.build_store_hierarchies_filter_flattern();
CREATE OR REPLACE PROCEDURE global.build_store_hierarchies_filter_flattern()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'global.build_store_hierarchies_filter_flattern';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
    _cols text;
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
	select 
	  string_agg(col, ', ') into _cols 
	from 
	  (
	    select 
	      unnest(
	        array[ 'hierarchy_code', 'level', 
	        'active' ] :: varchar[]
	      ) as col 
	    union all 
	    select 
	      * 
	    from 
	      (
	        select 
	          concat(
	            '"path"->>''', generic_column_name, 
	            '''', ' AS ', generic_column_name
	          ):: varchar as col 
	        from 
	          "global".store_generic_schema_mapping 
	        where 
	          required_in_product 
	          and is_hierarchy 
	        order by 
	          hierarchy_level asc
	      ) x
	  ) x;
	drop view if exists "global".store_hierarchies_filter_flattened;
	execute 'CREATE VIEW "global".store_hierarchies_filter_flattened AS 
		SELECT 
		  ' || _cols || ' 
		FROM 
		  global.store_hierarchies_filter;';
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
