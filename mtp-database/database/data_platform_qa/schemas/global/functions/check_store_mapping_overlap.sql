--liquibase formatted sql
--changeset liquibase:check_store_mapping_overlap runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for check_store_mapping_overlap
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.check_store_mapping_overlap(input jsonb);
CREATE OR REPLACE FUNCTION global.check_store_mapping_overlap(input jsonb)
 RETURNS json[]
 LANGUAGE plpgsql
AS $function$
	/*
	 
	select * from  global.check_store_mapping_overlap('{"product_store": 
[{"store_code": "15973-T89", "valid_from": "2022-03-22", "valid_to": "2022-04-30", "products": ["4070","10"]},
{"store_code": "15973-T89", "valid_from": "2022-03-22", "valid_to": "2022-04-30", "products": ["4070","10"]}]}')
	 
	 select  *
from global.product_mapping_product_store pm where 1=1
and mapping_type ='product_store'
and store_code ='15973-T89'
and product_code in ('4070',
	'10')
and pm.valid_from >='2021-06-06'	
and pm.valid_to <='2025-01-01'
	 
	 */
	declare
	_key text;
	_value text;
	_value_1 text;
	_attributes json;
	_attribute json;
	_product_codes varchar[];
	_store_codes varchar[];
	_products text; 
	_store_code varchar;
	_valid_from date;
	_valid_to date;
	_time_attrs text[];
    _store_list json[];
    _query text;
   	_store_id json;
	begin
		for _key, _value in SELECT * FROM jsonb_each_text($1) WHERE value IS NOT NULL loop 
			for _value in select value from jsonb_array_elements (_value::jsonb) loop
			 for _key,_value in select * from jsonb_each_text(_value::jsonb) loop	
				if _key = 'products' then
					_product_codes := replace(replace(_value, '[', '{'), ']', '}')::varchar[];
				elseif _key = 'store_code' then
					_store_code := _value;
				elseif _key = 'valid_from' then
					_valid_from := _value;
				elseif _key = 'valid_to' then
					_valid_to := _value;
				end if;
		 	end loop;	
		 
			
		 	select replace (replace ( _product_codes::text ,'{','['),'}',']') into _products; 
			raise notice '_products%',_products;
		
		_query := 'select json_object_agg(''store_code'',store_code) from 
					(select  distinct store_code
					from global.product_mapping_product_store pm where 1=1
					and mapping_type =''product_store''
					and product_code = any('''||concat(_product_code) ||''')
					and store_code = '''||concat(_store_codes)||''') x';
			 
				execute _query into _store_id;	  	

				raise notice '_query%',_query;
				raise notice '_store_id%',_store_id;
			--	raise notice '%','array_append('||_product_list||','|| _product_id||')';
				if _store_id is not null then
				--_product_id := replace (replace (_product_id,'{' ,''''),'}' ,'''');
				raise notice '%',_store_id;
				_store_list := array_append(_store_list, _store_id);
				end if;
				--	_vals := array_append(_vals, (_key || ' = ''' || _value || ''''));
		 end loop;
				  
		end loop;
		
        return _store_list;
	end $function$
;
