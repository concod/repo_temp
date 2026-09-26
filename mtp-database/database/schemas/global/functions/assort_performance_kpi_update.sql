--liquibase formatted sql
--changeset liquibase:assort_performance_kpi_update runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for assort_performance_kpi_update
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.assort_performance_kpi_update(jsonb, jsonb);
CREATE OR REPLACE FUNCTION global.assort_performance_kpi_update(jsonb, jsonb)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
/** Function/Procedure name: global.assort_performance_kpi_update
 * Created by: Kailash Yadav
 * Created at: 15-Dec-2021
 * No of input parameter: 2
 * Parameter Description : $1 = JSON for filter details
 * 						   $2 = JSON for attribute details	 
 * Purpose: This function been created to update/insert in assort_hierarchy_mapping table.
 * Calling Statement:   
 select * from assort_performance_kpi_update (
'{"filters": [{"attribute_name": "l0_name", "values": ["Footwear"]}, {"attribute_name": "l1_name", "values": ["MNS"]}]}',
'{"configurations": [{"performance_indicator": {"aps": false, "aur": false, "st_%": false, "margin_%": false, "store_area": true, "sales_units": true, "choice_count": false, "sales_retail_$": false}, "attributes": {"color": false, "subcat": true, "price_brand": true, "style_family": false}, "min_kpi_selection": 2, "min_attribute_selection": 2, "max_kpi_cluster": 3, "min_kpi_cluster": 2, "max_attribute_cluster": 3, "min_attribute_cluster": 2}]}')
* 
 * if any modification done in same function/procedure please record the changes in below format
 * 
 * Updated_by       Updated_on      Purpose
 * ----------       -----------     --------
 * Kailash Yadav    19-Jan-2022:    Attributes were not updating correctly in the assort_hierarchy_mapping. 
 */
 
declare 
_query_combine text := '';
_query_update text := '';
_query_insert text := '';
	_keys text[] ;
 	_vals text[] ;
 	_insert_keys text[] ;
 	_insert_vals text[] ;
 	_insert_vals_text varchar ;
	_key text;
	_value text;
	_key2 text;
	 _l_level text [];
	 _l_values text [];
	_l0_name varchar;
	_l1_name varchar;
	_l2_name varchar;
	_l3_name varchar;	
	_l4_name varchar;
	_l5_name varchar;
	_l6_name varchar;
	_l7_name varchar;


	_l0_value varchar;
	_l1_value varchar;
	_l2_value varchar;
	_l3_value varchar;	
	_l4_value varchar;
	_l5_value varchar;
	_l6_value varchar;
	_l7_value varchar;
	
	
	_performance_indicator_value json;
	_primary_attributes_value  json;
	_secondary_attributes_value json;
	_min_selection_kpi_value integer; 
	_min_selection_attribute_value integer;
	_max_kpi_cluster_value integer;
	_min_kpi_cluster_value integer;
	_max_attribute_cluster_value integer;
	_min_attribute_cluster_value integer;
	_hierarchy_id integer;

 	_input_json json ;
	_where_clause Varchar;
	
	_array_cnt int;
	
	_index_counter int:=0;
	
	_row_cnt integer;
	_added_where varchar;
	
