--liquibase formatted sql
--changeset liquibase:available_pud_list runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for available_pud_list
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.available_pud_list(input text);
CREATE OR REPLACE FUNCTION global.available_pud_list(input text)
 RETURNS TABLE(pud_code integer, name character varying)
 LANGUAGE plpgsql
AS $function$
	begin
RETURN QUERY select pud.pud_code, pud.name from (SELECT * FROM "global".style_mapping where mapping_type = 'style_product_unit_mapping' and style = $1) sm join (SELECT * FROM "global".product_unit_definitions where is_deleted = false) pud
		on sm.pud_code = pud.pud_code;
 	end
$function$
;
