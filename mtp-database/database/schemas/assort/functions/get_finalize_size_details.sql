--liquibase formatted sql
--changeset liquibase:get_finalize_size_details runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for get_finalize_size_details
--rollback: SELECT 1
DROP FUNCTION IF EXISTS assort.get_finalize_size_details(input jsonb);
CREATE OR REPLACE FUNCTION assort.get_finalize_size_details(input jsonb)
 RETURNS TABLE(plan_finalize_size_id integer[], l0_name text, l1_name text, l2_name text, l3_name text, drop text, flow text, choice_name text, stores text, style_des text, launch_date text, article_number text,style_number text, attributes jsonb)
 LANGUAGE plpgsql
AS $function$

/*
Function/Procedure name: assort.get_finalize_size_details
Created by: Hemant Kumar Singh
Created at: 15-Mar-2022
updated at: 30-Mar-2022
No of input parameter: 1
Parameter Description : $1 = json

Purpose: This function been created to get finalize size details list

Calling Statement:
SELECT assort.get_finalize_attribute_grade_details_list('{"filters":[{"attribute_name":"plan_code","value":[818],"operator":"in"},{"attribute_name":"l0_name","value":["Travel"],"prefix":"levels","operator":"in"},{"attribute_name":"l1_name","value":["Luggage"],"prefix":"levels","operator":"in"},{"attribute_name":"l2_name","value":["Travel Bags"],"prefix":"levels","operator":"in"},{"attribute_name":"l3_name","prefix":"levels","operator":"in","value":["$125-$155"]},{"attribute_name":"drop","prefix":"levels","operator":"in","value":["-"]}]}');

Hemant Kumar SIngh: getting finalize size details
*/

declare
_query_combine text;
_input_json json ;
_attribute_name text;
_operator text;
_prefix text;
_value text;
_where text;


    begin
    	_where:=null;

	    for _input_json in select json_array_elements(value::json) input_json from 
            (select value from jsonb_each_text($1::jsonb)) x
            
        loop
            
            _attribute_name = _input_json->>'attribute_name';
		
			_operator = _input_json->>'operator';
			
			_value = _input_json->>'value';
			_value:= REPLACE(_value, '"', '''' );
			
			if _operator = 'in' then
				_value:= REPLACE(_value, '[', '(' );
				_value:= REPLACE(_value, ']', ')' );
			end if;

			if (_input_json->>'prefix') IS NOT null then
	     		_prefix = _input_json->>'prefix';
	     		
	     	else
	     		_prefix:=null;
	     		
	     	end if;

	     	if _where IS NULL then
		     	if _prefix IS NULL then
					_where:=  (' where '||_attribute_name || ' ' || _operator || ' ' || _value)::text;
				else
					_where:= (' where '||_prefix||'->>'''||_attribute_name || ''' ' || _operator || ' ' || _value)::text;
				end if;
			else
				if _prefix IS NULL then
					_where:= concat(_where, ' and '||_attribute_name|| ' ' || _operator || ' ' || _value);
				else
					_where:= concat(_where, ' and '||_prefix||'->>'''||_attribute_name || ''' ' || _operator || ' ' || _value);
				end if;
			end if;
		
      	end loop; 

      	_query_combine := 'select 
				array_agg(plan_finalize_size_id) plan_finalize_size_id,
			l0_name,l1_name,l2_name, l3_name,drop,flow, choice_name, stores, style_des, launch_date, article_number,style_number, jsonb_object_agg(key, key_sum) as attributes
                            from (
                            select array_agg( plan_finalize_size_id) as plan_finalize_size_id ,
                            	levels->>''l0_name'' as l0_name,
                            	levels->>''l1_name'' as l1_name,
                                levels->>''l2_name'' as l2_name,
                                levels->>''l3_name'' as l3_name,
                                levels->>''drop'' as drop,
                                levels->>''flow'' as flow,
                                "attributes"->>''choice_name'' as choice_name,
                                "attributes"->>''stores'' as stores, 
                                "attributes"->>''style_des'' as style_des,
                                "attributes"->>''launch_date'' as launch_date,
                                "attributes"->>''article_number'' as article_number,
                                "attributes"->>''style_number'' as style_number,
                                key, sum(value::float) key_sum
                                from assort.plan_finalize_size_master 
                                cross join jsonb_each_text("attributes")  
                    ' || ' ' ||_where || ' ' ||''
                    'and key not like ''choice_%'' and key not like ''store%'' 
                                and key not like ''style_des''
                                and key not like ''launch_date''
                                and key not like ''article_number''
                                and key not like ''style_number''
                                group by  "attributes"->>''choice_name'', key, 
                                "attributes"->>''stores'',
                                "attributes"->>''style_des'',
                                "attributes"->>''launch_date'',
                                "attributes"->>''article_number'',
                                "attributes"->>''style_number'',
                                levels->>''l0_name'', levels->>''l1_name'', levels->>''l2_name'',levels->>''l3_name'',
                                levels->>''drop'',levels->>''flow''
                            ) size_master 
                            group by choice_name, stores,l0_name,l1_name,l2_name, l3_name,drop,flow, article_number, style_des, launch_date,style_number
                            order by SUBSTRING(split_part(choice_name, ''choice_'', 2) FROM ''([0-9]+)'')::BIGINT ASC, choice_name'
                    ;

        raise notice '%', _query_combine;
        return query execute _query_combine;
       
    end
$function$
;
