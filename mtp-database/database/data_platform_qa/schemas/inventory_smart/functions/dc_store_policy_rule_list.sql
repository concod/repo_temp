--liquibase formatted sql
--changeset liquibase:dc_store_policy_rule_list_modified runOnChange:true stripComments:false splitStatements:false context:MTP-63019 labels:MTP-63019
--comment: MTP-63019 Used to list rule definitions of dc store policy
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.dc_store_policy_rule_list(refcursor, text);
CREATE OR REPLACE FUNCTION inventory_smart.dc_store_policy_rule_list(input refcursor, text)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
declare 
_query_part text;
v_gen_random_uuid text  := gen_random_uuid()::varchar;
begin

    _query_part = '
				SELECT 
					rule_name, 
					rule_structure, 
					default_value, 
					is_mandatory 
				FROM inventory_smart.dc_store_policy_rule
				WHERE rule_type='''||$2||'''';

	raise notice '%', _query_part;
    OPEN $1 FOR execute _query_part;  
	perform  global.sp_log(v_gen_random_uuid, 'inventory_smart.dc_store_policy_rule_list', 'Before returning function value',_query_part,jsonb_build_object('rule_type',$2));
	RETURN $1;

END;
$function$
;
