--liquibase formatted sql
--changeset team@bealls:remove_plan  runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: Initial version for bealls
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.remove_plan(input character varying, integer);
DROP FUNCTION IF EXISTS inventory_smart.remove_plan(input character varying[], integer);
CREATE OR REPLACE FUNCTION inventory_smart.remove_plan(input character varying[], integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
	begin
		update "inventory_smart".plan_master SET is_deleted = true, updated_by = $2, updated_at = now() where plan_code = any($1);
		update "inventory_smart".create_allocation_result_flat_gurobi SET allocated_total = 0, updated_by = $2, updated_at = now() where allocation_code = any($1);
	end
$function$
;
