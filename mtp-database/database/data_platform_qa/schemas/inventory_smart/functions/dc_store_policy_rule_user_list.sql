--liquibase formatted sql
--changeset liquibase:dc_store_policy_rule_user_list_v2 runOnChange:true stripComments:false splitStatements:false context:MTP-63019 labels:MTP-63019
--comment: MTP-63019 Used to list all the dc store policy rules and added email in updated_by 
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.dc_store_policy_rule_user_list(refcursor, text, jsonb, integer);
CREATE OR REPLACE FUNCTION inventory_smart.dc_store_policy_rule_user_list(input refcursor, text, table_filters jsonb, rule_code integer)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
declare 
_query_part text;
_query_table_filters text := '';
_query_all text := '';
v_gen_random_uuid text  := gen_random_uuid()::varchar;
begin
	
    _query_table_filters := global.form_table_query(table_filters);

    _query_part = '
				SELECT * FROM (SELECT
					rule_code,
					rule_name, 
					um.email as updated_by, 
					TO_CHAR(dspur.updated_at, ''MM/DD/YYYY'') AS updated_at,
					is_deletable,
					CASE WHEN rule_code = ' || COALESCE(quote_literal($4), 'NULL') || ' THEN true ELSE false END as is_selected
				FROM inventory_smart.dc_store_policy_user_rule dspur
				LEFT JOIN global.user_master um 
				    ON um.user_code = dspur.updated_by
				WHERE dspur.is_deleted=false and rule_type='''|| $2 ||''' 
				ORDER BY 
					is_selected desc,
					(is_deletable is false) desc, 
					rule_code desc) x';

	_query_all = _query_part || ' ' || _query_table_filters;
	raise notice '_query_all %', _query_all;
    OPEN $1 FOR execute _query_all;  

   	perform  global.sp_log(v_gen_random_uuid, 'inventory_smart.dc_store_policy_rule_user_list', 'Before returning function value',_query_all,jsonb_build_object('rule_type',$2,'table_filters',$3));

	RETURN $1;

END;
$function$
;