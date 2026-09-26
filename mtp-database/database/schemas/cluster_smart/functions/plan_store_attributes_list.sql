--liquibase formatted sql
--changeset hemanth.cs@impactanalytics.co:plan_store_attributes_list runOnChange:true stripComments:false splitStatements:false context:MTP-31708 labels:liquibase_project_start
--comment: initial changeset for cluster_smart_add_plan_store_attributes
--rollback: SELECT 1
DROP FUNCTION IF EXISTS cluster_smart.plan_store_attributes_list(input integer);
CREATE OR REPLACE FUNCTION cluster_smart.plan_store_attributes_list(input integer)
 RETURNS TABLE(cluster_plan_code integer, attribute_name character varying, is_primary boolean, is_final boolean)
 LANGUAGE plpgsql
AS $function$
/*
    Author : Hemanth C S
    Date: 29-01-2024

    Fetches the store_attributes for clustering.

    Calling Statement: select * from cluster_smart.add_plan_store_attributes(77);
*/
begin
return query execute 'select
    cluster_plan_code, attribute_name, is_primary, is_final
from
    cluster_smart.plan_store_attributes
    where cluster_plan_code = ' || $1 ||'
    ;';
end $function$
;