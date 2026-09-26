--liquibase formatted sql
--changeset liquibase:build_store_attributes runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for build_store_attributes
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS global.build_store_attributes();
CREATE OR REPLACE PROCEDURE global.build_store_attributes()
 LANGUAGE plpgsql
AS $procedure$
declare
	_quoted_attrs text;
	_attrs text;
	_worker text;
	_st TIMESTAMP := clock_timestamp();
	_sql text;
	_log_code varchar := gen_random_uuid();
    _sp_name varchar := 'global.build_store_attributes';
 	_log_step varchar;
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null,  (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
	    select 
	      string_agg(quote_literal(generic_column_name), ', '),
		  string_agg(generic_column_name, ', ') 
	      into _quoted_attrs, _attrs 
	    from 
	      global.store_generic_schema_mapping 
	    where 
	      required_in_product 
	      and (
	        is_attribute 
	        or is_pk
	      ) 
	      and generic_column_name not in (
	        ''
	      );
		SELECT async_query INTO _worker FROM public.async_query('call global.build_list_partitions(''store_attributes'');');
        PERFORM public.async_query_status(_worker, 'cleanup');

		_log_step := 'upsert store attributes';
		perform set_config('local.log_step', _log_step, true);

		perform public.parellel_insert('
		  with delta as materialized (
				select store_code, attribute_name, 
				y.attribute_value as n from (
					select store_code, attribute_name, attribute_value from global.store_attributes pa {where}
				) x
				full outer join (
					select 
					  x.store_code, 
					  x.attribute_name, 
					  case when gsm.generic_column_datatype = ''varchar[]'' then array(
					    select 
					      jsonb_array_elements_text(x.attribute_value::jsonb)
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
					              (
									select * from public.store_validated_table {where}
					              ) pvt 
					          ) t
					      ) x, 
					      jsonb_each_text(j) as j 
					    where 
					     value is not null 
					      and value != ''''
					      and key not in(''store_code'')
					  ) x 
					  join global.store_generic_schema_mapping gsm on x.attribute_name = gsm.generic_column_name
				) y using(store_code, attribute_name)
				where attribute_name in(' || _quoted_attrs || ')
				and x.attribute_value is distinct from y.attribute_value
			),
			dropped as(
				delete from global.store_attributes where (store_code, attribute_name) in (
					select store_code, attribute_name from delta where n is null
				) returning 1
			),
			upserted as (
				insert into global.store_attributes(store_code, attribute_name, attribute_value)
				select store_code, attribute_name, n from delta where n is not null on conflict(store_code, attribute_name) do 
			 		update set attribute_value = excluded.attribute_value returning 1
			)
			select (select count(1) from dropped) + (select count(1) from upserted) as cnt;
		', 50, 'public.store_validated_table', 'store_code', 'store_validated_table_pk', 500);
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
