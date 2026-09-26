--liquibase formatted sql
--changeset ashish@impactanalytics.co:clear_rcl_version runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for clear_rcl_version
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.clear_rcl_version() cascade;
CREATE OR REPLACE FUNCTION global.clear_rcl_version()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
 begin
   if new.deleted_at is not null then 
 	 execute 'DROP TABLE IF EXISTS global.rcl_vc_' || old.version_code || ';';
   end if;
   return new;
 end;
 $function$
;

create or replace trigger clear_rcl_version before
update
    on
    global.rcl_versioning for each row execute function global.clear_rcl_version();
