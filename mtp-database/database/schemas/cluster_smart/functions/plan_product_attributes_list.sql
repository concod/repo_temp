--liquibase formatted sql
--changeset liquibase:update_plan_product_attributes_lists runOnChange:true stripComments:false splitStatements:false context:MTP-52669-list-update labels:liquibase_project_start
--comment: Update function to new columns in the table response order
--rollback: SELECT 1
DROP FUNCTION IF EXISTS cluster_smart.plan_product_attributes_list(input integer);
CREATE OR REPLACE FUNCTION cluster_smart.plan_product_attributes_list(input integer)
 RETURNS TABLE(cluster_plan_code integer, attribute_name character varying, 
 score real, rank smallint, is_final boolean, is_primary boolean, levels jsonb)
 LANGUAGE plpgsql
AS $function$
begin
return query execute 'select
    cluster_plan_code, attribute_name, score, rank, is_final, is_primary, levels
from
    cluster_smart.plan_product_attributes
    where cluster_plan_code = ' || $1 ||'
    ;';
end $function$
;