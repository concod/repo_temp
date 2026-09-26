--liquibase formatted sql
--changeset linu.nazil:persist_rcl_create_constraints_exceptions runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for persist_rcl_create_constraints_exceptions
--rollback: SELECT 1
--this function is to persist all the new entries from temp table to rcl_master, rule and constraint table. this is executed after rcl_create_constraints and update_rcl_create_constraints;
drop function if exists inventory_smart.persist_rcl_create_constraints_exceptions(_temp_tbl_name text);
create or replace function inventory_smart.persist_rcl_create_constraints_exceptions(_temp_tbl_name text)
returns void
language plpgsql
as $function$
declare 
   /*select * from inventory_smart.persist_rcl_create_constraints_exceptions('_temp_tbl_name');*/
begin
    --  delete from base table
	execute 'delete from inventory_smart.rcl_constraint_master_exceptions where (rcl_code, rule_code, store_code) in (select rcl_code, rule_code, store_code from public.' || _temp_tbl_name || ');';
  	--  insert into BASE table
  	execute 'insert into inventory_smart.rcl_constraint_master_exceptions(rcl_code, rule_code, exception_rule_name, store_code, wos, dos, min_stock, max_stock, created_by, created_at, validity) 
                       select rcl_code, rule_code, exception_rule_name, store_code, wos, dos, min_stock, max_stock, created_by, created_at, validity from public.' || _temp_tbl_name || ';';

end;
$function$;