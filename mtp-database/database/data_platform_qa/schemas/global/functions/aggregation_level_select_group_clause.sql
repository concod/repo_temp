--liquibase formatted sql
--changeset liquibase:aggregation_level_select_group_clause runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for aggregation_level_select_group_clause
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.aggregation_level_select_group_clause(input jsonb);
CREATE OR REPLACE FUNCTION global.aggregation_level_select_group_clause(input jsonb)
 RETURNS TABLE(select_clause text, group_clause text)
 LANGUAGE plpgsql
AS $function$
 /*
  
  select * from global.aggregation_level_select_group_clause;
  
  SP for dynamically fetching group by and select clause for aggregation level
 
 
 
 Created_by       Created_on      	Purpose
 ----------       -----------     --------
 AKSHAY JAIN    2-march-2023    	SP for dynamically fetching group by and select clause for aggregation level
 */
 
 declare
 	_query_combine text;
 	_select_columns text;
 	_group_by_clause text[]:= array[]::text[];
   	_group_by_clause_txt text;
   	_lst_hierarchy text[];
   	_full_lst_hierarchy text[];
 	_key text;
 	_value text;
 	_str_agg_clause text[];
 	_str_agg_clause_text text;
 	_final_query text;
 	begin
	 	select
			array_agg(attribute_name) as lst_hier
		from
			global.product_attributes_list
		where
			hierarchy_level <= (
			select
				hierarchy_level
			from
				global.product_attributes_list pal
			where
				attribute_name in (
				select
					(attribute_value->>'dynamicLabelKeys')::json->>'style' as atr_val
				from
					global.tenant_attribute_master tam
				where
					name = 'core_screen_configuration')) into _lst_hierarchy;
		select array_agg(attribute_name) as full_lst from global.product_attributes_list pal where is_hierarchy is true into _full_lst_hierarchy;
	
		for _key, _value in SELECT * FROM jsonb_each_text($1) WHERE value IS NOT NULL loop
 			--_product_attribute_json_build_column_for_filter := array_append(array_append(_product_attribute_json_build_column_for_filter, ''''||_key||''''),'X.'|| _key ||'');
 			
 			if _key = any(_full_lst_hierarchy) then
 			continue;
 			else
 			_str_agg_clause = array_append(_str_agg_clause, 'string_agg( distinct ' || _key || '::text, '','') as ' || _key);
 			end if; 			
 		--_group_by_clause := array_append(_group_by_clause, 'pm.'|| _key ||'');
 		end loop;
 		_group_by_clause_txt = array_to_string(_lst_hierarchy, ' ,');
 		_str_agg_clause_text = array_to_string(_str_agg_clause, ' ,');
 		if length(_str_agg_clause_text)=0 or  length(_str_agg_clause_text) is null then 
 		_str_agg_clause_text := _group_by_clause_txt;
 		else
 		_str_agg_clause_text := _str_agg_clause_text || ' , ' || _group_by_clause_txt;
 		end if;
 		
 		_query_combine := 'select ' || quote_literal( _str_agg_clause_text) || ' , ' || quote_literal(_group_by_clause_txt);
 	
 		raise notice 'query text %', _query_combine;
 		
 		return query execute _query_combine;
  	end
 $function$
;

