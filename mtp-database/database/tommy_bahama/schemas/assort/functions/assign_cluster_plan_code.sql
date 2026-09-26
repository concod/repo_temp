--liquibase formatted sql
--changeset liquibase:assign_cluster_plan_code runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for assign_cluster_plan_code
--rollback: SELECT 1
DROP FUNCTION IF EXISTS assort.assign_cluster_plan_code(integer, integer);
CREATE OR REPLACE FUNCTION assort.assign_cluster_plan_code(integer, integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
declare
_delete_query text;
_plan_cluster_code text;
_updated_query text;
   /*
    Function/Procedure name: assort.assign_cluster_plan_code
    Created by: Hemant Kumar Singh
    Created at: 27-Jun-2022
    No of input parameter: 2
    Parameter Description : $1 = cluster_plan_code, &2 = plan_code
    Purpose: This function been created to getting delete plan omni wedge   
    Calling Statement:
    SELECT assort.assign_cluster_plan_code(5001,1779);
    Hemant Kumar SIngh:getting updated cluster_plan_code in plan attributes table 
    */
begin
       
        _delete_query = 'DELETE FROM assort.plan_attributes
                        WHERE attribute_name=''cluster_plan_code''  AND plan_code=' || $1 ||' ';  
        raise notice '_delete_query%', _delete_query;  
         execute _delete_query; 
                       
       select attribute_value::int4 into _plan_cluster_code
       	FROM assort.plan_attributes
        		where plan_code=$2 and attribute_name='cluster_plan_code' ;
        	
       _updated_query = ' INSERT INTO assort.plan_attributes 
									(plan_code, attribute_name, attribute_value)
                                    VALUES(' || $1 ||', ''cluster_plan_code'','''||_plan_cluster_code||''');';
                                   
        raise notice '_updated_channels_query%', _updated_query;                           
                                    
        execute _updated_query;     
       	
   
end;
$function$
;