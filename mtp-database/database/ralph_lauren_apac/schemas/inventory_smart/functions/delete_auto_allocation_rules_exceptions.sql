--liquibase formatted sql
--changeset linu.nazil:delete_alloc_rules_exceptions runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for delete_alloc_rules_exceptions
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.delete_auto_allocation_rules_exceptions(_rule_code integer, _store_codes text[]);
CREATE OR REPLACE FUNCTION inventory_smart.delete_auto_allocation_rules_exceptions(_rule_code integer, _store_codes text[] DEFAULT NULL::text[])
 RETURNS void
 LANGUAGE plpgsql
AS $function$
declare 
_sql text;
BEGIN
    IF cardinality(_store_codes)> 0 THEN
         _sql := 'DELETE FROM inventory_smart.alloc_rule_store_exceptions WHERE rule_code = ' || _rule_code || ' AND store_code = ANY(' || quote_literal(_store_codes) || ');';
       raise notice '2 sql: %', _sql;
      execute _sql;
    ELSE
         -- Delete all records for the rule_code if store_codes is NULL
        _sql := 'DELETE FROM inventory_smart.alloc_rule_store_exceptions WHERE rule_code = ' || _rule_code || ';';
       raise notice ' sql: %', _sql;
      execute _sql;
    END IF;
END;
$function$
;