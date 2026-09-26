--liquibase formatted sql
--changeset liquibase:copy_plan_final_grade_data runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for copy_plan_final_grade_data
--rollback: SELECT 1
DROP FUNCTION IF EXISTS assort.copy_plan_final_grade_data(new_plan_code integer, existing_plan_code integer);
CREATE OR REPLACE FUNCTION assort.copy_plan_final_grade_data(new_plan_code integer, existing_plan_code integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
declare
	pkid int;
	new_pk_id int;
begin
        for pkid in 
                select plan_finalize_grade_id from "assort".plan_finalize_grade_master where plan_code = existing_plan_code
        loop
                insert into "assort".plan_finalize_grade_master (plan_code, levels) 
                    (select $1, levels 
                        from "assort".plan_finalize_grade_master where plan_finalize_grade_id = pkid) 
                returning plan_finalize_grade_id into new_pk_id;

                insert into "assort".plan_finalize_grade_attribute (plan_finalize_grade_id, attribute_name, attribute_value) 
               	(select new_pk_id, attribute_name, attribute_value from "assort".plan_finalize_grade_attribute where plan_finalize_grade_id = pkid);
        end loop;
end;
$function$
;