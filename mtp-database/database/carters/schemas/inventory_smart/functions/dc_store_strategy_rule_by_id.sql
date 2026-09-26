--liquibase formatted sql
--changeset liquibase:dc_store_strategy_rule_by_id runOnChange:true stripComments:false splitStatements:false context:MTP-31613 labels:MTP-31613
--comment: MTP-38504 Used to fetch the dc to store strategy rule by rule_id.
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.dc_store_strategy_rule_by_id(input refcursor,  rule_id int4);
CREATE OR REPLACE FUNCTION inventory_smart.dc_store_strategy_rule_by_id(input refcursor,  rule_id int4)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
 
	declare
	 _query text := 'SELECT
	   id, name, 
		rule_def,  
		is_default,
		is_deleted,
		created_by,  
		updated_by,  
		created_at ,
		updated_at   
	FROM
    "inventory_smart".dc_store_strategy_rule where id = ' || rule_id ;
	v_gen_random_uuid text  := gen_random_uuid()::varchar;
	begin
	    raise notice 'Query: %',_query;
		open $1 for execute _query;
		
		perform  global.sp_log(v_gen_random_uuid, 'inventory_smart.dc_store_strategy_rule_by_id', 'Before returning function value',_query,jsonb_build_object('rule_id',rule_id));
		
		RETURN $1;
	end
$function$
;  

