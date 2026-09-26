--liquibase formatted sql
--changeset subhash.pophale@impactanalytics.co:create_item_schema runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:item_smart_initial_commit
--comment: initial changeset for create_item_schema
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS item_smart.create_item_schema(IN tbl_name text, IN depts text[], IN channels text[], IN weeks integer[]);
CREATE OR REPLACE PROCEDURE item_smart.create_item_schema(IN tbl_name text, IN depts text[], IN channels text[], IN weeks integer[])
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
DECLARE
 	channel_part_name text;
 	channel_part_sql  text;
 	dept_part_name    text;
 	dept_part_sql     text;
    wk_part_name      text;
 	wk_part_sql       text;
 	channel           text;
    dept              text;
    wk                int;
begin
   foreach dept in array depts 
   loop
     dept_part_name := regexp_replace(dept, '[ /.-]', '', 'g');
     dept_part_sql  := '
     create table if not exists item_smart.' || tbl_name || '_' || dept_part_name ||' PARTITION OF item_smart.' || tbl_name ||' FOR
     values in ('||''''||dept||''''||')
     partition by list (channel)';
     --raise notice  'dept_part_sql - %',dept_part_sql;
     execute dept_part_sql;	
    
     foreach channel in array channels 
     loop
       channel_part_name := regexp_replace(channel, '[ /.-]', '', 'g');
       channel_part_sql  := '
       create table if not exists item_smart.' || tbl_name || '_' || dept_part_name || '_' || channel_part_name ||' PARTITION OF item_smart.' || tbl_name || '_' || dept_part_name||' FOR
       values in ('||''''||channel||''''||')
       partition by list (current_week)';
       --raise notice  'channel_part_sql - %',channel_part_sql;
       execute channel_part_sql;
        
       foreach wk in array weeks 
       loop
 	     wk_part_name := wk::text;
	     wk_part_sql  := '
 		 create table if not exists item_smart.' || tbl_name || '_' || dept_part_name || '_' || channel_part_name || '_'|| wk_part_name||' PARTITION OF item_smart.' || tbl_name || '_' || dept_part_name|| '_' || channel_part_name||' FOR
         values in ('||wk||')';
 	     raise notice  'wk_part_sql %',wk_part_sql;
 	     execute wk_part_sql;
       end loop;
 	 end loop;
   end loop;
end;
$procedure$
;

DROP PROCEDURE if exists item_smart.create_item_schema(IN tbl_name text, IN depts text[], IN months integer[], IN channels text[]);

CREATE OR REPLACE PROCEDURE item_smart.create_item_schema(IN tbl_name text, IN depts text[], IN months integer[], IN channels text[])
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
DECLARE
 	channel_part_name text;
 	channel_part_sql  text;
 	dept_part_name    text;
 	dept_part_sql     text;
    month_part_name      text;
 	month_part_sql       text;
 	channel           text;
    dept              text;
    month                int;
begin
   foreach dept in array depts 
   loop
     dept_part_name := regexp_replace(dept, '[ /.-]', '', 'g');
     dept_part_sql  := '
     create table if not exists item_smart.' || tbl_name || '_' || dept_part_name ||' PARTITION OF item_smart.' || tbl_name ||' FOR
     values in ('||''''||dept||''''||')
     partition by list (channel)';
     --raise notice  'dept_part_sql - %',dept_part_sql;
     execute dept_part_sql;	
    
     foreach channel in array channels 
     loop
       channel_part_name := regexp_replace(channel, '[ /.-]', '', 'g');
       channel_part_sql  := '
       create table if not exists item_smart.' || tbl_name || '_' || dept_part_name || '_' || channel_part_name ||' PARTITION OF item_smart.' || tbl_name || '_' || dept_part_name||' FOR
       values in ('||''''||channel||''''||')
       partition by list (month)';
       --raise notice  'channel_part_sql - %',channel_part_sql;
       execute channel_part_sql;
        
       foreach month in array months 
       loop
 	     month_part_name := month::text;
	     month_part_sql  := '
 		 create table if not exists item_smart.' || tbl_name || '_' || dept_part_name || '_' || channel_part_name || '_'|| month_part_name||' PARTITION OF item_smart.' || tbl_name || '_' || dept_part_name|| '_' || channel_part_name||' FOR
         values in ('||month||')';
 	     --raise notice  'month_part_sql %',month_part_sql;
 	     execute month_part_sql;
       end loop;
 	 end loop;
   end loop;
end;
$procedure$
;
