--liquibase formatted sql
--changeset liquibase:form_table_query runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for form_table_query
--rollback: SELECT 1
DROP FUNCTION IF EXISTS data_platform.form_table_query(
	input jsonb);

CREATE OR REPLACE FUNCTION data_platform.form_table_query(
	input jsonb)
    RETURNS text
    LANGUAGE 'plpgsql'
AS $FUNCTION$
declare
	_key text;
	_val text;
	_filter text;
	_query text := '';
	_sort_asc text[];
	_sort_desc text[];
	_sort_text text[];
	_filter_text text[];
	_sort_query text := '';
	_limit_query text := '';
	_filter_query text := '';
	_filter_comma text[];
	_type_col text := 'str'; --by default type of column is str
	begin
		for _key, _val in SELECT * FROM jsonb_each_text($1) WHERE value IS NOT NULL loop
		_val := REGEXP_REPLACE(_val::text , $$([^'])'([^'])$$, $$\1''\2$$ ,'g'); 
			if _key = 'sort' then
				for _filter in SELECT * FROM json_array_elements(_val::json) loop
					if (_filter::json)->>'order' = 'asc' then
						_sort_asc := array_append(_sort_asc, (_filter::json)->>'column');
					else
						_sort_desc := array_append(_sort_desc, (_filter::json)->>'column');
					end if;
				end loop;
			elseif _key = 'limit' then
				_limit_query := ' LIMIT ' || ((_val::json)->>'limit') || ' OFFSET ' || ((((_val::json)->>'page')::integer - 1) * (((_val::json)->>'limit')::integer));
			elseif _key = 'range' then
				for _filter in SELECT * FROM json_array_elements(_val::json) loop
					_filter_text := array_append(_filter_text, ('(' || (((_filter::json)->>'column')) || ' BETWEEN ' || (((_filter::json)->>'min_val')) || ' AND ' || (((_filter::json)->>'max_val')) || ')'));
				end loop;
			elseif _key = 'search' then
				for _filter in SELECT * FROM json_array_elements(_val::json) loop
					
					if (_filter::json)->>'type' is not null then
						_type_col := (_filter::json)->>'type'; --if type of column received in body overriding type
					end if;
					if _type_col = 'str' then
						-- for string based column
						_filter_comma = string_to_array(regexp_replace(RTRIM((_filter::json)->>'pattern', ' '), '\s*,\s*', ',', 'g'), ',');
						
						if cardinality(_filter_comma) = 1 then
							_filter_text := array_append(_filter_text, ( '(' || (((_filter::json)->>'column')) || '::text  ILIKE ''%' || (((_filter::json)->>'pattern')) || '%''' || ')'));
						elseif cardinality(_filter_comma) > 1 then
							_filter_text := array_append(_filter_text, '(' || (((_filter::json)->>'column')) || ' = any(''' || _filter_comma::text || '''))');
						end if;
					elseif _type_col = 'bool' and (_filter::json->>'pattern') != '' then
						-- for boolean column
						_filter_text := array_append(_filter_text, ( '(' || (((_filter::json)->>'column')) || ' is ' || (((_filter::json)->>'pattern')::boolean) || '' || ')'));
					end if;
					_type_col = 'str';
						-- ToDo : currently we do not support any other type of searching apart from string and boolean. can extend it to range, min, max etc..
				end loop;
			end if;
		end loop;
		if cardinality(_sort_asc) > 0 then
			--_sort_text := array_append(_sort_text, ((ARRAY_TO_STRING(_sort_asc, ', ', '')) || ' ASC'));
			_sort_text := array_append(_sort_text, ((ARRAY_TO_STRING(_sort_asc, ' ASC ,' , '')) || ' ASC'));
		end if;
		if cardinality(_sort_desc) > 0 then
		--	_sort_text := array_append(_sort_text, ((ARRAY_TO_STRING(_sort_desc, ', ', '')) || ' DESC'));
			_sort_text := array_append(_sort_text, ((ARRAY_TO_STRING(_sort_desc, ' DESC ,', ''))|| ' DESC' ));
		end if;
		if cardinality(_sort_text) > 0 then
			_sort_query := ' ORDER BY ' || (ARRAY_TO_STRING(_sort_text, ', ', ''));
		-- else
		--	_sort_query := ' ORDER BY 1 ASC';
		end if;
		if cardinality(_filter_text) > 0 then
			_filter_query := ' WHERE ' || (ARRAY_TO_STRING(_filter_text, ' AND ', ''));
		end if;
		if cardinality(_sort_asc) > 0 then
			_sort_text := array_append(_sort_text, ((ARRAY_TO_STRING(_sort_asc, ', ', '')) || ' ASC'));
		end if;
		if _limit_query is NULL then
			_limit_query := ' ';
		end if;
		raise notice '%,%,%', _sort_query, _limit_query, _filter_query;
		return _filter_query || _sort_query || _limit_query;
	end
$FUNCTION$;