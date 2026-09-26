--liquibase formatted sql
--changeset ashish@impactanalytics.co:build_product_attributes runOnChange:true stripComments:false splitStatements:false context:New_Sync_Stratgy labels:DAT-832
--comment: initial changeset for build_product_attributes
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS global.build_product_attributes();
CREATE OR REPLACE PROCEDURE global.build_product_attributes()
 LANGUAGE plpgsql
AS $procedure$
declare
	_quoted_attrs text;
	_attrs text;
	_worker text;
	_st TIMESTAMP := clock_timestamp();
	_sql text;
	_log_code varchar := gen_random_uuid();
    _sp_name varchar := 'global.build_product_attributes';
 	_log_step varchar;
	_generic_column_name varchar;
	_iterator_id text := gen_random_uuid()::text;
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null,  (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
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
			raise notice '_generic_column_name: %', _generic_column_name;
			perform public.parellel_insert('
			  with delta as materialized (
					select product_code, attribute_name, 
					y.attribute_value as n from (
						select product_code, attribute_name, attribute_value from global.product_attributes pa {where} and attribute_name = ''' || _generic_column_name || '''
					) x
					full outer join (
						select 
						  x.product_code, 
						  x.attribute_name, 
						  case when gsm.generic_column_datatype = ''varchar[]'' then array(
						    select 
						      jsonb_array_elements_text(x.attribute_value::jsonb)
						  )::varchar else x.attribute_value end as attribute_value 
						from 
						  (
						    select 
						      product_code, 
						      j.key as attribute_name, 
						      j.value as attribute_value 
						    from 
						      (
						        select 
						          product_code, 
						          to_jsonb(t) as j 
						        from 
						          (
						            select 
						              product_code, ' || _generic_column_name || '
						            from 
						              (
										select * from public.product_validated_table {where}
						              ) pvt 
						          ) t
						      ) x, 
						      jsonb_each_text(j) as j 
						    where 
						     value is not null 
						      and value != ''''
						      and key not in(''product_code'')
						  ) x 
						  join global.product_generic_schema_mapping gsm on x.attribute_name = gsm.generic_column_name
					) y using(product_code, attribute_name)
					where attribute_name in(''' || _generic_column_name || ''')
					and x.attribute_value is distinct from y.attribute_value
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
			', 50, 'public.product_validated_table', 'product_code', 'product_validated_table_pk', 5000, _iterator_id);
		end loop;
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
