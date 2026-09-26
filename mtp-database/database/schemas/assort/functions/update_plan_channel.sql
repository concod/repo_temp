--liquibase formatted sql
--changeset liquibase:update_plan_channel runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for update_plan_channel
--rollback: SELECT 1
DROP FUNCTION IF EXISTS assort.update_plan_channel(input integer, integer);
CREATE OR REPLACE FUNCTION assort.update_plan_channel(input integer, integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
 	/*
 Function/Procedure name: assort.update_plan_channel
 Created by: Hemant Kumar Singh
 Created at: 30-Sep-2022
 No of input parameter: 2
 Parameter Description : $1 =  plan code , $2 =  cluster_plan_code
 ​
 Purpose: This function been created to getting scren  
 ​
 Calling Statement:
 ​
 SELECT assort.update_plan_channel(1554,10);
 ​
 ​
 Hemant Kumar SIngh:updating in plan master channels from cluster smart cluster_plan_master table 
 */
 declare
 		_channel_query text;
 		_sub_channel_query text;
 	begin
	 	--updating channel cluster_smart to assort 
 		_channel_query :=  ' UPDATE assort.plan_master
 						SET channel=cspm.channel
 						FROM (SELECT  channel
 						FROM cluster_smart.cluster_plan_master
 						where cluster_plan_code ='|| $1 ||') AS cspm
 						WHERE plan_code='|| $2 ||';';
 		execute _channel_query;
 		--updating sub channel cluster_smart to assort 
 		_channel_query :=  'INSERT INTO assort.plan_attributes 
							SELECT '|| $2 ||', attribute_name ,attribute_value 
							FROM cluster_smart.cluster_plan_attributes
							where cluster_plan_code ='|| $1 ||' and attribute_name =''sub_channel'';';
 		execute _channel_query;
 	end
 	$function$
;
