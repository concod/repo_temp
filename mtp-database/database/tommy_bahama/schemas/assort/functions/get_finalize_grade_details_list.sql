--liquibase formatted sql
--changeset hemant.kumar@impactanalytics.co:assort.get_finalize_grade_details_list liquibase:get_finalize_grade_details_list runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for get_finalize_grade_details_list
--rollback: SELECT 1
DROP FUNCTION IF EXISTS assort.get_finalize_grade_details_list(input jsonb);
CREATE OR REPLACE FUNCTION assort.get_finalize_grade_details_list(input jsonb)
 RETURNS TABLE(l0_name text, l1_name text, l2_name text, l3_name text, drop text, flow text, attribute_name character varying, attribute_value jsonb, plan_finalize_grade_id integer[])
 LANGUAGE plpgsql
AS $function$
 /*
 Function/Procedure name: assort.get_finalize_grade_details_list
 Created by: Hemant Kumar Singh
 Created at: 12-Apr-2022
 No of input parameter: 1
 Parameter Description : $1 = json
 
 Purpose: This function been created to get finalize grade details list
 
 Calling Statement:
 SELECT assort.get_finalize_grade_details_list('{"filters":[{"attribute_name":"plan_code","value":[818],"operator":"in"},{"attribute_name":"l0_name","value":["Travel"],"prefix":"levels","operator":"in"},{"attribute_name":"l1_name","value":["Luggage"],"prefix":"levels","operator":"in"},{"attribute_name":"l2_name","value":["Travel Bags"],"prefix":"levels","operator":"in"},{"attribute_name":"l3_name","prefix":"levels","operator":"in","value":["$125-$155"]},{"attribute_name":"drop","prefix":"levels","operator":"in","value":["-"]}]}');
 
 Hemant Kumar SIngh: getting finalize grade details
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
         _where:=(select * from assort.prepare_where_clause_from_json_filters(_filter_data) );
     
       	_query_combine := ' select
 								
 								levels->>''l0_name'' as l0_name,
 								levels->>''l1_name'' as l1_name,
 								levels->>''l2_name'' as l2_name,
 								levels->>''l3_name'' as l3_name,
 								levels->>''drop'' as drop,
                                 levels->>''flow'' as flow,
 								attribute_name,
 								jsonb_build_object(''ly'',
                                					coalesce (sum(case when attribute_name in (''receipt$'',''receipt_units'',''rcpt_cost'') then (attribute_value ->> ''ly'')::float end) , 
					                                			avg(case when attribute_name in (''cc'',''aur_grade'',''st_grade'',''aps_grade'',''avg_depth'',''imu'',''style_no'') then (attribute_value ->> ''ly'')::float end) ),
					                               ''ty'',
													coalesce (sum(case when attribute_name in (''receipt$'',''receipt_units'',''rcpt_cost'') then (attribute_value ->> ''ty'')::float end) , 
					                                			avg(case when attribute_name in (''cc'',''aur_grade'',''st_grade'',''aps_grade'',''avg_depth'',''imu'',''style_no'') then (attribute_value ->> ''ty'')::float end))) as attribute_value,
                                array_agg(distinct pfg.plan_finalize_grade_id) as plan_finalize_grade_id
 							from
 								assort.plan_finalize_grade_master pfg
 							join assort.plan_finalize_grade_attribute pfga
 							    on
 								pfg.plan_finalize_grade_id = pfga.plan_finalize_grade_id
                      ' || _where ||'
                      and attribute_name in (''receipt$'', ''cc'', ''receipt_units'', ''aur_grade'', ''st_grade'', ''aps_grade'', ''avg_depth'', ''imu'', ''rcpt_cost'', ''style_no'')
					group by 1,2,3,4,5,6,7
 					order by levels->>''l3_name'',levels->>''drop'',levels->>''flow'' '
                     ;
 
        -- raise notice '%', '_query_combine';
         raise notice '%', _query_combine;
         return query execute _query_combine;
        
     end
 $function$
;
