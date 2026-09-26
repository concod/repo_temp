--liquibase formatted sql
--changeset liquibase:form_dc_dc_transfer_table_filters runOnChange:true stripComments:false splitStatements:false context:MTP-67597 labels:MTP-67597
--comment: dc dc transfer table filters
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.form_dc_dc_transfer_table_filters(input text, jsonb);

CREATE OR REPLACE FUNCTION inventory_smart.form_dc_dc_transfer_table_filters(input text, jsonb)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
 	declare
 	_key text;
 	_value text;
 	_filter text;
 	_dt text;
 	_con text[];
 	_con_val text;
 	_where text := '';
 	_dimension text;
   	_list_values text;
 	_group_pkey text;
 	_group_filter text = '';
 begin
 	_dimension := split_part($1, '_', 1);
 	for _key, _value in SELECT * FROM jsonb_each_text($2) WHERE value IS NOT NULL loop
 	_value := REGEXP_REPLACE(_value::text , $$([^'])'([^'])$$, $$\1''\2$$ ,'g'); 
 		
 			select coalesce(max(udt_name), 'varchar') INTO _dt from information_schema.columns where table_schema = 'inventory_smart' and table_name = $1 and column_name = _key;
 			for _filter in SELECT * FROM json_array_elements(_value::json) loop
 				if (_filter::json)->>'type' = 'custom' then
 					if (_filter::json)->>'values' = 'null' then
 						_con_val := ((_filter::json)->>'values');
 					else
 						_con_val := '''' || ((_filter::json)->>'values') || '''::' || _dt;
 					end if;
 					_con := array_append(_con, '(hierarchy->>''' || _key || '''::' || _dt || ' ' || ((_filter::json)->>'operator') || ' ' || _con_val || ')');
 				elseif (_filter::json)->>'type' = 'list' then
 					if (_filter::json)->>'operator' = 'in' then
 						_con := array_append(_con, '(hierarchy->>''' || _key || '''::' || _dt || ' = any(''' || replace(replace((_filter::json)->>'values', '[', '{'), ']', '}''') || '::' || _dt || '[]))');
 					else
 						_con := array_append(_con, 'NOT(hierarchy->>''' || _key || '''::' || _dt || ' = any(''' || replace(replace((_filter::json)->>'values', '[', '{'), ']', '}''') || '::' || _dt || '[]))');
 					end if;
 				elseif (_filter::json)->>'type' = 'expression' then
 					_con := array_append(_con, '(hierarchy->>''' || _key || '''::' || _dt || ' ' || ((_filter::json)->>'operator') || ')');
 				end if;
 			end loop;
 	end loop;
 	if cardinality(_con) > 0 then
 		_where = ' WHERE ' || (ARRAY_TO_STRING(_con, ' AND ', ''));
 	end if;
 	raise notice '%', _where;
 	return _where;
 end $function$
;