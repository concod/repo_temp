--liquibase formatted sql
--changeset suchithra.pr@impactanalytics.co:create_item_schema_dept_week runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:item_smart_initial_commit
--comment: initial changeset for create_item_schema_dept_week
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS item_smart.create_item_schema_dept_week(IN tbl_name text, IN depts text[], IN weeks integer[]);
CREATE OR REPLACE PROCEDURE item_smart.create_item_schema_dept_week(IN tbl_name text, IN depts text[], IN weeks integer[])
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
DECLARE
 	dept_part_name    text;
 	dept_part_sql     text;
    wk_part_name      text;
 	wk_part_sql       text;
 	channel           text;
    dept              text;
    wk                int;
    v_week_part_key   text;
begin
   foreach dept in array depts 
   loop
     dept_part_name := regexp_replace(dept, '[ /.-]', '', 'g');
     dept_part_sql  := '
     create table if not exists item_smart.' || tbl_name || '_' || dept_part_name ||' PARTITION OF item_smart.' || tbl_name ||' FOR
     values in ('||''''||dept||''''||')
     partition by list (current_week)';
     --raise notice  'dept_part_sql - %',dept_part_sql;
     execute dept_part_sql;	
    
       foreach wk in array weeks 
       loop
 	     wk_part_name := wk::text;
         raise notice  'wk:%',wk;
         v_week_part_key := item_smart.get_md5_from_array(array[dept,wk::text]);
         raise notice  'v_week_part_key_with_function: %',v_week_part_key;
		 insert into item_smart.table_partition_mapping (table_name, dept, week, md5sum)
		 values (tbl_name, dept,wk, v_week_part_key)
		 on conflict do nothing;
	     wk_part_sql  := '
 		 create table if not exists item_smart.' || tbl_name || '_' || v_week_part_key||' PARTITION OF item_smart.' || tbl_name || '_' || dept_part_name|| 'FOR
         values in ('||wk||')';
 	     raise notice  'wk_part_sql %',wk_part_sql;
 	     execute wk_part_sql;
       end loop;
   end loop;
end;
$procedure$
;