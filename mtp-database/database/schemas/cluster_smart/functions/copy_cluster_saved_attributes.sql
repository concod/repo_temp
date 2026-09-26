--liquibase formatted sql
--changeset liquibase:copy_cluster_saved_attributes runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for copy_cluster_saved_attributes
--rollback: SELECT 1
DROP FUNCTION IF EXISTS cluster_smart.copy_cluster_saved_attributes(new_cluster_plan_code integer, existing_cluster_plan_code integer);
/*
    Author : Mohammed Ayaz
    Date: 22-03-2023

    Copies cluster final saved data to new plan
*/

CREATE OR REPLACE FUNCTION cluster_smart.copy_cluster_saved_attributes(new_cluster_plan_code integer, existing_cluster_plan_code integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
declare
pkid int;
new_pkid int;
begin
		for pkid in select cluster_code_id from "cluster_smart".plan_cluster_final where cluster_plan_code = existing_cluster_plan_code
		loop 
       		insert into "cluster_smart".plan_cluster_final (cluster_plan_code, cluster_name, attribute_value) 
       		( select $1, cluster_name, attribute_value from "cluster_smart".plan_cluster_final
       			where cluster_code_id = pkid) returning cluster_code_id into new_pkid;
       		insert into "cluster_smart".plan_cluster_store_final (cluster_code_id, attribute_name, attribute_value) 
       			(select new_pkid, attribute_name, attribute_value from "cluster_smart".plan_cluster_store_final where cluster_code_id=pkid);
      	end loop;
end;
$function$

;