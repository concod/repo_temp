--liquibase formatted sql
--changeset shaik.azmathulla@impactanalytics.co:get_table_version runOnChange:true stripComments:false splitStatements:false context:DAT-1517 labels:DAT-1517
--comment: get_table_version -To get latest version code...
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.get_table_version(text) CASCADE;
CREATE OR REPLACE FUNCTION global.get_table_version(_tbl in text)
RETURNS int
IMMUTABLE
LANGUAGE plpgsql
AS $function$
DECLARE
	_v int;
BEGIN
  SELECT MAX(version_code) AS version_code
  INTO _v 
  FROM global.versioning 
  WHERE tbl_name = _tbl AND updated_at IS NOT NULL ;
  
RETURN _v;
 
END;
$function$;