begin
	for _input_json in select json_array_elements(value::json) input_json from 
			(select value from jsonb_each_text($1::jsonb) ) x
	 loop	
	 		
		for _key, _value in SELECT * FROM jsonb_each_text(_input_json::jsonb) --WHERE value IS NOT NULL 
		loop 
		
		if 	_key ='attribute_name' then 
				
		_l_level := array_append(_l_level, _value);
		_vals := array_append(_vals, '''' || _value || '''');
		
		elsif 	_key ='values' then 
			_l0_value := _value;	
		
		
		   --	_l0_value :=	_value;
		 --  _where_clause:= _l0_name||' && '|| _l0_value  ;
		---_attribute_ary := array_append(_attribute_ary, (_key || ' = ''' || _value || ''''));
		_l_values := array_append(_l_values, _value);
		_vals := array_append(_vals, '''' || _value || '''');
		
		
			
		else
			_keys := array_append(_keys, _key);
		    _vals  := array_append(_vals, '''' || coalesce (_value ,'')|| '''');
		end if;
	
		end loop;
	
		end loop;
		
	-- To get the value of second parameter
	
	for _key2,_input_json in select key ,json_array_elements(value::json) input_json from 
			(select key , value from jsonb_each_text($2::jsonb) ) x
	 loop	
	 	if _key2 = 'configurations' then 
	 		
		for _key, _value in SELECT * FROM jsonb_each_text(_input_json::jsonb) --WHERE value IS NOT NULL 
			loop
				if _key ='performance_indicator' then 
					_performance_indicator_value := _value ;
					_insert_keys := array_append(_insert_keys,  _key );	
					_insert_vals := array_append(_insert_vals, '''' || _value || '''');		
					--raise notice '%','performance_indicator '|| _performance_indicator_value;
				elsif _key ='attributes' then 
					_primary_attributes_value  := _value ;
					--raise notice '%', 'attributes_metrics '||_primary_attributes_value;
					_insert_keys := array_append(_insert_keys,  _key );
					_insert_vals := array_append(_insert_vals, '''' || _value || '''');	
				--elsif _key ='secondary_attributes' then 
				--	_secondary_attributes_value := _value ;
				--	raise notice '%', 'secondary_attributes '||_secondary_attributes_value;
			--	_insert_keys := array_append(_insert_keys,  _key );
				---	_insert_vals := array_append(_insert_vals, '''' || _value || '''');	
				elsif _key ='min_kpi_selection' then 
					_min_selection_kpi_value := _value ;
					--raise notice '%', 'min_selection_kpi '||_min_selection_kpi_value;
					_insert_keys := array_append(_insert_keys,  _key );
					_insert_vals := array_append(_insert_vals, '''' || _value || '''');	
				
				elsif _key ='min_attribute_selection' then 
					_min_selection_attribute_value := _value ;
					--raise notice '%', 'min_selection_attribute '||_min_selection_attribute_value;
					_insert_keys := array_append(_insert_keys,  _key );
					_insert_vals := array_append(_insert_vals, '''' || _value || '''');	
				elsif _key ='max_kpi_cluster' then 
					_max_kpi_cluster_value := _value ;
					--raise notice '%', 'max_kpi_cluster '||_min_kpi_cluster_value;
					_insert_keys := array_append(_insert_keys,  _key );
					_insert_vals := array_append(_insert_vals, '''' || _value || '''');	
				elsif _key ='min_kpi_cluster' then 
					_min_kpi_cluster_value := _value ;
					--raise notice '%', _min_kpi_cluster_value;
					_insert_keys := array_append(_insert_keys,  _key );
					_insert_vals := array_append(_insert_vals, '''' || _value || '''');	
				elsif _key ='max_attribute_cluster' then 
					_max_attribute_cluster_value := _value ;
					--raise notice '%', _max_attribute_cluster_value;
					_insert_keys := array_append(_insert_keys,  _key );
					_insert_vals := array_append(_insert_vals, '''' || _value || '''');	
				elsif _key ='min_attribute_cluster' then 
					_min_attribute_cluster_value := _value ;
					--raise notice '%', _min_attribute_cluster_value;
					_insert_keys := array_append(_insert_keys,  _key );
					_insert_vals := array_append(_insert_vals, '''' || _value || '''');	
				end if;
			
			end loop;
		end if;
	
	end loop;
--and l2_name is null 
		
	  select  array_length(array[_l_values],2) into _array_cnt;
	  --raise notice '%',_array_cnt||'Array cnt';
	 _added_where:= ' AND '||'l'||_array_cnt||'_name is null ' ;
	 --raise notice '%',_added_where;
	  
	 while _index_counter<_array_cnt
	 	loop
	 		_index_counter:= _index_counter+1;
	 		
	 		if _index_counter=1 then
	 		 _l0_name:=_l_level[_index_counter];
	 		 _l0_value:=_l_values[_index_counter];
	 		 _where_clause := '1=1  ' ;	
	 		 _where_clause := _where_clause|| ' AND '||_l0_name|| ' = ' ||_l0_value ;
	 		_insert_keys := array_append(_insert_keys,  ''||_l0_name||'' );	
			_insert_vals := array_append(_insert_vals, '''' || _l0_value || '''');	
	 		--raise notice '%''%''%',_l0_name,_l0_value,_where_clause;
	 		elsif _index_counter=2 then
	 		 _l1_name:=_l_level[_index_counter];
	 		 _l1_value:=_l_values[_index_counter];
	 		 _where_clause := _where_clause||' AND '||_l1_name|| ' = ' ||_l1_value ;
	 		_insert_keys := array_append(_insert_keys, '' || _l1_name || '');	
			_insert_vals := array_append(_insert_vals, '''' || _l1_value || '''');	
	 		--raise notice '%''%''%',_l2_name,_l2_value,_where_clause;
	 		elsif _index_counter=3 then
	 		 _l2_name:=_l_level[_index_counter];
	 		 _l2_value:=_l_values[_index_counter];
	 		 _where_clause := _where_clause|| ' AND '|| _l2_name|| ' = ' ||_l2_value ;
	 		_insert_keys := array_append(_insert_keys, '' || _l2_name || '');	
			_insert_vals := array_append(_insert_vals, '''' || _l2_value || '''');	
	 		--raise notice '%''%''%',_l3_name,_l3_value,_where_clause;
	 	    elsif _index_counter=4 then
	 		 _l3_name:=_l_level[_index_counter];
	 		 _l3_value:=_l_values[_index_counter];
	 		 _where_clause := _where_clause|| ' AND '||_l3_name|| ' = ' ||_l3_value ;
	 		_insert_keys := array_append(_insert_keys, '' || _l3_name || '');	
			_insert_vals := array_append(_insert_vals, '''' || _l3_value || '''');	
	 		--raise notice '%''%''%',_l4_name,_l4_value,_where_clause;
	 	    elsif _index_counter=5 then
	 		 _l4_name:=_l_level[_index_counter];
	 		 _l4_value:=_l_values[_index_counter];
	 		 _where_clause := _where_clause|| ' AND '||_l4_name|| ' = ' ||_l4_value ;
	 		_insert_keys := array_append(_insert_keys, '' || _l4_name || '');	
			_insert_vals := array_append(_insert_vals, '''' || _l4_value || '''');	
	 		--raise notice '%''%''%',_l5_name,_l5_value,_where_clause;
	 	   elsif _index_counter=6 then
	 		 _l5_name:=_l_level[_index_counter];
	 		 _l5_value:=_l_values[_index_counter]; 
	 		 _where_clause := _where_clause|| ' AND '||_l5_name|| ' = ' ||_l5_value ;
	 		_insert_keys := array_append(_insert_keys, '' || _l5_name || '');	
			_insert_vals := array_append(_insert_vals, '''' || _l5_value || '''');	
	 		--raise notice '%''%''%',_l6_name,_l6_value,_where_clause;
	 	  elsif _index_counter=7 then
	 		 _l6_name:=_l_level[_index_counter];
	 		 _l6_value:=_l_values[_index_counter];
	 		 _where_clause := _where_clause|| ' AND '||_l6_name|| ' = ' ||_l6_value ;
	 		_insert_keys := array_append(_insert_keys, '' || _l6_name || '');	
			_insert_vals := array_append(_insert_vals, '''' || _l6_value || '''');	
	 		--raise notice '%''%''%',_l7_name,_l7_value,_where_clause;
	 	end if;
	 		---l0_name,l1_name,l2_name["apparel", "clothing"],["Pre-School"],["Pre-School"]

	 	end loop;
	 _where_clause:= ' select replace (replace ('''||_where_clause ||''',''['',''''''{''),'']'',''}'''''')';
	  --raise notice '%', _where_clause;
	  execute _where_clause into _where_clause;
	 
	 if _array_cnt <6 then
	 	_where_clause := _where_clause||_added_where;
	 end if;
	
	 	_query_combine:= 'select
								count(*)
							from
								global.assort_hierarchy_mapping a
							where '||_where_clause ;
	 
						
	 	
	
		--raise notice '%',_query_combine;				
	 
	  execute _query_combine into _row_cnt;
	
	 if _row_cnt >0 then
	  --raise notice '%', _primary_attributes_value;
	 
	 if _primary_attributes_value is null then
	 	_primary_attributes_value:= concat( _primary_attributes_value, 'null');
	 elsif _performance_indicator_value is null then
	 	_performance_indicator_value:= concat( _performance_indicator_value, 'null');
	 elseif _min_selection_kpi_value is null then
	 	_min_selection_kpi_value:= concat( _min_selection_kpi_value, 'null');
	 elseif _min_selection_attribute_value is null then
	 	_min_selection_attribute_value:= concat( _min_selection_attribute_value, 'null');
	 elseif _max_kpi_cluster_value is null then
	 	_max_kpi_cluster_value:= concat( _max_kpi_cluster_value, 'null');
	 elseif _min_kpi_cluster_value is null then
	 	_min_kpi_cluster_value:= concat( _min_kpi_cluster_value, 'null');
	  elseif _max_attribute_cluster_value is null then
	 	_max_attribute_cluster_value:= concat( _max_attribute_cluster_value, 'null');
	  elseif _min_kpi_cluster_value is null then
	 	_min_attribute_cluster_value:= concat( _min_attribute_cluster_value, 'null');	
	 		
	 end if;
 

	 
	 _query_update := 
	 	'update  global.assort_hierarchy_mapping a
		 set 
		 	    attributes = '''||concat( _primary_attributes_value) ||
		 	 ''', performance_indicator='''||concat(_performance_indicator_value) ||
		 	 ''', min_kpi_selection = '||concat(_min_selection_kpi_value) ||
		 	 ', min_attribute_selection='||concat(_min_selection_attribute_value) ||
		 	 ', max_kpi_cluster ='||concat(_max_kpi_cluster_value) ||
		 	 ', min_kpi_cluster='||concat(_min_kpi_cluster_value) ||
		 	 ', max_attribute_cluster='||concat(_max_attribute_cluster_value) ||
		 	 ', min_attribute_cluster='||concat(_min_attribute_cluster_value) ||
		' where '||_where_clause ;
	
		--raise notice '%',_query_update; 
	 
	 	execute _query_update;
	 
	 else
	 	 select max(hierarchy_id) into _hierarchy_id from "global".assort_hierarchy_mapping ;
	 	_hierarchy_id:= _hierarchy_id+1;
	 	_insert_keys := array_append(_insert_keys,  'hierarchy_id' );
	    _insert_vals := array_append(_insert_vals, '''' || _hierarchy_id || ''''); 
	   
	   --	raise notice '%',_insert_vals;
	   
	 	_insert_vals_text := ARRAY_TO_STRING(_insert_vals, ', ', '');
	 	select replace (replace (aa::varchar,'[','{'),']','}') _insert_vals into _insert_vals_text
	 	from
		(
		select (_insert_vals_text) aa
		) x;
	 	-- raise notice '%',_insert_vals_text;
	    
	   	-- raise notice '%',_insert_vals_text;
	  --  execute _insert_vals_text into _insert_vals_text;
	 	 --raise notice '%',_insert_vals_text;
	   
	   
	   _query_insert := 
	 	'INSERT INTO "global".assort_hierarchy_mapping (' || (ARRAY_TO_STRING(_insert_keys, ', ', '')) || ') VALUES (' || _insert_vals_text|| ') ;';
	 	--raise notice '%',_query_insert;
	    execute _query_insert;
	 end if;
	 



--	return query execute _query_combine;
end
;
$function$
;
