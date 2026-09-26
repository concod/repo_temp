--liquibase formatted sql
--changeset liquibase:update_plan_group_id runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for update_plan_group_id
--rollback: SELECT 1
DROP FUNCTION IF EXISTS cluster_smart.update_plan_group_id(input integer, integer);
CREATE OR REPLACE FUNCTION cluster_smart.update_plan_group_id(input integer, integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
declare
		_query text;
	begin
		_query := 'insert into cluster_smart.cluster_plan_attributes (cluster_plan_code, attribute_name, attribute_value) 
			values (' || $1 || ' , ''store_group_id'', ' || $2 || ') on conflict 
			(cluster_plan_code, attribute_name) do update set attribute_value = ' || $2 || ' ;';
		execute _query;
	end
	$function$
;