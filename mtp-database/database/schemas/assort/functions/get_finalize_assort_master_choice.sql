--liquibase formatted sql
--changeset hemant.kumar@impactanalytics.co:assort.get_finalize_assort_master_choice liquibase:get_finalize_assort_master_choice runOnChange:true stripComments:false splitStatements:false context:MTP-36265 labels:liquibase_project_start
--comment: initial changeset for get_finalize_assort_master_choice
--rollback: SELECT 1
DROP FUNCTION IF EXISTS assort.get_finalize_assort_master_choice(input jsonb);
CREATE OR REPLACE FUNCTION assort.get_finalize_assort_master_choice(input jsonb)
 RETURNS TABLE(plan_code integer, l1_name text, l2_name text, l3_name text, style_id text, channel text, color_id text, lifecycle text, fy integer, fm integer, quarter integer, style_name text, color_name text, season_name text, sales double precision, sales_units double precision, receipts double precision, receipt_units double precision)
 LANGUAGE plpgsql
AS $function$
 /*
 Function/Procedure name: assort.get_finalize_assort_master_choice
 Created by: Hemant Kumar
 Created at: 03-Apr-2023
 Update at: 03-Apr-2023
 No of input parameter: 1
 Parameter Description : $1, jsonb
 
 Purpose: This function been created to get plan_budget details for plan-review-screen
 
 Calling Statement:
 SELECT * from assort.get_finalize_assort_master_choice({'filters': [
         {'attribute_name': 'l0_name', 'value': ['Home'
             ], 'prefix': 'levels', 'operator': 'in'
         },
         {'attribute_name': 'l1_name', 'value': ['Home'
             ], 'prefix': 'levels', 'operator': 'in'
         },
         {'attribute_name': 'l2_name', 'value': ['Textiles'
             ], 'prefix': 'levels', 'operator': 'in'
         }
     ]
 });
 
 Hemant Kumar:
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
     
 		_query_combine := 'SELECT plan_code,levels->>''l1_name'' as l1_name,levels->>''l2_name'' as l2_name,levels->>''l3_name'' as l3_name, levels->>''style_id'' as style_id,levels->>''channel'' as channel ,levels->>''color_id'' as color_id ,levels->>''lifecycle'' as lifecycle,
							(levels->>''fy'')::int4 as fy,(levels->>''fm'')::int4 as fm,(levels->>''quarter'')::int4 as "quarter",
							attribute_value->>''style_name'' style_name,attribute_value->>''color_name'' color_name,
							attribute_value->>''season_name'' season_name,
							sum((attribute_value->>''sales'')::float8) sales ,sum((attribute_value->>''sales_units'')::float8) sales_units,
							sum((attribute_value->>''receipts'')::float8) receipts ,sum((attribute_value->>''receipt_units'')::float8) receipt_units
							FROM assort.plan_finalize_assort_master
							' || _where ||'
							group by 1,2,3,4,5,6,7,8,9,10,11,12,13,14
							order by l1_name,l2_name,l3_name,style_id,SUBSTRING(split_part(levels->>''color_id'', ''choice_'', 2) FROM ''([0-9]+)'')::BIGINT ASC
							 ';
 		raise notice '%', _query_combine;
 		RETURN QUERY execute _query_combine;
  	end
 $function$
;

