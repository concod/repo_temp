--liquibase formatted sql
--changeset liquibase:build_store_attributes runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for build_store_attributes
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS global.build_store_attributes();
CREATE OR REPLACE PROCEDURE global.build_store_attributes()
 LANGUAGE plpgsql
AS $procedure$
declare
	_attr varchar;
	_sql text;
	_attrs varchar;
	_worker text;
	_st TIMESTAMP := clock_timestamp();
	_log_code varchar := gen_random_uuid();
    _sp_name varchar := 'global.build_store_attributes';
 	_log_step varchar;
begin

	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null,  (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	
	begin
	
		-- requested - Old products will not come in daily sync @harsha
		_log_step := 'calculate store attributes to delete';
		SELECT async_query INTO _worker FROM public.async_query('DROP TABLE IF EXISTS public.sa_delete;');
        PERFORM public.async_query_status(_worker, 'cleanup');

		 _sql :='
        CREATE TABLE public.sa_delete AS 
        SELECT store_code FROM global.store_master sm
        JOIN "global".store_attributes sa USING(store_code)
        WHERE sm.is_deleted = false;';
        SELECT async_query INTO _worker FROM public.async_query(_sql);
        PERFORM public.async_query_status(_worker, 'cleanup');
		call global.data_ingestion_logs(_log_code, _sp_name, _log_step, null, (clock_timestamp() - _st)::text, null);

		_log_step := 'delete store attributes';
		perform set_config('local.log_step', _log_step, true);
        _sql := 'WITH rows AS (
        DELETE FROM 
        "global".store_attributes sa {where} 
		RETURNING 1
        ) 
        SELECT 
          count(1) as cnt 
        FROM 
          rows;';
        PERFORM public.parellel_insert(_sql, 50, 'public.sa_delete', 'store_code', 'sa_delete_store_code_pk', 50);
		call global.data_ingestion_logs(_log_code, _sp_name, _log_step, null, (clock_timestamp() - _st)::text, null);

		_log_step := 'create partitions';
		perform set_config('local.log_step', _log_step, true);
--		for _attr in SELECT 
--		  generic_column_name 
--		from 
--		  global.store_generic_schema_mapping 
--		where 
--		  required_in_product 
--		  and is_attribute loop
--			execute 'CREATE TABLE IF NOT EXISTS "global".store_attributes_' || _attr || ' PARTITION OF "global".store_attributes FOR VALUES IN (''' || _attr || ''');';
--		end loop;
		select 
		  string_agg(generic_column_name, ', ') into _attrs 
		from 
		  global.store_generic_schema_mapping 
		where 
		  required_in_product 
		  and (
		    is_attribute 
		    or is_pk
		  );
		SELECT async_query INTO _worker FROM public.async_query('call global.build_list_partitions(''store_attributes'');');
        PERFORM public.async_query_status(_worker, 'cleanup');
		call global.data_ingestion_logs(_log_code, _sp_name, _log_step, null, (clock_timestamp() - _st)::text, null);  

		_log_step := 'sa upsert';
		perform set_config('local.log_step', _log_step, true);
		
		 _sql :='WITH rows AS (
		 insert into global.store_attributes (store_code, attribute_name, attribute_value) 
		 select 
		  x.store_code, 
		  x.attribute_name, 
		  case when gsm.generic_column_datatype = ''varchar[]'' then array(
		    select 
		      jsonb_array_elements_text(x.attribute_value :: jsonb)
		  )::varchar else x.attribute_value end as attribute_value 
		 from 
		  (
		    select 
		      store_code, 
		      j.key as attribute_name, 
		      j.value as attribute_value 
		    from 
		      (
		        select 
		          store_code, 
		          to_jsonb(t) as j 
		        from 
		          (
		            select 
		              ' || _attrs || ' 
		            from 
		              public.store_validated_table {where}
		          ) t
		      ) x, 
		      jsonb_each_text(j) as j 
		    where 
		      value is not null 
		      and value != ''''
		      and key not in(''store_code'')
		  ) x 
		  join global.store_generic_schema_mapping gsm on x.attribute_name = gsm.generic_column_name
		  on conflict(store_code, attribute_name) do update 
		  set attribute_value = excluded.attribute_value 
		  RETURNING 1) 
		  SELECT 
          count(1) as cnt 
        FROM 
          rows;' ;
		perform public.parellel_insert(_sql,50, 'public.store_validated_table', 'store_code', 'store_validated_table_pk', 50);
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null,  (clock_timestamp() - _st)::text, null);
	exception
	        when others then
	        -- Log the error if an exception occurs during any part of the procedure
			call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
			raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;	
end;
$procedure$
;
