--liquibase formatted sql
--changeset ashish.gupta@impactanalytics.co:build_store_attributes_delta runOnChange:true stripComments:false splitStatements:false context:delta_SP labels:MTP-38280
--comment: Bugfix to delete attributes in global when they become null
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS global.build_store_attributes_delta();

CREATE OR REPLACE PROCEDURE global.build_store_attributes_delta(
	)
LANGUAGE 'plpgsql'
AS $procedure$
declare
	_st TIMESTAMP := clock_timestamp();
	_sql text;
	_log_code varchar := gen_random_uuid();
    _sp_name varchar := 'global.build_store_attributes_delta';
 	_log_step varchar;
	_generic_column_name varchar;
	_worker text;
	_workers text[];
	_r record;
	_array_col_type text;
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null,  (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
		select 
              coalesce(string_agg(generic_column_name, ''','''),'') into _array_col_type
        from (
            select 
              generic_column_name     
            from 
              global.store_generic_schema_mapping 
            where 
              generic_column_datatype in ('varchar[]', 'text[]', '_varchar', '_text')
		) a;
		SELECT async_query INTO _worker FROM public.async_query('call global.build_list_partitions(''store_attributes'');');
        PERFORM public.async_query_status(_worker, 'cleanup');

		_log_step := 'upsert store attributes';
		perform set_config('local.log_step', _log_step, true);

	    for _generic_column_name in select 
	      generic_column_name
	    from 
	      global.store_generic_schema_mapping 
	    where 
	      required_in_product 
	      and (
	        is_attribute 
	        or is_pk
	      ) 
	      and generic_column_name not in (
	        'product_tag', 'ordering', 'sku_grade', 
	        'clearance_article', 'product_direct_channel', 
	        'articlestatustag', 'replenishment_status',
	        'psa_codes', 'rcl_hash', 'store_code'
	      ) loop
--
			_log_step := 'upsert store attributes ' || _generic_column_name;
			perform set_config('local.log_step', _log_step, true);
--
			select async_query into _worker from public.async_query('
			  with delta as materialized (
					select store_code, attribute_name, null as n from (
					select * from public.store_attributes_delta_table where __record_type = ''0'' and attribute_name = ''' || _generic_column_name || ''') sad join 
					global.store_attributes sa using(store_code, attribute_name)
					join global.store_master sm using(store_code)
					where sa.attribute_name = ''' || _generic_column_name || '''
					and sm.is_deleted = false
					union all
					select sad.store_code, sad.attribute_name,
					case when sad.attribute_name in (''' || _array_col_type || ''') 
	                	then 
	                  		case
								when sad.attribute_value =''[]'' then ''{}'' 
		                  		else replace (replace (replace (sad.attribute_value,''["\"'',''{''),''\""]'',''}''),''\"","\"'','','') end 
	                  	else sad.attribute_value
	                end as n
					from (
							select * from public.store_attributes_delta_table 
							where __record_type = ''1'' and attribute_name = ''' || _generic_column_name || '''
							and attribute_value is not null and attribute_value != ''''
						) sad join 
					global.store_master sm using(store_code) 
					left join global.store_attributes sa  on sad.store_code = sa.store_code and sad.attribute_name = sa.attribute_name 
					and sa.attribute_name = ''' || _generic_column_name || ''' and sad.attribute_value != sa.attribute_value
				),
				dropped as(
					delete from global.store_attributes where attribute_name = ''' || _generic_column_name || ''' and (store_code, attribute_name) in (
						select store_code, attribute_name from delta where n is null
					) returning 1
				),
				upserted as (
					insert into global.store_attributes(store_code, attribute_name, attribute_value)
					select store_code, attribute_name, n from delta where n is not null on conflict(store_code, attribute_name) do 
				 		update set attribute_value = excluded.attribute_value returning 1
				)
				select (select count(1) from dropped) + (select count(1) from upserted) as cnt;
			');
			raise notice '_worker: %, _generic_column_name: %', _worker, _generic_column_name;
			_workers := array_append(_workers, _worker);
			if array_length(_workers, 1) = 50 then
				FOREACH _worker in array _workers loop
					select * into _r from dblink_get_result(_worker) AS t1(cnt int8);
					raise notice '_worker: %, _r: %', _worker, _r;
					perform dblink_disconnect(_worker);
					_workers := '{}'::text[];
				end loop;
			end if;
		end loop;
		FOREACH _worker in array _workers loop
			select * into _r from dblink_get_result(_worker) AS t1(cnt int8);
			raise notice '_worker: %, _r: %', _worker, _r;
			perform dblink_disconnect(_worker);
		end loop;
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	 exception
	        when others then
	        -- Log the error if an exception occurs during any part of the procedure
			call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
			raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
end;
$procedure$;
