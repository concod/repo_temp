--liquibase formatted sql
--changeset liquibase:set_active_mapping_current_date runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for set_active_mapping_current_date
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.set_active_mapping_current_date();
CREATE OR REPLACE FUNCTION global.set_active_mapping_current_date()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
declare
	begin
		
		UPDATE global.product_mapping_product_store SET is_active = COALESCE(validity @> CURRENT_DATE, false);
	end
$function$
;
