--liquibase formatted sql
--changeset liquibase:plan_performance_attributes_list runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for plan_performance_attributes_list
--rollback: SELECT 1
DROP FUNCTION IF EXISTS cluster_smart.plan_performance_attributes_list(input integer);
CREATE OR REPLACE FUNCTION cluster_smart.plan_performance_attributes_list(input integer)
 RETURNS TABLE(cluster_plan_code integer, attribute_name character varying, score real, rank smallint, is_final boolean, levels jsonb)
 LANGUAGE plpgsql
AS $function$
begin
return query execute 'select
    cluster_plan_code, attribute_name, score, rank, is_final, levels
from
    cluster_smart.plan_performance_attributes
    where cluster_plan_code = ' || $1 ||'
order by
    1 desc;';
end $function$
;