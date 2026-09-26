--liquibase formatted sql
--changeset liquibase:backup_allocation runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for backup_allocation
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.backup_allocation(input character varying);
CREATE OR REPLACE FUNCTION inventory_smart.backup_allocation(input character varying)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
declare
	begin
        UPDATE 
		  inventory_smart.create_allocation_result_flat_gurobi
		SET
		  pack_dc_allocation_original = pack_dc_allocation
		WHERE 
			allocation_code = $1
			and not is_edited ;-- only first copy which came from allocator
	end
$function$
;
