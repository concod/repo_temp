--liquibase formatted sql
--changeset liquibase:check_product_mapping_overlap runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for check_product_mapping_overlap
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.check_product_mapping_overlap(input jsonb);
CREATE OR REPLACE FUNCTION global.check_product_mapping_overlap(input jsonb)
 RETURNS json[]
 LANGUAGE plpgsql
AS $function$
	/*

	select * from  global.check_product_mapping_overlap('{"product_store":
[{"product_code": "15973-T89", "valid_from": "2022-03-22", "valid_to": "2022-04-30", "stores": ["4070","10"]},
{"product_code": "15973-T89", "valid_from": "2022-03-22", "valid_to": "2022-04-30", "stores": ["4070","10"]}]}')

	 select  *
from global.product_mapping pm where 1=1
and mapping_type ='product_store'
and product_code ='15973-T89'
and store_code in ('4070',
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
	_stores text;
	_product_code varchar;
	_valid_from date;
	_valid_to date;
	_time_attrs text[];
    _product_list json[];
    _query text;
   	_product_id json;
	begin
		for _key, _value in SELECT * FROM jsonb_each_text($1) WHERE value IS NOT NULL loop
			for _value in select value from jsonb_array_elements (_value::jsonb) loop
			 for _key,_value in select * from jsonb_each_text(_value::jsonb) loop
				if _key = 'stores' then
					_store_codes := replace(replace(_value, '[', '{'), ']', '}')::varchar[];
				elseif _key = 'product_code' then
					_product_code := _value;
				elseif _key = 'valid_from' then
					_valid_from := _value;
				elseif _key = 'valid_to' then
					_valid_to := _value;
				end if;
		 	end loop;

			raise notice '%',_store_codes;
			raise notice '%',_product_code;
			raise notice '%',_valid_from;
			raise notice '%',_valid_to;

		 	select replace (replace ( _store_codes::text ,'{','['),'}',']') into _stores;
			raise notice '_stores%',_stores;

		_query := 'select json_object_agg(''product_code'',product_code) from
					(select  distinct product_code
					from global.product_mapping_product_store pm where 1=1
					and mapping_type =''product_store''
				 	and pm.valid_from >='''||_valid_from ||'''
					and pm.valid_to <='''||_valid_to ||'''
					and product_code = '''||concat(_product_code) ||'''
					and store_code = any('''||concat(_store_codes)||''')) x';

				execute _query into _product_id;

				raise notice '_query%',_query;
				raise notice '_product_id%',_product_id;
			--	raise notice '%','array_append('||_product_list||','|| _product_id||')';
				if _product_id is not null then
				--_product_id := replace (replace (_product_id,'{' ,''''),'}' ,'''');
				raise notice '%',_product_id;
				_product_list := array_append(_product_list, _product_id);
				end if;
				--	_vals := array_append(_vals, (_key || ' = ''' || _value || ''''));
		 end loop;

		end loop;

        return _product_list;
	end $function$
;
