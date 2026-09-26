--liquibase formatted sql
--changeset liquibase:update_dependencies runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for update_dependencies
--rollback: SELECT 1
DROP FUNCTION IF EXISTS cache.update_dependencies(input character varying);
CREATE OR REPLACE FUNCTION cache.update_dependencies(input character varying)
 RETURNS void
 LANGUAGE plpgsql
 PARALLEL SAFE
AS $function$
BEGIN
raise notice 'update_dependencies';
END
  $function$
;
