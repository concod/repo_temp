--liquibase formatted sql
--changeset nuttu.hariprasad@impactanalytics.co:sp_product_status_list_added runOnChange:true stripComments:false splitStatements:false context:sp_product_status_list_added_MTP-117610 labels:sp_product_status_list_added_MTP-117610
--comment: Added sp to get product status list - MTP-117610
--rollback: SELECT 1
DROP FUNCTION IF EXISTS "global".product_status_list(jsonb, jsonb, jsonb, jsonb);
CREATE OR REPLACE FUNCTION global.product_status_list(input jsonb, jsonb, jsonb, jsonb)
 RETURNS TABLE(product_code character varying, product_name character varying, replacement_product_codes character varying[], reference_product_codes character varying[], attributes json, status_obj json, product_description text, updated_by text, updated_at timestamp with time zone)
 LANGUAGE plpgsql
AS $function$
  declare
  	_query_pm text := '';
  	_query_pa text := '';
  	_query_table_filters text := '';
  	_query_combine text := '';
  	_final_query text := '';
  	_where_and_clause text := '';
  	_where text:= '';
  	_product_attribute_json_build_column_for_filter text[]:= array[]::text[];
  	_key text;
  	_value text;
  	_fl boolean:= false::boolean;
  	_agg_level_db text;
  	_agg_level text:= 'product_code';
    _l0_name_status text;
  	updated_at_column text;
	table_view text := ' ';
  /* 
   * Function/Procedure name: global.product_status_list
   *
   * Updated_by       Updated_on      Purpose
   * ----------       -----------     --------
   * Akshay Jain    07-06-2022:    To accomodate fetching multiple status,type corresponding to one product as json object.
   *                               changes : 1. fetching all status,type for some product as jsonb array
   *                                         2. Added extra input param($5) which makes where clause to filter results
   *                                         3. changed return type of status,type to json and removed start-date and end-date
   * Akshay Jain    13-06-2022:    Changed status to status_obj and type to type_obj
   *                               Removed usage of cache part because of issues
   * Akshay Jain    15-06-2022     Fixed bug MP-4071  
   * Akshay Jain    17-05-2023     updated_by, updated_at column handled using join with user_master table
   * $6 : if ROW count required                       
   */
  	begin
		$2 = $1 || $2; --product master usage is removed. whatever was supposed to be queried on product master is appended to product attributes
		$2 := jsonb_set($2, '{product_name}', COALESCE($2->'product_name', '[]'::jsonb), true);
		$2 := jsonb_set($2, '{product_description}', COALESCE($2->'product_description', '[]'::jsonb), true);
		$2 := jsonb_set($2, '{replacement_product_codes}', COALESCE($2->'replacement_product_codes', '[]'::jsonb), true);
		$2 := jsonb_set($2, '{reference_product_codes}', COALESCE($2->'reference_product_codes', '[]'::jsonb), true);
 	 	select (attribute_value->>'dynamicLabelKeys')::json->>'style' as atr_val from global.tenant_attribute_master tam where name = 'core_screen_configuration' into _agg_level_db;
 	 	if _agg_level_db is not null
 	 	then _agg_level = _agg_level_db;
 	 	end if;
  		for _key, _value in SELECT * FROM jsonb_each_text($2) WHERE value IS NOT NULL loop
 	 		
 	 		if _key = _agg_level
 	 		then
 	 		_fl := true;
 	 		end if;
 	 		if _key not in ('product_name', 'product_description', 'replacement_product_codes', 'reference_product_codes', 'product_group') then
 	 			_product_attribute_json_build_column_for_filter := array_append(array_append(_product_attribute_json_build_column_for_filter, ''''||_key||''''),'X.'|| _key ||'');
 	 		end if;
  		end loop;
  		if _fl is false
  			then
  			$2 = $2 || jsonb_build_object(_agg_level, jsonb_build_array());
  		end if;
  		_product_attribute_json_build_column_for_filter := array_append(array_append(_product_attribute_json_build_column_for_filter, '''aggregation_code'''),'X.'|| _agg_level ||'');
  		SELECT column_name 
			FROM information_schema.columns 
			WHERE table_name='product_time_attributes' and table_schema = 'global' and column_name = 'l0_name' into _l0_name_status;
		
		
		raise notice 'ffdf %', _l0_name_status;
--  		_query_pm := global.form_main_table_filters('product_master', $1);
   		_query_pa := global.form_attribute_table_filters_v2('product_attributes', 'product_code', $2);
  		_query_table_filters := global.form_table_query($3);
  		
  		if _l0_name_status is null then 
  		
  		$4 = $4 - 'l0_name';
  		
  		end if;
  	
  		_where_and_clause :=  global.form_where_clause('varchar', $4::jsonb);
		-- qualify ambiguous l0_name to pta.l0_name to avoid ambiguity when referencing cte
		_where_and_clause := regexp_replace(_where_and_clause, '(^|[^a-zA-Z0-9_"])l0_name([^a-zA-Z0-9_])', E'\\1pta.l0_name\\2', 'g');
		_where_and_clause := regexp_replace(_where_and_clause, '(^|[^a-zA-Z0-9_"])l0_name$', E'\\1pta.l0_name', 'g');
  		raise notice '%', _where_and_clause;
  		if _where_and_clause::text =''  then 
  	   		_where:= 'where 1=1'; 
  	   	else
  			_where:= 'where status_obj is not null or type_obj is not null';
  	   	end if;
  	   	  	   
  	   _query_combine := ' with 
		 				   cte as '|| table_view ||'(' || _query_pa || '),
		 				   cte2 as materialized 
							(
								select json_agg(jsonb_build_object(''status_start_time'', concat(start_time)::varchar, ''status_end_time'', concat(end_time)::varchar, ''status'', attribute_value , ''time_attr_id'', product_time_attr_id) ORDER BY start_time) status_obj, pta.product_code, max(um.name) as updated_by, max(pg_xact_commit_timestamp(pta.xmin)) as change_time 
								from "global".product_time_attributes pta 
								left join "global".user_master um on pta.updated_by = um.user_code
								JOIN cte c ON c.product_code = pta.product_code ' 
								|| _where_and_clause || ' 
								and pta.attribute_name = ''status''
						        group by pta.product_code
							)
							select
		  					   X.product_code,
		  					   X.product_name,
		  					   X.replacement_product_codes as replacement_product_codes, 
		  					   X.reference_product_codes as reference_product_codes,
		  					   json_build_object(' || array_to_string(_product_attribute_json_build_column_for_filter, ' ,') ||'),
		  					   b.status_obj as status_obj,
		  					   X.product_description :: text,
							   b.updated_by,
							   b.change_time
		  					FROM cte X 
							join cte2 b using(product_code) ' || _query_table_filters;
  	   
  			raise notice '%', _query_combine;
  			return query execute _query_combine;
  	end;
  	
$function$
;
