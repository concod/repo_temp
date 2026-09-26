--liquibase formatted sql
--changeset liquibase:random_between runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for random_between
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.random_between(low integer, high integer);
CREATE OR REPLACE FUNCTION inventory_smart.random_between(low integer, high integer)
 RETURNS integer
 LANGUAGE plpgsql
 STRICT
AS $function$
BEGIN
   RETURN floor(random()* (high-low + 1) + low);
END;
$function$
;
