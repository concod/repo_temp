--liquibase formatted sql
--changeset liquibase:plan_product_attributes_list runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for plan_product_attributes_list
--rollback: SELECT 1
DROP FUNCTION IF EXISTS assort.plan_product_attributes_list(input integer);
CREATE OR REPLACE FUNCTION assort.plan_product_attributes_list(input integer)
 RETURNS TABLE(plan_code integer, attribute_name character varying, is_primary boolean, is_final boolean)
 LANGUAGE plpgsql
AS $function$
begin
return query execute 'select
	plan_code, attribute_name, is_primary, is_final
from
	assort.plan_product_attributes
	where plan_code = ' || $1 ||'
	;';
end $function$

;