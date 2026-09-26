--liquibase formatted sql
--changeset hemant.kumar@impactanalytics.co:assort_smart.get_finalize_size_details liquibase:get_finalize_size_details runOnChange:true stripComments:false splitStatements:false context:MTP-17668 labels:liquibase_project_start
--comment: initial changeset for get_finalize_size_details
--rollback: SELECT 1
DROP FUNCTION IF EXISTS assort_smart.get_finalize_size_details(input jsonb);
CREATE OR REPLACE FUNCTION assort_smart.get_finalize_size_details(input jsonb)
 RETURNS TABLE(plan_finalize_size_id integer[], l0_name text, l1_name text, l2_name text, l3_name text, launch text, delivery text, choice_name text, stores text, style_des text, launch_date text,style_number text, article_number text,style_name text,size_curve text, attributes jsonb)
 LANGUAGE plpgsql
AS $function$
 /*
 Function/Procedure name: assort.get_finalize_size_details
 Created by: Hemant Kumar Singh
 Created at: 12-Apr-2022
 No of input parameter: 1
 Parameter Description : $1 = json
 
 Purpose: This function been created to get finalize grade details list
 
 Calling Statement:
 SELECT assort.get_finalize_size_details('{"filters":[{"attribute_name":"plan_code","value":[818],"operator":"in"},{"attribute_name":"l0_name","value":["Travel"],"prefix":"levels","operator":"in"},{"attribute_name":"l1_name","value":["Luggage"],"prefix":"levels","operator":"in"},{"attribute_name":"l2_name","value":["Travel Bags"],"prefix":"levels","operator":"in"},{"attribute_name":"l3_name","prefix":"levels","operator":"in","value":["$125-$155"]},{"attribute_name":"launch","prefix":"levels","operator":"in","value":["-"]}]}');
 
 Hemant Kumar SIngh: getting finalize size details
 */
 declare
 	_query_combine text;
 	_where text;
 	_input_data jsonb;
 	_filter_data jsonb;
 	begin
 		_where:=null;
 		_input_data:= $1::jsonb;
 		_filter_data:=(_input_data->>'filters')::jsonb;
 
     	-- prepare where clause
         _where:=(select * from assort_smart.prepare_where_clause_from_json_filters(_filter_data) );
     
       	_query_combine := 'select 
 				array_agg(plan_finalize_size_id) plan_finalize_size_id,
 			l0_name,l1_name,l2_name, l3_name,launch,delivery, choice_name, stores, style_des, launch_date,style_number, article_number,style_name,size_curve, jsonb_object_agg(key, key_sum) as attributes
                             from (
                             select array_agg( plan_finalize_size_id) as plan_finalize_size_id ,
                             	levels->>''l0_name'' as l0_name,
                             	levels->>''l1_name'' as l1_name,
                                 levels->>''l2_name'' as l2_name,
                                 levels->>''l3_name'' as l3_name,
                                 levels->>''launch'' as launch,
                                 levels->>''delivery'' as delivery,
                                 "attributes"->>''choice_name'' as choice_name,
                                 "attributes"->>''stores'' as stores, 
                                 "attributes"->>''style_des'' as style_des,
                                 "attributes"->>''launch_date'' as launch_date, 
                                 "attributes"->>''style_name'' as style_name, 
                                 "attributes"->>''style_id'' as style_number,
                                "attributes"->>''article_number'' as article_number,
                                "attributes"->>''size_curve'' as size_curve,
                                 key, sum(value::float) key_sum
                                 from assort_smart.plan_finalize_size_master 
                                 cross join jsonb_each_text("attributes")  
                     ' || _where ||'
                     and key not like ''choice_%'' and key not like ''store%'' 
                                 and key not like ''style_des''
                                 and key not like ''launch_date''
                                 and key not like ''article_number''
                                 and key not like ''style_id''
                                 and key not like ''style_name''
                                 and key not like ''size_curve''
                                 group by  "attributes"->>''choice_name'', key, 
                                 "attributes"->>''stores'',
                                 "attributes"->>''style_des'',
                                 "attributes"->>''launch_date'',
                                 "attributes"->>''article_number'',
                                 "attributes"->>''style_id'',
                                 "attributes"->>''style_name'',
                                 "attributes"->>''size_curve'',
                                 levels->>''l0_name'', levels->>''l1_name'', levels->>''l2_name'',levels->>''l3_name'',
                                 levels->>''launch'',levels->>''delivery''
                             ) size_master 
                             group by choice_name, stores,l0_name,l1_name,l2_name, l3_name,launch,delivery,style_number, article_number, style_des, launch_date,style_name,size_curve
                             order by SUBSTRING(split_part(choice_name, ''Choice_'', -1) FROM ''([0-9]+)'')::BIGINT ASC, choice_name'
                     ;
 
         raise notice '%', _query_combine;
         return query execute _query_combine;
        
     end
 $function$
;