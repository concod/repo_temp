--liquibase formatted sql
--changeset srishti.kumari:MTP-51495 runOnChange:true stripComments:false splitStatements:false context:MTP-70567 Fixing auto-scheduler list API labels:MTP-70567 Fixing auto-scheduler list API
--comment: MTP-70567 Added order by name
--rollback: SELECT 1
drop function if exists inventory_smart.get_auto_allocation_rule_lists(refcursor, _meta jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.get_auto_allocation_rule_lists(refcursor, _meta jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
declare 
_query_meta_filters text;
_query text;
/*select * from inventory_smart.get_auto_allocation_rule_lists('cur', '{"limit":{
"limit":10, "page":1
}}'::jsonb);
fetch all from "cur";*/
begin
	_query_meta_filters := global.form_table_query(_meta);
	_query := 'SELECT 
                    r.rule_code, 
                    r.rule_name, 
                    r.rule_definitions,
                    r.is_default, 
                    r.updated_at,  
                    um_created.user_name AS updated_by,
                    COALESCE(s.store_exceptions, 0) AS store_exceptions
               FROM (select * from inventory_smart.alloc_rule_master) as r
               LEFT JOIN (
                   SELECT 
                       rule_code, 
                       COUNT(store_code) AS store_exceptions 
                   FROM 
                       inventory_smart.alloc_rule_store_exceptions 
                   GROUP BY 
                       rule_code
               ) AS s ON r.rule_code = s.rule_code
               LEFT JOIN global.user_master AS um_created ON r.updated_by = um_created.user_code ' || _query_meta_filters ||';';
    raise notice 'Query: %', _query;
    open $1 for execute _query;
	return $1;
end
$function$
;