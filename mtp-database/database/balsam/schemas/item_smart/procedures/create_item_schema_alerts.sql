--liquibase formatted sql
--changeset jaya.khandelwal@impactanalytics.co:create_item_schema_jsonb_v2 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:item_smart_initial_commit
--comment:  inital changeset for create_item_schema_jsonb_v2
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS item_smart.create_item_schema_alerts(IN v_dept text, IN input_data jsonb, IN tbl_name text);
CREATE OR REPLACE PROCEDURE item_smart.create_item_schema_alerts(IN tbl_name text, IN depts text[], IN months integer[], IN channels text[])
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
       partition by list (month)';
       raise notice  'channel_part_sql - %',channel_part_sql;
       execute channel_part_sql;
        
       foreach month in array months 
       loop
 	     month_part_name := month::text;
		 v_week_part_key := item_smart.get_md5_from_array(array[dept_part_name, channel_part_name, month_part_name::text]);
		 raise notice  'v_week_part_key_with_function: %',v_week_part_key;
		 insert into item_smart.table_partition_mapping (table_name, dept, channel, months, md5sum)
		 values (tbl_name, dept, channel, month, v_week_part_key)
		 on conflict do nothing;
	     month_part_sql  := '
 		 create table if not exists item_smart.' || tbl_name || '_' || v_week_part_key||' PARTITION OF item_smart.' || tbl_name || '_' || dept_part_name|| '_' || channel_part_name||' FOR
         values in ('||month||')';
 	     raise notice  'month_part_sql %',month_part_sql;
 	     execute month_part_sql;
       end loop;
 	 end loop;
   end loop;
end;
$procedure$
;
