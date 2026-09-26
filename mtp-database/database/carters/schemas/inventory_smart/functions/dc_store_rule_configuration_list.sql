--liquibase formatted sql
--changeset adesh:dc_store_rule_configuration_list runOnChange:true stripComments:false splitStatements:false context:MTP-31613 labels:MTP-31613
--comment: MTP-38504 Used to fetch the dc to store rule configuration details.
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.dc_store_rule_configuration_list(input refcursor);
CREATE OR REPLACE FUNCTION inventory_smart.dc_store_rule_configuration_list(input refcursor)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
 
	declare
	 _query text := 'SELECT
	   id, name, display_name, strategy,
		status,  
		created_by,  
		updated_by,  
		created_at ,
		updated_at   
	FROM
    inventory_smart.dc_store_rule_configuration where is_deleted = false order by id asc';
	v_gen_random_uuid text  := gen_random_uuid()::varchar;
	begin
	    raise notice 'Query: %',_query;
		open $1 for execute _query;
		
		perform  global.sp_log(v_gen_random_uuid, 'inventory_smart.dc_store_rule_configuration_list', 'Before returning function value',_query,null);

		RETURN $1;
	end
$function$;  