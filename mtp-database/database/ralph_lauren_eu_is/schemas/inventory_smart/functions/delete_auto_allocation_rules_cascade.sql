--liquibase formatted sql
--changeset linu.nazil:delete_alloc_rules_cascade runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for delete_alloc_rules_cascade
--rollback: SELECT 1
drop function if exists inventory_smart.delete_auto_allocation_rules_cascade(_rule_codes int[]);
create or replace function inventory_smart.delete_auto_allocation_rules_cascade(_rule_codes int[])
returns void
language plpgsql
as $function$
declare 
begin 
	execute 'delete from inventory_smart.alloc_rule_master where rule_code = any(' || quote_literal(_rule_codes) || ');';
end
$function$;