--liquibase formatted sql
--changeset jaya.khandelwal@impactanalytics.co:create_item_schema_jsonb_v2 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:item_smart_initial_commit
--comment:  inital changeset for create_item_schema_jsonb_v2
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS item_smart.create_item_schema_jsonb_v2(IN v_dept text, IN input_data jsonb, IN tbl_name text);
CREATE OR REPLACE PROCEDURE item_smart.create_item_schema_jsonb_v2(IN v_dept text, IN input_data jsonb, IN tbl_name text)
 LANGUAGE plpgsql
AS $procedure$
DECLARE
	
	--tbl_name text := 'wp_master';
    --v_dept         text :='000000111-OLD China' ;  
    dept_part_name text;
	_sql text;
	_worker text;
BEGIN

   
	dept_part_name := lower(regexp_replace(v_dept, '[ /.-]', '', 'g'));
	_sql:= format(
            'CREATE TABLE IF NOT EXISTS item_smart.%I PARTITION OF item_smart.%I FOR VALUES IN (%L) PARTITION BY LIST (channel)',
            tbl_name || '_' || dept_part_name,
            tbl_name,
            v_dept
        );
	--raise notice 'dept level partition: %',_sql ;
	execute _sql ;

	_sql:= '';
	--channel level sub partition
	DROP TABLE IF EXISTS extract_partitions;
	CREATE TEMP TABLE extract_partitions AS 
	WITH cte_data AS ( SELECT input_data AS json_data )
	SELECT v_dept AS dept,channel,current_week
	FROM cte_data,
	     jsonb_to_recordset(cte_data.json_data) AS x(channel TEXT, current_week INT);

	create index idx_extract_partitions on extract_partitions (channel,current_week) ;
	
	SELECT string_agg(' CREATE table if not exists item_smart.'|| tbl_name ||'_'||dept_part_name||'_'||lower(regexp_replace(channel, '[ /.-]', '', 'g')) ||
	   ' PARTITION OF item_smart.'|| tbl_name ||'_'||dept_part_name||
	   ' FOR  values in ('||''''||channel||''''||') partition by list (current_week)',';')
	into _sql
	from (select channel from extract_partitions GROUP BY channel ) a;
    --raise notice 'channel level sub partition: %',_sql ;
	execute _sql ;

   _sql:= '';
   --week level sub partition
  --week level sub partition
	SELECT string_agg(
	  ' CREATE table if not exists item_smart.' || tbl_name || '_' || part_name ||
	  ' PARTITION OF item_smart.' || tbl_name || '_' || dept_part_name || '_' || lower(regexp_replace(channel, '[ /.-]', '', 'g')) ||
	  ' FOR  values in (' || current_week || ')',
	  ';'
	)
	INTO _sql
	FROM (
	  SELECT
	    channel,
	    current_week,
	    item_smart.get_md5_from_array(ARRAY[
	      dept_part_name,
	      lower(regexp_replace(channel, '[ /.-]', '', 'g')),
	      current_week::text
	    ]) AS part_name
	  FROM extract_partitions
	  GROUP BY channel, current_week
	) a;
   --raise notice 'channel level sub partition: %',_sql ;
	execute _sql ;
 
   INSERT INTO item_smart.table_partition_mapping (table_name, dept, channel, week, md5sum)
    SELECT 
       'item_smart.'|| tbl_name ,
        v_dept,
        channel,
        current_week,
        item_smart.get_md5_from_array(ARRAY[
            dept_part_name,
            lower(regexp_replace(channel, '[ /.-]', '', 'g')),
            current_week::text
        ]) AS md5sum
    FROM extract_partitions a
    where
    not exists (select 1 from item_smart.table_partition_mapping as b where b.dept = v_dept and a.channel = b.channel and a.current_week = b.week and b.table_name = 'item_smart.'|| tbl_name );


END;
$procedure$
;
