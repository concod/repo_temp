--liquibase formatted sql
--changeset shaik.azmathulla:get_rcl_version runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:MTP-82122
--comment: initial changeset for get_rcl_version
--rollback: SELECT 1

DROP FUNCTION IF EXISTS global.get_rcl_version CASCADE ;
CREATE OR REPLACE FUNCTION global.get_rcl_version(_table character varying)
RETURNS integer
LANGUAGE 'plpgsql'
AS $function$
declare
	_version int;
begin
  select
	max(version_code) into _version
from
	"global".rcl_versioning 
	where tbl_name = _table and updated_at is not null ;
 return _version;
end;
$function$;


--changeset shaik.azmathulla:rcl_versions_constraint_latest_V2 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:MTP-82122
--comment: initial changeset for rcl_versions_constraint_latest_V2
--rollback: SELECT 1
DROP VIEW IF EXISTS global.rcl_versions_constraint_latest;
CREATE OR REPLACE VIEW global.rcl_versions_constraint_latest
AS
SELECT *
FROM global.rcl_versions_constraint
WHERE rcl_versions_constraint.version_code = global.get_rcl_version('global.rcl_versions_constraint') ;