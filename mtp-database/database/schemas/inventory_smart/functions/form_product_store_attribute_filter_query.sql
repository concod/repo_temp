--liquibase formatted sql
--changeset rajesh.kumar:form_product_store_attribute_filter_query_store_code runOnChange:true stripComments:false splitStatements:false context:MTP-43502-store-code labels:MTP-43502-dev-store-code
--comment: Product store attributes filter query for mapping table - store-code
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.form_product_store_attribute_filter_query(in text, in jsonb, in jsonb, in text, in text, out text, out text);
DROP FUNCTION IF EXISTS inventory_smart.form_product_store_attribute_filter_query(input text, jsonb, jsonb, source_table_schema text, source_table_name text, OUT _query text, OUT _product_store_query text);
CREATE OR REPLACE FUNCTION inventory_smart.form_product_store_attribute_filter_query(input text, jsonb, jsonb, source_table_schema text, source_table_name text, OUT _query text, OUT _product_store_query text)
 RETURNS record
 LANGUAGE plpgsql
AS $function$
declare
	_key text;
	_key_expr text;
	_value text;
	_filter text;
	_dt text;
	_con text[];
	_con_val text;
	_where text := '';
	_psaf_column_name record;
	_product_columns text := '';
	_store_columns text := '';
	_product_column_names text := '';
	_join_column text := '';
	_query_pa text := inventory_smart.form_main_table_filters('ph_master', $2);
	v_gen_random_uuid text  := gen_random_uuid()::varchar;
begin
	select * from global.get_product_store_columns($1) into _product_columns, _store_columns;
	for _key, _value in SELECT * FROM jsonb_each_text($3) WHERE value IS NOT NULL loop
		_key_expr := case when _key = 'store_code' then 'saf.' || _key else _key end;
	_value := REGEXP_REPLACE(_value::text , $$([^'])'([^'])$$, $$\1''\2$$ ,'g'); 
		select coalesce(max(udt_name), 'varchar') INTO _dt from information_schema.columns where table_schema = 'global' and table_name = 'store_attributes_filter' and column_name = _key;
		for _filter in SELECT * FROM json_array_elements(_value::json) loop
			if (_filter::json)->>'type' = 'custom' then
				if (_filter::json)->>'values' = 'null' then
					_con_val := ((_filter::json)->>'values');
				else
					_con_val := '''' || ((_filter::json)->>'values') || '''::' || _dt;
				end if;
				_con := array_append(_con, '(' || _key_expr || '::' || _dt || ' ' || ((_filter::json)->>'operator') || ' ' || _con_val || ')');
			elseif (_filter::json)->>'type' = 'list' then
				if (_filter::json)->>'operator' = 'in' then
					_con := array_append(_con, '(' || _key_expr || '::' || _dt || ' = any(''' || replace(replace((_filter::json)->>'values', '[', '{'), ']', '}''') || '::' || _dt || '[]))');
				else
					_con := array_append(_con, 'NOT(' || _key_expr || '::' || _dt || ' = any(''' || replace(replace((_filter::json)->>'values', '[', '{'), ']', '}''') || '::' || _dt || '[]))');
				end if;
			elseif (_filter::json)->>'type' = 'expression' then
				_con := array_append(_con, '(' || _key_expr || '::' || _dt || ' ' || ((_filter::json)->>'operator') || ')');
			end if;
		end loop;
	end loop;
	if cardinality(_con) > 0 then
		_where = ' WHERE ' || (ARRAY_TO_STRING(_con, ' AND ', '')) || ' AND saf.active ';
	else 
		_where = ' WHERE saf.active ';
	end if;

	
	_query := ' from ' || source_table_schema ||'.' || source_table_name ||' psaf join global.store_attributes_filter saf using (store_code) ' || _where;


	SELECT array_to_string(array_agg(column_name), ',') INTO _join_column 
    FROM information_schema.columns AS isc1
    WHERE table_schema = ' || source_table_schema || ' 
    AND table_name = '|| source_table_name || ' 
    AND EXISTS (
        SELECT 1 
        FROM information_schema.columns AS isc2
        WHERE isc2.table_schema = '|| source_table_schema ||' 
        AND isc2.table_name = '|| source_table_name ||' 
        AND isc2.column_name = isc1.column_name
    );

	SELECT array_to_string(array_agg(DISTINCT column_name), ',') INTO _product_column_names
	FROM (
	    SELECT column_name FROM (
	        SELECT unnest(STRING_TO_ARRAY(_join_column, ',')) AS column_name
	        UNION 
	        SELECT unnest(STRING_TO_ARRAY(_product_columns, ',')) AS column_name
	    ) AS subquery
	) AS combined_columns;


	if _store_columns = '*' then
	   _store_columns := 'store_code';
	end if;

	_product_store_query := 'with ph_data as (
		select ph_code, '|| _product_column_names ||' from inventory_smart.ph_master '|| _query_pa ||'
	)
	,product_store_data as (
		select '||_store_columns||', psa_name, psa_code, ph_code, '|| _product_column_names||' from (select * '|| _query ||') saf join ph_data using ('|| _join_column ||')
	)';
	perform  global.sp_log(v_gen_random_uuid, 'inventory_smart.form_product_store_attribute_filter_query', 'After product_store_query value',_product_store_query,jsonb_build_object('$1',$1,'$2',$2,'$3',$3,'$4',$4,'$5',$5));
END;
$function$
;