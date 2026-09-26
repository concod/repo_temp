--liquibase formatted sql
--changeset ashish@impactanalytics.co:clear_di_versions runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for clear_di_versions
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.clear_di_versions() cascade;
CREATE OR REPLACE FUNCTION global.clear_di_versions()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
 begin
   if new.deleted_at is not null then 
     if old.new_tbl_name is not null then
     	execute 'DROP TABLE IF EXISTS ' || old.new_tbl_name || ';';
     end if;
   end if;
   return new;
 end;
 $function$
;

create or replace trigger clear_di_versions before
update
    on
    global.versioning for each row execute function global.clear_di_versions();
