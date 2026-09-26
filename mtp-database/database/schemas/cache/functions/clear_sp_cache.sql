--liquibase formatted sql
--changeset sadhana.j:latest_changes runOnChange:true stripComments:false splitStatements:false context:Release_1_1 labels:liquibase_project_start
--comment: latest_changes
--rollback: SELECT 1
DROP FUNCTION IF EXISTS cache.clear_sp_cache(jsonb);


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
