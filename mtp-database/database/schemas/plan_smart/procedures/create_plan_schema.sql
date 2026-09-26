--liquibase formatted sql
--changeset liquibase:create_plan_schema runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for create_plan_schema
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS plan_smart.create_plan_schema(IN tbl_name text, IN channels text[], IN weeks integer[]);
CREATE OR REPLACE PROCEDURE plan_smart.create_plan_schema(IN tbl_name text, IN channels text[], IN weeks integer[])
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
DECLARE
 	channel_part_name TEXT;
 	channel_part_sql  TEXT;
 	channel           TEXT;
 	subpart_sql       text;
    wk                int;
begin
   FOREACH channel in array channels 
   loop
     channel_part_name := regexp_replace(channel, '[ /.-]', '', 'g');
     channel_part_sql := '
           CREATE TABLE IF NOT EXISTS
           plan_smart.' || tbl_name || '_' || channel_part_name ||' PARTITION OF plan_smart.' || tbl_name ||' FOR
           VALUES
           IN ('||''''||channel||''''||')
           PARTITION BY
           RANGE (current_week);';
     raise notice  'channel_part_sql - %',channel_part_sql;
     execute channel_part_sql;
        
     FOREACH wk in array weeks loop
	     
 			subpart_sql := '
 				CREATE TABLE IF NOT EXISTS
 				  plan_smart.' || tbl_name || '_' || channel_part_name || '_' || wk ||' PARTITION OF plan_smart.' || tbl_name || '_' || channel_part_name || ' FOR
 				VALUES
 				FROM (' || wk || ') TO (' || (wk + 1) || ');';
 			raise notice  'subpart_sql %',subpart_sql;
 			execute subpart_sql;
 	  end loop;
   end loop;
end;
$procedure$
;
