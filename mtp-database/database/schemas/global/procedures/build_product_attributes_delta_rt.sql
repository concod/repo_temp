--liquibase formatted sql
--changeset liquibase:build_product_attributes_delta_rt runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for build_product_attributes_delta_rt
--rollback: SELECT 1

DROP PROCEDURE IF EXISTS global.build_product_attributes_delta_rt();
CREATE OR REPLACE PROCEDURE global.build_product_attributes_delta_rt()
LANGUAGE 'plpgsql'
AS $procedure$
declare
	_st TIMESTAMP := clock_timestamp();
	_sql text;
	_log_code varchar := gen_random_uuid();
    _sp_name varchar := 'global.build_product_attributes_delta_rt';
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
              global.product_generic_schema_mapping 
            where 
              generic_column_datatype in ('varchar[]', 'text[]', '_varchar', '_text')
		) a;
		SELECT async_query INTO _worker FROM public.async_query('call global.build_list_partitions(''product_attributes'');');
        PERFORM public.async_query_status(_worker, 'cleanup');

		_log_step := 'upsert product attributes';
		perform set_config('local.log_step', _log_step, true);

	    for _generic_column_name in select 
	      generic_column_name
	    from 
	      global.product_generic_schema_mapping 
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
	        'psa_codes', 'rcl_hash', 'product_code'
	      ) loop
--
			_log_step := 'upsert product attributes ' || _generic_column_name;
			perform set_config('local.log_step', _log_step, true);
--
			select async_query into _worker from public.async_query('
			  with delta as materialized (
					select product_code, attribute_name, null as n from (
					select * from public.product_attributes_delta_table_rt where __record_type = ''0'' and attribute_name = ''' || _generic_column_name || ''') pad join 
					global.product_attributes pa using(product_code, attribute_name)
					join global.product_master pm using(product_code)
					where pa.attribute_name = ''' || _generic_column_name || '''
					and pm.is_deleted = false
					union all
					select pad.product_code, pad.attribute_name,
					case when pad.attribute_name in (''' || _array_col_type || ''') 
	                	then 
	                  		case
								when pad.attribute_value =''[]'' then ''{}'' 
		                  		else replace (replace (replace (pad.attribute_value,''["\"'',''{''),''\""]'',''}''),''\"","\"'','','') end 
	                  	else pad.attribute_value
	                end as n
					from (
							select * from public.product_attributes_delta_table_rt 
							where __record_type = ''1'' and attribute_name = ''' || _generic_column_name || '''
							and attribute_value is not null and attribute_value != ''''
							) pad join 
					global.product_master pm using(product_code) 
					left join global.product_attributes pa on pad.product_code = pa.product_code and  pad.attribute_name = pa.attribute_name 
					and pa.attribute_name = ''' || _generic_column_name || ''' and pad.attribute_value != pa.attribute_value
				),
				dropped as(
					delete from global.product_attributes where attribute_name = ''' || _generic_column_name || ''' and (product_code, attribute_name) in (
						select product_code, attribute_name from delta where n is null
					) returning 1
				),
				upserted as (
					insert into global.product_attributes(product_code, attribute_name, attribute_value)
					select product_code, attribute_name, n from delta where n is not null on conflict(product_code, attribute_name) do 
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
