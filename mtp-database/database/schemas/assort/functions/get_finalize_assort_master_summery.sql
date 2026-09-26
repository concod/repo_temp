--liquibase formatted sql
--changeset hemant.kumar@impactanalytics.co:assort.get_finalize_assort_master_summery liquibase:get_finalize_assort_master_summery runOnChange:true stripComments:false splitStatements:false context:MTP-36333_division_by_zero labels:liquibase_project_start
--comment: initial changeset for get_finalize_assort_master_summery
--rollback: SELECT 1
DROP FUNCTION IF EXISTS assort.get_finalize_assort_master_summery(input jsonb);
CREATE OR REPLACE FUNCTION assort.get_finalize_assort_master_summery(input jsonb)
 RETURNS TABLE(plan_code integer, lifecycle text, sales double precision, sales_units double precision, "sales_%" double precision, receipts double precision, receipt_units double precision, "receipts_%" double precision)
 LANGUAGE plpgsql
AS $function$
 /*
 Function/Procedure name: assort.get_finalize_assort_master_summery
 Created by: Hemant Kumar
 Created at: 03-Apr-2023
 Update at: 03-Apr-2023
 No of input parameter: 1
 Parameter Description : $1, jsonb
 
 Purpose: This function been created to get plan_budget details for plan-review-screen
 
 Calling Statement:
 SELECT * from assort.get_finalize_assort_master_summery({'filters': [
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
     
 		_query_combine := 'select
							main_tbl.plan_code,
							main_tbl.lifecycle,
							main_tbl.sales,
							main_tbl.sales_units,
							(main_tbl.sales/(nullif(finl_tbl.total_sales, 0))) as "sales_%",
							main_tbl.receipts,
							main_tbl.receipt_units,
							(main_tbl.receipts/(nullif(finl_tbl.total_receipts, 0))) as "receipts_%"
							from 
							(SELECT plan_code, levels->>''lifecycle'' as lifecycle, sum((attribute_value->>''sales'')::float8) sales ,sum((attribute_value->>''receipts'')::float8) receipts ,
							sum((attribute_value->>''sales_units'')::float8) sales_units,sum((attribute_value->>''receipt_units'')::float8) receipt_units
							FROM assort.plan_finalize_assort_master
							' || _where ||'
							group by 1,2
							) as main_tbl 
							join
							(SELECT plan_code, sum((attribute_value->>''sales'')::float8) total_sales ,sum((attribute_value->>''receipts'')::float8) total_receipts 
							FROM assort.plan_finalize_assort_master
							' || _where ||'
							group by 1) finl_tbl
							on main_tbl.plan_code=finl_tbl.plan_code';
 		raise notice '%', _query_combine;
 		RETURN QUERY execute _query_combine;
  	end
 $function$
;
