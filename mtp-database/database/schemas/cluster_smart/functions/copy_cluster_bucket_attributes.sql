--liquibase formatted sql
--changeset mohoammed.ayaz@impactanalytics.co:copy_cluster_bucket_attributes,bucket_attribute_value runOnChange:true stripComments:false splitStatements:false context:MTP-48524 labels: add_bucket_attribute_value_copy
--comment: initial changeset for copy_cluster_bucket_attributes, add bucket_attribute_value to copy
--rollback: SELECT 1
DROP FUNCTION IF EXISTS cluster_smart.copy_cluster_bucket_attributes(new_plan_code integer, existing_plan_code integer);
CREATE OR REPLACE FUNCTION cluster_smart.copy_cluster_bucket_attributes(new_plan_code integer, existing_plan_code integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
/*
    Author : Mohammed Ayaz
    Date: 22-03-2023

    Copies cluster bucket data to new cluster plan
*/
declare 
pkid int;
new_pk_id int;
begin
        for pkid in 
                select cluster_bucket_code from cluster_smart.plan_cluster_bucket_map where cluster_plan_code = existing_plan_code
        loop
                insert into cluster_smart.plan_cluster_bucket_map (cluster_plan_code, cluster_name, bucket_id, special_classification, is_optimal, is_final, bucket_attribute_value)
                    (select $1, cluster_name, bucket_id, special_classification, is_optimal, is_final, bucket_attribute_value
                        from cluster_smart.plan_cluster_bucket_map where cluster_bucket_code = pkid) 
                returning cluster_bucket_code into new_pk_id;
                
                insert into cluster_smart.plan_cluster_bucket_map_attributes (cluster_bucket_code, attribute_name, attribute_value) 
               	(select new_pk_id, attribute_name, attribute_value from cluster_smart.plan_cluster_bucket_map_attributes where cluster_bucket_code = pkid);
        end loop;
end;
$function$
;
