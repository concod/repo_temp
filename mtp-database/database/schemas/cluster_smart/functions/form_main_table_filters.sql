--liquibase formatted sql
--changeset liquibase:form_main_table_filters runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for form_main_table_filters
--rollback: SELECT 1
DROP FUNCTION IF EXISTS cluster_smart.form_main_table_filters(input text, jsonb);
CREATE OR REPLACE FUNCTION cluster_smart.form_main_table_filters(input text, jsonb)
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
begin
	for _key, _value in SELECT * FROM jsonb_each_text($2) WHERE value IS NOT NULL loop 
		select coalesce(max(udt_name), 'varchar') INTO _dt from information_schema.columns where table_schema = 'cluster_smart' and table_name = $1 and column_name = _key;
		for _filter in SELECT * FROM json_array_elements(_value::json) loop
			if (_filter::json)->>'type' = 'custom' then
				if (_filter::json)->>'values' = 'null' then
					_con_val := ((_filter::json)->>'values');
				else
					_con_val := '''' || ((_filter::json)->>'values') || '''::' || _dt;
				end if;
				_con := array_append(_con, '(' || _key || '::' || _dt || ' ' || ((_filter::json)->>'operator') || ' ' || _con_val || ')');
			elseif (_filter::json)->>'type' = 'list' then
				if (_filter::json)->>'operator' = 'in' then
						if _dt = 'varchar[]' or _dt = '_varchar'   then
							_con := array_append(_con, '(' || _key || '::' || _dt || ' && ''' || replace(replace((_filter::json)->>'values', '[', '{'), ']', '}''') || '::' || _dt || ')');
						else
							_con := array_append(_con, '(' || _key || '::' || _dt || ' = any(''' || replace(replace((_filter::json)->>'values', '[', '{'), ']', '}''') || '::' || _dt || '[]))');
						end if;
			   else
						if _dt = 'varchar[]' or _dt = '_varchar'  then
							_con := array_append(_con, 'NOT(' || _key || '::' || _dt || ' && ''' || replace(replace((_filter::json)->>'values', '[', '{'), ']', '}''') || '::' || _dt || ')');
						else
							_con := array_append(_con, 'NOT(' || _key || '::' || _dt || ' = any(''' || replace(replace((_filter::json)->>'values', '[', '{'), ']', '}''') || '::' || _dt || '[]))');
						end if;


				end if;
			elseif (_filter::json)->>'type' = 'expression' then
				_con := array_append(_con, '(' || _key || '::' || _dt || ' ' || ((_filter::json)->>'operator') || ')');
			end if;
		end loop;
		if cardinality(_con) > 0 then
			_where = ' WHERE ' || (ARRAY_TO_STRING(_con, ' AND ', ''));
		end if;
		raise notice '%', _where;
	end loop;
	return _where;
end
$function$
;
