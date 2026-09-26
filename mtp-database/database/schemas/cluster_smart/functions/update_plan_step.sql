--liquibase formatted sql
--changeset liquibase:update_plan_step runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for update_plan_step
--rollback: SELECT 1
DROP FUNCTION IF EXISTS cluster_smart.update_plan_step(input integer, numeric);
CREATE OR REPLACE FUNCTION cluster_smart.update_plan_step(input integer, numeric)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
declare
		_query text;
	begin
		_query :=  'UPDATE cluster_smart.cluster_plan_master SET steps= '|| $2 ||', updated_at = now() where cluster_plan_code = ' || $1 || ' ;';
		execute _query;
	end
	$function$
;
