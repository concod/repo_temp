--liquibase formatted sql
--changeset mithun.rangaswamy:search_json_column runOnChange:true stripComments:false splitStatements:false context:Release_1_4 labels:trimmed_single_quote
--comment: added new sp to handle store grade search in normal and advanced
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.form_table_query(input jsonb);
CREATE OR REPLACE FUNCTION global.form_table_query(input jsonb)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
declare
	_key text;
	_val text;
	_filter text;
	_query text := '';
	_sort_text text:= '';
	_sort_asc text[];
	_sort_desc text[];
	--_sort_text text[];
	_filter_text text[];
	_sort_query text := '';
	_limit_query text := '';
	_filter_query text := '';
	_filter_comma text[];
	_type_col text := 'str'; --by default type of column is str
	_search_type text;
	value_at_index_0 text;
	
	begin
		for _key, _val in SELECT * FROM jsonb_each_text($1) WHERE value IS NOT NULL loop 
			
			_val := REGEXP_REPLACE(_val::text , $$([^'])'([^'])$$, $$\1''\2$$ ,'g');
				
			if _key = 'sort' then

				for _filter in select col ||' '||ord col_order 
					from (
					select value->>'column' as col , coalesce (value->>'order', 'asc')  as ord  from (
					 SELECT value  FROM  json_array_elements(_val::json) 
							)
						 X
						 ) Y loop
						_sort_text := _sort_text||_filter||',';
				end loop;
				
				if length(_sort_text)>0 then
				_sort_text := substring(_sort_text, 1, length(_sort_text) - 1);
				end if;
				
		
			elseif _key = 'limit' then
				_limit_query := ' LIMIT ' || ((_val::json)->>'limit') || ' OFFSET ' || ((((_val::json)->>'page')::integer - 1) * (((_val::json)->>'limit')::integer));
			elseif _key = 'range' then
				for _filter in SELECT * FROM json_array_elements(_val::json) loop
					_search_type := 'inRange';
					_type_col := 'int';
					if (_filter::json)->>'search_type' is not null then
						_search_type := (_filter::json)->>'search_type';
					end if;
					if (_filter::json) ->> 'type' is not null then
						_type_col := (_filter::json) ->> 'type';
					end if;
					if _type_col = 'multi_date_range' then
						_filter_text := array_append(_filter_text, ('((' || (((_filter::json)->>'column')) || ') && '' [' || (((_filter::json)->>'min_val')) || ' , ' || (((_filter::json)->>'max_val')) || ']''::daterange)')); 
					else
						if _search_type = 'inRange' then
							if _type_col = 'date' then
								_filter_text := array_append(_filter_text, ('(DATE(' || (((_filter::json)->>'column')) || ') BETWEEN ''' || (((_filter::json)->>'min_val')) || ''' AND ''' || (((_filter::json)->>'max_val')) || ''')'));
							else
								_filter_text := array_append(_filter_text, ('(' || (((_filter::json)->>'column')) || ' BETWEEN ' || (((_filter::json)->>'min_val')) || ' AND ' || (((_filter::json)->>'max_val')) || ')'));
							end if;
						elseif _search_type = 'lessThan' then
							if _type_col = 'date' then
								_filter_text := array_append(_filter_text, ('(DATE(' || (((_filter::json)->>'column')) || ' ) < ''' || (((_filter::json)->>'max_val')) || ''')'));
							else
								_filter_text := array_append(_filter_text, ('(' || (((_filter::json)->>'column')) || ' < ' || (((_filter::json)->>'max_val')) || ')'));
							end if;
						elseif _search_type = 'lessThanOrEqual' then
							if _type_col = 'date' then
								_filter_text := array_append(_filter_text, ('(DATE(' || (((_filter::json)->>'column')) || ' ) <= ''' || (((_filter::json)->>'max_val')) || ''')'));
							else
								_filter_text := array_append(_filter_text, ('(' || (((_filter::json)->>'column')) || ' <= ' || (((_filter::json)->>'max_val')) || ')'));
							end if;
						elseif _search_type = 'greaterThan' then
							if _type_col = 'date' then
								_filter_text := array_append(_filter_text, ('(DATE(' || (((_filter::json)->>'column')) || ' ) > ''' || (((_filter::json)->>'min_val')) || ''')'));
							else
								_filter_text := array_append(_filter_text, ('(' || (((_filter::json)->>'column')) || ' > ' || (((_filter::json)->>'min_val')) || ')'));
							end if;
						elseif _search_type = 'greaterThanOrEqual' then
							if _type_col = 'date' then
								_filter_text := array_append(_filter_text, ('(DATE(' || (((_filter::json)->>'column')) || ' ) >= ''' || (((_filter::json)->>'min_val')) || ''')'));
							else
								_filter_text := array_append(_filter_text, ('(' || (((_filter::json)->>'column')) || ' >= ' || (((_filter::json)->>'min_val')) || ')'));
							end if;
						elseif _search_type = 'equals' then
							if _type_col = 'date' then
								_filter_text := array_append(_filter_text, ('(DATE(' || (((_filter::json)->>'column')) || ' ) = ''' || (((_filter::json)->>'min_val')) || ''')'));
							else
								_filter_text := array_append(_filter_text, ('(' || (((_filter::json)->>'column')) || ' = ' || (((_filter::json)->>'min_val')) || ')'));
							end if;
						end if;
					end if;
					_search_type := null;
					_type_col := 'str';
				end loop;
			elseif _key = 'search' then
				for _filter in SELECT * FROM json_array_elements(_val::json) loop
					-- Below check has been added to remove extra set of single quote getting appened due to regex fix. Incase of search on json column front-end sends us single quote which was getting converted to double single quotes
					IF strpos(_filter, '->>') > 0 THEN
				        _filter :=  replace(_filter, '''''', '''');
				    END IF;

					if (_filter::json)->>'type' is not null then
						_type_col := (_filter::json)->>'type'; --if type of column received in body overriding type
					end if;
					if _type_col = 'str' then
						-- for string based column
						--_filter_comma = string_to_array(regexp_replace(regexp_replace((_filter::json)->>'pattern', '^\s*,|\s*,\s*|\s*$', '', 'g'), '\s*,\s*', ',', 'g'), ',');
						_filter_comma = string_to_array(RTRIM(regexp_replace(RTRIM((_filter::json)->>'pattern', ' '), '\s*,\s*', ',', 'g'), ','), ',');
						
						if cardinality(_filter_comma) = 1 then
							value_at_index_0 := _filter_comma[1];
							--> Pattern match condition - contains/null
							_search_type := 'contains';
							if (_filter::json)->>'search_type' is not null then
								_search_type := (_filter::json)->>'search_type';
							end if;
							if _search_type = 'contains' then
								if ((_filter::json)->>'column') = 'store_grade' then
								_filter_text := array_append(_filter_text, ( '(' || (((_filter::json)->>'column')) || '::text ILIKE ''' ||(value_at_index_0) || '%''' || ')'));
								else 
								_filter_text := array_append(_filter_text, ( '(' || (((_filter::json)->>'column')) || '::text ILIKE ''%' || (value_at_index_0) || '%''' || ')'));
								end if ;
							elseif _search_type = 'equals' then
								_filter_text := array_append(_filter_text, ( '(' || (((_filter::json)->>'column')) || ' = ''' || (value_at_index_0) || ''')'));
							end if;
						elseif cardinality(_filter_comma) > 1 then
							_search_type := 'equals';
							if (_filter::json)->>'search_type' is not null then
								_search_type := (_filter::json)->>'search_type';
							end if;
							
						    --> Equal match condition
							if _search_type = 'equals' then
								_filter_text := array_append(_filter_text, '(' || (((_filter::json)->>'column')) || ' = any(''' || _filter_comma::text || '''))');
							elseif _search_type = 'contains' then
								for i in 1..cardinality(_filter_comma) loop
								if ((_filter::json)->>'column') = 'store_grade' then
									_filter_comma[i] = _filter_comma[i]||'%';  
								else
									_filter_comma[i] = '%'|| _filter_comma[i]||'%';
								end if;
								end loop;
								_filter_text := array_append(_filter_text, '(' || (((_filter::json)->>'column')) || '::text ILIKE any(''' || _filter_comma::text || '''))');
							end if;
						end if;
					elseif _type_col = 'list' then
						-- for list based column
						_filter_comma = string_to_array(RTRIM(regexp_replace(RTRIM((_filter::json)->>'pattern', ' '), '\s*,\s*', ',', 'g'), ','), ',');
						_search_type := 'contains';
						if (_filter::json)->>'search_type' is not null then
								_search_type := (_filter::json)->>'search_type';
						end if;
						if _search_type = 'equals' then

							_filter_text := array_append(_filter_text, ( '(' || (((_filter::json)->>'column')) || ' && ''' || _filter_comma::text || ''')'));
						
						elseif _search_type = 'contains' then

							for i in 1..cardinality(_filter_comma) loop
									_filter_comma[i] = _filter_comma[i]||'%';  
							end loop;
							_filter_text := array_append(_filter_text, '(exists(select 1 from unnest(' || (((_filter::json)->>'column')) || ') as element where element ilike any(''' || _filter_comma::text || ''')))');
						end if;
					elseif _type_col = 'bool' and (_filter::json->>'pattern') != '' then
						-- for boolean column
						_filter_text := array_append(_filter_text, ( '(' || (((_filter::json)->>'column')) || ' is ' || (((_filter::json)->>'pattern')::boolean) || '' || ')'));
					end if;
					_type_col = 'str';
					_search_type := null;
						-- ToDo : currently we do not support any other type of searching apart from string and boolean. can extend it to range, min, max etc..
				end loop;
			end if;
		end loop;
		/*if cardinality(_sort_asc) > 0 then
			--_sort_text := array_append(_sort_text, ((ARRAY_TO_STRING(_sort_asc, ', ', '')) || ' ASC'));
			_sort_text := array_append(_sort_text, ((ARRAY_TO_STRING(_sort_asc, ' ASC ,' , '')) || ' ASC'));
		end if;
		if cardinality(_sort_desc) > 0 then
		--	_sort_text := array_append(_sort_text, ((ARRAY_TO_STRING(_sort_desc, ', ', '')) || ' DESC'));
			_sort_text := array_append(_sort_text, ((ARRAY_TO_STRING(_sort_desc, ' DESC ,', ''))|| ' DESC' ));
		end if;*/
		if length(_sort_text) > 0 then
			_sort_query := ' ORDER BY ' || _sort_text || ' nulls last ';
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
$function$
;