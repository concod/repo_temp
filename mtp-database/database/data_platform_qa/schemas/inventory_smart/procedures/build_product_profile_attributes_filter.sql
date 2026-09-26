--liquibase formatted sql
--changeset kailash.yadav:build_product_profile_attributes_filter runOnChange:true stripComments:false splitStatements:false context:DAT-866 labels:build_product_profile_attributes_filter
--comment: added SECURITY DEFINER and added delete the cache.
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS inventory_smart.build_product_profile_attributes_filter(in input INTEGER);
CREATE OR REPLACE PROCEDURE inventory_smart.build_product_profile_attributes_filter(in input INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
AS $procedure$
declare 
	_pp_code int := $1;
	_pp_code_con varchar := '';
	_product_column_names text;
	_store_column_names text;
	_product_column text;
	_store_column text;
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'inventory_smart.build_product_profile_attributes_filter';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
	
	_query text;
	_create_query text;

begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin

	
	SELECT string_agg(attribute_name::text, ' text[],'), string_agg(attribute_name::text, ',') into _product_column_names, _product_column FROM global.product_attributes_list;
	SELECT string_agg(attribute_name::text, ' text[],'), string_agg(attribute_name::text, ',') into _store_column_names, _store_column FROM global.store_attributes_list WHERE is_attribute=true;

	-- call inventory_smart.build_product_profile_attributes_filter(0);

	-- To clear cache
   delete from "cache".request_tracker rt where req_code  in (
 			select req_code  from cache.request_dependencies rd 
 		  where dep_name like '%product_profile_attributes_filter%');

	if _pp_code != 0 then
 		_pp_code_con := 'and pp_code = ' || _pp_code;
 	else
 		drop table IF exists inventory_smart.product_profile_attributes_filter;
 		_create_query := 'CREATE TABLE inventory_smart.product_profile_attributes_filter (
								pp_code int4 PRIMARY KEY,
								'|| _product_column_names || ' text[],
								'|| _store_column_names || ' text[]
							);';
		raise notice '%', _create_query;
		execute _create_query;
	end if;
	
	_query := '
			with product_cte as(
				SELECT *
				FROM   crosstab(
				   ''select pp_code, key, array_agg(value) value from 
						(
						SELECT key, pp_code, TRIM(BOTH ''''"'''' from jsonb_array_elements(jsonb_array_elements(value)::jsonb -> ''''values'''')::text) as value 
						FROM inventory_smart.product_profile_attributes
						CROSS JOIN LATERAL jsonb_each(attribute_value::jsonb)
						where attribute_name = ''''product_hierarchy_filters'''' '||_pp_code_con||'
						GROUP BY 1,2,3
						) y
					GROUP BY 1,2
					ORDER  BY 1,2''
				  , ''SELECT unnest(array_agg(attribute_name))::text FROM global.product_attributes_list''
				   ) AS ct (pp_code int, '||_product_column_names||' text[]) 
				),
				store_cte as(
				SELECT *
				FROM   crosstab(
				   ''select pp_code, key, array_agg(value) value from 
						(
						SELECT key, pp_code, TRIM(BOTH ''''"'''' from jsonb_array_elements(jsonb_array_elements(value)::jsonb -> ''''values'''')::text) as value 
						FROM inventory_smart.product_profile_attributes
						CROSS JOIN LATERAL jsonb_each(attribute_value::jsonb)
						where attribute_name = ''''store_hierarchy_filters'''' '||_pp_code_con||'
						GROUP BY 1,2,3
						) y
					GROUP BY 1,2
					ORDER  BY 1,2''
				  , ''SELECT unnest(array_agg(attribute_name))::text FROM global.store_attributes_list WHERE is_attribute=true''
				   ) AS ct ("pp_code" int, '||_store_column_names||' text[])
				)
				INSERT INTO inventory_smart.product_profile_attributes_filter (pp_code, '||_product_column||','|| _store_column || ')
				SELECT pp_code, '||_product_column||','|| _store_column ||'
				FROM product_cte
				JOIN store_cte USING (pp_code);';
	raise notice '%', _query;
	execute _query;
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
END;
$procedure$;