--liquibase formatted sql
--changeset liquibase:plan_carryover_styles_list runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for plan_carryover_styles_list
--rollback: SELECT 1
DROP FUNCTION IF EXISTS assort_smart.plan_carryover_styles_list(input integer);
CREATE OR REPLACE FUNCTION assort_smart.plan_carryover_styles_list(input integer)
 RETURNS TABLE(l0_name character varying, l1_name character varying, l2_name character varying, l3_name character varying, style_id text, style_description text, fabrication text, selling_collection text, price_point double precision)
 LANGUAGE plpgsql
AS $function$
/*
Function/Procedure name: assort_smart.plan_carryover_styles_list
Created by: Hemant Kumar Singh
Created at: 16-Jan-2023
Update at: 	16-Jan-2023
No of input parameter: 1
Parameter Description : $1 = plan code 

Purpose: This function been created to get plan l3 aps details list for 2-1 screen 
 
Calling Statement:
SELECT assort_smart.plan_carryover_styles_list(1724);

Hemant Kumar SIngh: getting plan carryover styles  level list details
*/
declare
	_query_combine text;
	begin
		_query_combine := 'select l0_name,l1_name,l2_name,l3_name,style as style_id,max(style_description) as style_description , max(fabrication) as fabrication, max(selling_collection) as selling_collection ,
 							max(original_price) as price_point
 							from
 							(select levels ->>''style_id'' as style
 							from assort_smart.plan_carryover_styles pcs
 							where plan_code = ' || $1 ||'
 							group by 1) as a
 							join global.product_attributes_filter pa
 							using (style)
 							group by 1,2,3,4,5';
		raise notice '%', _query_combine;
		RETURN QUERY execute _query_combine;
 	end
$function$
;
