--liquibase formatted sql
--changeset jaya.khandelwal@impactanalytics.co:create_item_schema_alerts_year runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:item_smart_initial_commit
--comment:  inital changeset for create_item_schema_alerts_year
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS item_smart.create_item_schema_alerts_year(IN tbl_name text, IN depts text[], IN years integer[], IN channels text[]);
CREATE OR REPLACE PROCEDURE item_smart.create_item_schema_alerts_year(IN tbl_name text, IN depts text[], IN years integer[], IN channels text[])
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
DECLARE
 	channel_part_name text;
 	channel_part_sql  text;
 	dept_part_name    text;
 	dept_part_sql     text;
    year_part_name      text;
 	year_part_sql       text;
 	channel           text;
    dept              text;
    year                int;
	v_week_part_key    text;
begin
   foreach dept in array depts 
   loop
		dept_part_name := lower(
		    regexp_replace(
		        regexp_replace(
		            unaccent(dept), 
		            '[^a-zA-Z0-9_]', '', 'g'
		        ),
		        '(\d+)_([a-zA-Z]+)', '\1\2', 'g'
		    )
		);

     dept_part_sql  := '
     create table if not exists item_smart.' || tbl_name || '_' || dept_part_name ||' PARTITION OF item_smart.' || tbl_name ||' FOR
     values in ('||''''||dept||''''||')
     partition by list (channel)';
     raise notice  'dept_part_sql - %',dept_part_sql;
     execute dept_part_sql;	
    
     foreach channel in array channels 
     loop
       channel_part_name := lower(regexp_replace(channel, '[ /.-]', '', 'g'));
       channel_part_sql  := '
       create table if not exists item_smart.' || tbl_name || '_' || dept_part_name || '_' || channel_part_name ||' PARTITION OF item_smart.' || tbl_name || '_' || dept_part_name||' FOR
       values in ('||''''||channel||''''||')
       partition by list (year)';
       raise notice  'channel_part_sql - %',channel_part_sql;
       execute channel_part_sql;
        
       foreach year in array years 
       loop
 	     year_part_name := year::text;
		 v_week_part_key := item_smart.get_md5_from_array(array[dept_part_name, channel_part_name, year_part_name::text]);
		 raise notice  'v_week_part_key_with_function: %',v_week_part_key;
		 insert into item_smart.table_partition_mapping (table_name, dept, channel, years, md5sum)
		 values (tbl_name, dept, channel, year, v_week_part_key)
		 on conflict do nothing;
	     year_part_sql  := '
 		 create table if not exists item_smart.' || tbl_name || '_' || v_week_part_key||' PARTITION OF item_smart.' || tbl_name || '_' || dept_part_name|| '_' || channel_part_name||' FOR
         values in ('||year||')';
 	     raise notice  'year_part_sql %',year_part_sql;
 	     execute year_part_sql;
       end loop;
 	 end loop;
   end loop;
end;
$procedure$
;

