--liquibase formatted sql
--changeset liquibase:assort_performance_kpi_list runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for assort_performance_kpi_list
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.assort_performance_kpi_list(jsonb);
CREATE OR REPLACE FUNCTION global.assort_performance_kpi_list(jsonb)
 RETURNS TABLE(kpi jsonb)
 LANGUAGE plpgsql
AS $function$
/*  
 * Function/Procedure name: global.assort_performance_kpi_list
 * Created by: Kailash Yadav
 * Created at: 15-Dec-2021
 * No of input parameter: 2
 * Parameter Description : $1 = JSON for attribute details  
 * Purpose: This function been created to provide the attributes list for given levels and 
 * in case of no data found for given levels then default values should be displayed. 
 * Calling Statement:   
 * select * from global.assort_performance_kpi_list(
 	'{"filters":
				[{ "attribute_name":"l0_name",
				"values": [ "apparel", "Footwear"]	
				},
				{ "attribute_name":"l2_name",
				"values": [ "Boys"]	
				},
				{ "attribute_name":"l1_name",
				"values": [ "Pre-School"]	
				}
		]
		}')
		
 * 
 * if any modification done in same function/procedure please record the changes in below format
 * 
 * Updated_by       Updated_on      Purpose
 * ----------       -----------     --------
 * Kailash Yadav    16-Dec-2021:    Default attribute list was not coming.    
 */
 
 
declare 
_query_combine text := '';
_query_combine_cnt text := '';
_query_cnt integer;
	_keys text[] ;
 	_vals text[] ;
	_key text;
	_value text;
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


	_input_json json ;
	_where_clause Varchar;
	
	_array_cnt int;
	
	_index_counter int:=0;
	_where_clause0 varchar;
	--_where_clause1 varchar;
	_where_clause2 varchar;
	_where_clause3 varchar;
	_where_clause4 varchar;
	_where_clause5 varchar;
	_where_clause6 varchar;	
	
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
		
	--	raise notice '%',_l_level;
	--	raise notice '%',_l_values;
	
	--	select array_to_string(array[_l_level],',') into _where_clause ;
	--	select array_to_string(array[_l_values],',') into _where_clause1;
	
	 
	  
	   select  array_length(array[_l_values],2) into _array_cnt;
	  
	 while _index_counter<_array_cnt
	 	loop
	 		_index_counter:= _index_counter+1;
	 		
	 		if _index_counter=1 then
	 		 _l0_name:=_l_level[_index_counter];
	 		 _l0_value:=_l_values[_index_counter];
	 		 _where_clause := '1=1  ' ;	
	 		 _where_clause := _where_clause|| ' AND '||_l0_name|| ' = ' ||_l0_value ;
	 		--raise notice '%''%''%',_l0_name,_l0_value,_where_clause;
	 		elsif _index_counter=2 then
	 		 _l1_name:=_l_level[_index_counter];
	 		 _l1_value:=_l_values[_index_counter];
	 		 _where_clause := _where_clause||' AND '||_l1_name|| ' = ' ||_l1_value ;
	 		--raise notice '%''%''%',_l2_name,_l2_value,_where_clause;
	 		elsif _index_counter=3 then
	 		 _l2_name:=_l_level[_index_counter];
	 		 _l2_value:=_l_values[_index_counter];
	 		 _where_clause := _where_clause|| ' AND '|| _l2_name|| ' = ' ||_l2_value ;
	 		--raise notice '%''%''%',_l3_name,_l3_value,_where_clause;
	 	    elsif _index_counter=4 then
	 		 _l3_name:=_l_level[_index_counter];
	 		 _l3_value:=_l_values[_index_counter];
	 		 _where_clause := _where_clause|| ' AND '||_l3_name|| ' = ' ||_l3_value ;
	 		--raise notice '%''%''%',_l4_name,_l4_value,_where_clause;
	 	    elsif _index_counter=5 then
	 		 _l4_name:=_l_level[_index_counter];
	 		 _l4_value:=_l_values[_index_counter];
	 		 _where_clause := _where_clause|| ' AND '||_l4_name|| ' = ' ||_l4_value ;
	 		--raise notice '%''%''%',_l5_name,_l5_value,_where_clause;
	 	   elsif _index_counter=6 then
	 		 _l5_name:=_l_level[_index_counter];
	 		 _l5_value:=_l_values[_index_counter]; 
	 		 _where_clause := _where_clause|| ' AND '||_l5_name|| ' = ' ||_l5_value ;
	 		--raise notice '%''%''%',_l6_name,_l6_value,_where_clause;
	 	  elsif _index_counter=7 then
	 		 _l6_name:=_l_level[_index_counter];
	 		 _l6_value:=_l_values[_index_counter];
	 		 _where_clause := _where_clause|| ' AND '||_l6_name|| ' = ' ||_l6_value ;
	 		--raise notice '%''%''%',_l7_name,_l7_value,_where_clause;
	 	end if;
	 		---l0_name,l1_name,l2_name["apparel", "clothing"],["Pre-School"],["Pre-School"]

	 	end loop;
	 
	 if _array_cnt <7 then
	 	
	 	_where_clause := _where_clause||' AND '||'l'||_array_cnt||'_name is null';
	 end if;
	 
	 _where_clause:= ' select replace (replace ('''||_where_clause ||''',''['',''''''{''),'']'',''}'''''')';
	  execute _where_clause into _where_clause;
	-- select replace (replace (||_where_clause ||,'[','''{'),']','}''') into _where_clause1;
	  
	 
	-- raise notice '%',_where_clause;
	 _query_combine_cnt:= 'select count(* )from global.assort_hierarchy_mapping a
						where '||_where_clause;
	 raise notice '%',_query_combine_cnt;		
	 execute _query_combine_cnt into _query_cnt	
	;			

	if _query_cnt =0 then
	
	 _query_combine:= 'select jsonb_build_object(''attributes'', attributes_indicator.attiribute_value,
						  ''performance_indicator'', performance_indicator.attiribute_value,
						  ''min_kpi_selection'',0,
						  ''min_attribute_selection'',0,
						  ''max_kpi_cluster'',0,
						  ''min_kpi_cluster'',0,
						  ''max_attribute_cluster'',0,
						  ''min_attribute_cluster'',0
													)
	from 					
		(select attiribute_value from global.assort_attributes_list  where attribute_type =''attributes'')  attributes_indicator,		
		(select attiribute_value from global.assort_attributes_list  where attribute_type =''performance_indicator'') performance_indicator';
	
	---raise notice '%', _query_combine;


	
	else
		
	--_attrbute_array_len:= array_length(_attribute_ary::array,1);
	_query_combine:= 'select
	jsonb_build_object(''attributes'' ,attributes,
	 ''performance_indicator'',performance_indicator,
	''min_kpi_selection'',min_kpi_selection,
	''min_attribute_selection'',min_attribute_selection,
	''max_kpi_cluster'',max_kpi_cluster,
	''min_kpi_cluster'',min_kpi_cluster,
	''max_attribute_cluster'',max_attribute_cluster,
	''min_attribute_cluster'',min_attribute_cluster
	) KPI
from
	global.assort_hierarchy_mapping a
where '||_where_clause;
end if ;

raise notice '%', _query_combine;


	return query execute _query_combine;
end
;
$function$
;
