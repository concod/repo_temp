--liquibase formatted sql
--changeset jaya.kahndelwal@impactanalytics.co:change_old_to_new_part runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:item_smart_initial_commit
--comment: initial changeset for change_old_to_new_part
--rollback: SELECT 1
drop procedure if exists item_smart.change_old_to_new_part(IN tbl_name text, IN depts text[], IN channels text[], IN weeks integer[]);
CREATE OR REPLACE PROCEDURE item_smart.change_old_to_new_part(IN tbl_name text, IN depts text[], IN channels text[], IN weeks integer[])
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
    v_week_part_key_new   text;
    v_week_part_key_old   text;
    v_old_partition_table text;
    v_exists               boolean;
    v_sql                 text;
    
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
         raise notice  'dept:%',dept;
         raise notice  'channel:%',channel;
         raise notice  'wk:%',wk;
         v_week_part_key_new := item_smart.get_md5_from_array(ARRAY[dept,channel,wk::text]);
         v_week_part_key_old := lower(dept_part_name || '_' || channel_part_name || '_'|| wk_part_name);
         v_old_partition_table := lower(tbl_name || '_' || v_week_part_key_old);
		 raise notice 'v_old_partition_table:%', v_old_partition_table;
         raise notice 'tbl_name:%', tbl_name;
         raise notice 'v_week_part_key_old:%', v_week_part_key_old;
		 v_sql :=  format('SELECT EXISTS (
                            select 
                              1
                            from 
                              pg_catalog.pg_tables 
                            where 
                             schemaname = ''item_smart''
						    and
                             tablename = %L
                        )',
                         v_old_partition_table
         );
         raise notice 'v_sql:%', v_sql;
		 execute v_sql into v_exists;
         if v_exists then
	     wk_part_sql  := 'alter table item_smart.' || tbl_name || '_' ||v_week_part_key_old || ' rename to ' || tbl_name || '_'||v_week_part_key_new;
 	     raise notice  'table name changed to new  %',wk_part_sql;
 	     execute wk_part_sql;
         insert into item_smart.table_partition_mapping
		 (
		  table_name,
		  dept,
		  channel,
		  week,
		  md5sum,
          created_at
		  )
          values 
		  (
			tbl_name,
			dept,
			channel,
			wk,
			v_week_part_key_new,
            now()
           );
          end if;
          end loop;                  
       end loop;
 	 end loop;
END
$procedure$
;
