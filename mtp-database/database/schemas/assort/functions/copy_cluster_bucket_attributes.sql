--liquibase formatted sql
--changeset liquibase:copy_cluster_bucket_attributes runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for copy_cluster_bucket_attributes
--rollback: SELECT 1
DROP FUNCTION IF EXISTS assort.copy_cluster_bucket_attributes(new_plan_code integer, existing_plan_code integer);
CREATE OR REPLACE FUNCTION assort.copy_cluster_bucket_attributes(new_plan_code integer, existing_plan_code integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
/*
    Author : Pradeep Nayak
    Date: 08-03-2022

    Copies cluster bucket data to new plan
*/
declare 
pkid int;
new_pk_id int;
begin
        for pkid in 
                select cluster_bucket_code from assort.plan_cluster_bucket_map where plan_code = existing_plan_code
        loop
                insert into assort.plan_cluster_bucket_map (plan_code, cluster_name, bucket_id, special_classification, is_optimal, is_final) 
                    (select new_plan_code, cluster_name, bucket_id, special_classification, is_optimal, is_final 
                        from assort.plan_cluster_bucket_map where cluster_bucket_code = pkid) 
                returning cluster_bucket_code into new_pk_id;
                
                insert into assort.plan_cluster_bucket_map_attributes (cluster_bucket_code, attribute_name, attribute_value) 
               	(select new_pk_id, attribute_name, attribute_value from assort.plan_cluster_bucket_map_attributes where cluster_bucket_code = pkid);
        end loop;
end;
$function$
;
