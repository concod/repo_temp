--liquibase formatted sql
--changeset akshay.jain:delete_rules runOnChange:true stripComments:false splitStatements:false context:Release_1_1 labels:liquibase_project_start
--comment: initial changeset for delete_rules
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.delete_rules(input integer[]);
CREATE OR REPLACE FUNCTION global.delete_rules(input integer[])
 RETURNS TABLE(rule_code integer)
 LANGUAGE plpgsql
AS $function$
declare
	_query_combine text:='';
	begin
		
		_query_combine := 'delete from  global.rcl_product_mapping_product_store_rule rpmps where rule_code = any('||  quote_literal($1) || ') returning rule_code';
		raise notice '%', _query_combine;
		return query execute _query_combine;
	end
	$function$
;
