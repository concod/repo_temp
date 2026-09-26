--liquibase formatted sql
--changeset liquibase:copy_plan_cluster_opt_data runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for copy_plan_cluster_opt_data
--rollback: SELECT 1
DROP FUNCTION IF EXISTS assort.copy_plan_cluster_opt_data(new_plan_code integer, existing_plan_code integer);
/*
    Author : Pradeep Nayak
    Date: 08-03-2022

    Copies plan cluster opt data to new plan
*/
CREATE OR REPLACE FUNCTION assort.copy_plan_cluster_opt_data(new_plan_code integer, existing_plan_code integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
declare
 pk_id int;
 new_pk_id int;
begin
	for pk_id in select plan_clu_opt_id from "assort".plan_cluster_opt_master where plan_code = $2
	loop 
		insert into "assort".plan_cluster_opt_master (plan_code, levels, attribute_value)
			(select $1, levels, attribute_value from "assort".plan_cluster_opt_master where plan_clu_opt_id=pk_id) 
		returning plan_clu_opt_id into new_pk_id;
		insert into "assort".plan_cluster_opt_attribute (plan_clu_opt_id, attribute_name, attribute_value) 
			(select new_pk_id, attribute_name, attribute_value from "assort".plan_cluster_opt_attribute where plan_clu_opt_id=pk_id);
	end loop;
	
end;
$function$
;
