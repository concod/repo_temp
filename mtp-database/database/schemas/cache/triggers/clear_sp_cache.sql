--liquibase formatted sql
--changeset liquibase:clear_sp_cache runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for clear_sp_cache
--rollback: SELECT 1
DROP FUNCTION IF EXISTS cache.clear_sp_cache() cascade;
CREATE OR REPLACE FUNCTION cache.clear_sp_cache()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
 declare
   _mv_id text;
 begin
   if old.payload->>'req_type' = 'sp' then 
     select 
       value->>'table' 
     from 
       cache.request_data 
     where 
       req_code = old.req_code into _mv_id;
     -- raise notice '_mv_id: %', _mv_id;
     if _mv_id is not null then
     	-- raise notice 'dropping mv: %', _mv_id;
     	execute 'DROP MATERIALIZED VIEW IF EXISTS "cache"."' || _mv_id || '" CASCADE;';
     end if;
   end if;
   return old;
 end;
 $function$
;
create or replace trigger clear_sp_cache before
delete
    on
    "cache".request_tracker for each row execute function cache.clear_sp_cache();
