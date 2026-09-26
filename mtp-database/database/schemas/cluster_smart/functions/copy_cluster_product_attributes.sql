--liquibase formatted sql
--changeset liquibase:added_new_columns_score_rank_removed runOnChange:true stripComments:false splitStatements:false context:added_new_columns_score_rank_duplicates labels:liquibase_project_start
--comment: added_new_columns_score_rank_duplicates_resolved
--rollback: SELECT 1
DROP FUNCTION IF EXISTS cluster_smart.copy_cluster_product_attributes(new_cluser_plan_code integer, existing_cluster_plan_code integer);
CREATE OR REPLACE FUNCTION cluster_smart.copy_cluster_product_attributes(new_cluser_plan_code integer, existing_cluster_plan_code integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
begin
	insert into cluster_smart.plan_product_attributes (cluster_plan_code, attribute_name, is_primary, is_final, levels, score, rank) (select $1, attribute_name , is_primary, is_final, levels, score, rank from "cluster_smart".plan_product_attributes where cluster_plan_code = existing_cluster_plan_code);
end;
$function$
;
