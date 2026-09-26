--liquibase formatted sql
--changeset akshay.jain@impact:product_status_agg_list_group_filter runOnChange:true stripComments:false splitStatements:false context:changed_status_agg_list_grpup labels:changed_status_agg_list_group
--comment: handled group filter
--comment: handled Updated_by and Updated_at
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.product_status_agg_list(input jsonb, jsonb, jsonb, jsonb);
CREATE OR REPLACE FUNCTION global.product_status_agg_list(input jsonb, jsonb, jsonb, jsonb)
 RETURNS TABLE(attributes json, status_obj json, updated_by text, updated_at timestamp with time zone)
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
    _aggr_level text;
  _l0_name_status text;
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
  * AKSHAY JAIN    10-03-2023     for aggregation level now using aggregation_time_attributes and removed usage of main table                  
  */
 	begin
	 	$2 = $1 || $2; --product master usage is removed. whatever was supposed to be queried on product master is appended to product attributes
	 	_aggr_level := global.fetch_aggregation_level('product_status_config');
	 	_product_attribute_json_build_column_for_filter = array_append(array_append(_product_attribute_json_build_column_for_filter, '''aggregation_code'''),'X.aggregation_code');
	 	_product_attribute_json_build_column_for_filter = array_append(array_append(_product_attribute_json_build_column_for_filter, '''products'''),'X.products');
	 	_product_attribute_json_build_column_for_filter = array_append(array_append(_product_attribute_json_build_column_for_filter, '''product_description'''),'X.product_description');
 		for _key, _value in SELECT * FROM jsonb_each_text($2) WHERE value IS NOT NULL loop
	 		IF _key = 'product_group' or _key = 'store_group' THEN
		        CONTINUE;
		    END IF;
 			_product_attribute_json_build_column_for_filter := array_append(array_append(_product_attribute_json_build_column_for_filter, ''''||_key||''''),'X.'|| _key ||'');
 		end loop;
 		--_query_pm := 'SELECT * FROM "global".product_master' || (global.form_main_table_filters('product_master', $1));
  		--_query_pa := global.form_attribute_table_filters_v2('aggregation_level', 'aggregation_code', $2);
  		_query_pa := global.form_attribute_table_filters_v2('product_attributes', 'product_code', $2);
  		_query_pa := 'select distinct ' || _aggr_level || ' as aggregation_code from (' || _query_pa || ') temp';
 		_query_table_filters := global.form_table_query($3);
 	
 		SELECT column_name 
			FROM information_schema.columns 
			WHERE table_name='aggregation_time_attributes' and table_schema = 'global' and column_name = 'l0_name' into _l0_name_status;
		
		if _l0_name_status is null then 
  		
  		$4 = $4 - 'l0_name';
  		
  		end if;
 		_where_and_clause :=  global.form_where_clause('varchar', $4::jsonb);
 		raise notice '%', _where_and_clause;
 		if _where_and_clause::text =''  then 
 	   		_where:= 'where 1=1'; 
 	   	else
 			_where:= 'where status_obj is not null';
 	   	end if;
  		_query_combine :=
 				'select
 					   json_build_object(' || array_to_string(_product_attribute_json_build_column_for_filter, ' ,') ||'),
 					   X.status_obj as status_obj,
					   X.updated_by,
					   X.updated_at
 					FROM (
 					select
						pta_u.status_obj,
						pta_u.updated_by,
						pta_u.updated_at,
 						alf.*
 					from (' || _query_pa || ') attributes
					join global.aggregation_level_filter alf on alf.aggregation_code =  attributes.aggregation_code
 				left join (
 					with cte1 as (select json_agg(jsonb_build_object(''status_start_time'', concat(start_time)::varchar, ''status_end_time'', concat(end_time)::varchar, ''status'', attribute_value, ''time_attr_id'', aggregation_time_attr_id) ORDER BY start_time) status_obj, aggregation_code,max(um.name) as updated_by, max(pg_xact_commit_timestamp(ata.xmin)) as updated_at from 
                     	"global".aggregation_time_attributes ata 
						left join "global".user_master um on ata.updated_by = um.user_code' || _where_and_clause ||  '
                     	group by aggregation_code)                    
 				select cte1.aggregation_code, status_obj, updated_by, updated_at from cte1) pta_u
 				on attributes.aggregation_code = pta_u.aggregation_code
 				' || _where || ' ) X ' || _query_table_filters;
 			raise notice '%', _query_combine;
 			return query execute _query_combine;
 	end
 	$function$
;
