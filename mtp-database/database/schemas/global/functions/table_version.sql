--liquibase formatted sql
--changeset linu.nazil:table_version runOnChange:true stripComments:false splitStatements:false context:Release_3 labels:CI-137
--comment: initial changeset for table_version
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.table_version(_tbl in text);
CREATE OR REPLACE FUNCTION global.table_version(_tbl in text)
RETURNS int
IMMUTABLE
LANGUAGE plpgsql
AS $function$
DECLARE
	_v int;
BEGIN

  SELECT MAX(version_code) AS version_code
  INTO _v 
  FROM global.rcl_versioning 
  WHERE tbl_name = _tbl AND updated_at IS NOT NULL ;
  
 RETURN _v;
 
END;
$function$;