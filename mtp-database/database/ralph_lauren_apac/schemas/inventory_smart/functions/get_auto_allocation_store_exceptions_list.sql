--liquibase formatted sql
--changeset linu.nazil:alloc_rule_store_list runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for alloc_rule_store_list
--rollback: SELECT 1
drop function if exists inventory_smart.get_auto_allocation_store_exceptions_list(refcursor, _rule_code integer, _meta jsonb);
create or replace function inventory_smart.get_auto_allocation_store_exceptions_list(refcursor, _rule_code integer, _meta jsonb)
returns refcursor
language plpgsql
as $function$
declare 
_query_meta_filters text;
_query text;
/*select * from inventory_smart.get_auto_allocation_store_exceptions_list('cur',340616919, '{"limit":{
"limit":10, "page":1
}}'::jsonb);
fetch all from "cur";*/
begin
	_query_meta_filters := global.form_table_query(_meta);
	raise notice 'query filters: %', _query_meta_filters;
	_query := 'SELECT arse.rule_code, arse.store_code, arse.validity, arse.is_active, saf.store_name, saf.channel
    			FROM inventory_smart.alloc_rule_store_exceptions arse
    			JOIN global.store_attributes_filter as saf ON arse.store_code = saf.store_code
    			WHERE arse.rule_code ='|| _rule_code || ' 
				' || _query_meta_filters ||';';
    raise notice 'Query: %', _query;
    open $1 for execute _query;
	return $1;
end
$function$;