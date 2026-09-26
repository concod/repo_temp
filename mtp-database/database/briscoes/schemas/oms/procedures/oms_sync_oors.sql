--liquibase formatted sql
--changeset Shaik.Azmathulla@impactanalytics.co:oms_sync_oors_v2 runOnChange:true stripComments:false splitStatements:false context:Generic labels:Generic-vendor-store
--comment: Added the periodic logic

DROP PROCEDURE IF EXISTS inventory_smart.oms_sync_oors;

CREATE OR REPLACE PROCEDURE inventory_smart.oms_sync_oors(IN tbl_name text,_is_historic boolean DEFAULT false )
LANGUAGE plpgsql
AS $procedure$
DECLARE 
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'inventory_smart.oms_sync_oors';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
    i RECORD;
    j RECORD;
    v_sql TEXT;
	_col text ;
BEGIN
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin

    DROP TABLE IF EXISTS tmp_partitions;
	
	select string_agg('"' || column_name || '"', ', ') into _col
	from information_schema."columns" c 
	where  table_name = 'oms_orders_recommended_store'  and table_schema = 'inventory_smart' and column_name <> 'id' ;
			  
   EXECUTE '
      CREATE TEMP TABLE tmp_partitions AS
      WITH combined AS (
         SELECT 
           l0_name,
            l1_name,
            store_code,
           ''oms_orders_recommended_store_'' || inventory_smart.get_md5_from_array(array[lower(regexp_replace(l0_name, ''[ /.-]'', '''', ''g''))])  AS l0_name_partition,
           ''oms_orders_recommended_store_'' || inventory_smart.get_md5_from_array(array[lower(regexp_replace(l0_name, ''[ /.-]'', '''', ''g'')),lower(regexp_replace(l1_name, ''[ /.-]'', '''', ''g''))]) AS l1_name_partition,
           ''oms_orders_recommended_store_'' || inventory_smart.get_md5_from_array(array[lower(regexp_replace(l0_name, ''[ /.-]'', '''', ''g'')),lower(regexp_replace(l1_name, ''[ /.-]'', '''', ''g'')),lower(regexp_replace(store_code, ''[ /.-]'', '''', ''g''))]) AS store_code_partition
         FROM (
               SELECT l0_name, l1_name, store_code
               FROM ' || tbl_name || '
               GROUP BY l0_name, l1_name, store_code
         ) base
      ),
      existing_tables AS (
         SELECT c.relname
         FROM pg_catalog.pg_class c
         JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
         WHERE n.nspname = ''inventory_smart'' 
           AND c.relname LIKE ''%oms_orders_recommended_store%''
      )
      SELECT 
         c.l0_name,
         l1_name,
         store_code,
         EXISTS (SELECT 1 FROM existing_tables e WHERE e.relname = c.l0_name_partition) AS is_l0_name_partition,
         EXISTS (SELECT 1 FROM existing_tables e WHERE e.relname = c.l1_name_partition) AS is_l1_name_partition,
         EXISTS (SELECT 1 FROM existing_tables e WHERE e.relname = c.store_code_partition) AS is_store_code_partition
      FROM combined c;
    ';
    
    CREATE INDEX tmp_partitions_idx ON tmp_partitions (is_l0_name_partition, is_l1_name_partition, is_store_code_partition);
    
    -- Create missing partitions
    FOR i IN 
        SELECT l0_name, 
               jsonb_agg(jsonb_build_object('l1_name', l1_name, 'store_code', store_code) 
                         ORDER BY l1_name, store_code  ASC) AS l1_store_week_data
        FROM (
              SELECT l0_name, l1_name, store_code 
              FROM tmp_partitions
              WHERE NOT is_l0_name_partition
              GROUP BY l0_name, l1_name, store_code 
              
              UNION 
              
              SELECT l0_name, l1_name, store_code
              FROM tmp_partitions
              WHERE NOT is_l1_name_partition
              GROUP BY l0_name, l1_name, store_code 
              
              UNION 
              
              SELECT l0_name, l1_name, store_code 
              FROM tmp_partitions
              WHERE NOT is_store_code_partition
              GROUP BY l0_name, l1_name, store_code 
        ) a
        GROUP BY l0_name
    LOOP
	
		 RAISE NOTICE '_l0_name: % ', i.l0_name;
        CALL inventory_smart.oms_create_partition_schema(i.l0_name, i.l1_store_week_data, 'oms_orders_recommended_store');
        
    END LOOP;

   	if _is_historic then
	   RAISE NOTICE 'Historic delete SQL....';
            delete from inventory_smart.oms_orders_recommended_store where true;
	end if;
	
	if not _is_historic then

		RAISE NOTICE 'Periodic delete SQL....';
		DELETE FROM inventory_smart.oms_orders_recommended_store oors
		WHERE(
				(order_status_id = 0 ) 
				OR (order_status_id = 3 AND is_deleted = true)
				   OR (order_status_id IN (1, -1)
					   AND (
						   CASE
							   WHEN (
								   TO_TIMESTAMP(SUBSTRING(oors.order_batch_name FROM 'IA_Order_(\d{8}T\d{6})'),
												'YYYYMMDD"T"HH24MISS')
								   AT TIME ZONE 'Asia/Kolkata'
							   )::date IS NOT NULL
							   THEN current_date-7 > (
								   TO_TIMESTAMP(SUBSTRING(oors.order_batch_name FROM 'IA_Order_(\d{8}T\d{6})'),
												'YYYYMMDD"T"HH24MISS')
								   AT TIME ZONE 'Asia/Kolkata'
							   )::date
							   ELSE false
						   END
					   )
				   )
		     );
			   
	end if;

	v_sql := 'create index if not exists idx_l0_l1_store on ' || tbl_name || ' (l0_name,l1_name,store_code);';
	RAISE NOTICE 'Index SQL: %', v_sql;
	execute v_sql;
	v_sql := '';
    -- Insert into partitions
    FOR j IN 
        SELECT l0_name, l1_name, store_code
        FROM tmp_partitions
        GROUP BY l0_name, l1_name, store_code
        ORDER BY l0_name, l1_name, store_code
    LOOP
	
        v_sql := format(
            'INSERT INTO inventory_smart.%I ( '|| _col||' )
             SELECT '|| _col||'
             FROM ' || tbl_name || '
             WHERE l0_name = %L 
               AND l1_name = %L 
               AND store_code = %L ;',
            'oms_orders_recommended_store_' || inventory_smart.get_md5_from_array(array[lower(regexp_replace(j.l0_name, '[ /.-]', '', 'g')),lower(regexp_replace(j.l1_name, '[ /.-]', '', 'g')),lower(regexp_replace(j.store_code, '[ /.-]', '', 'g'))]),
            j.l0_name,j.l1_name,j.store_code
        );

         RAISE NOTICE 'Insert SQL. l0_name:% ,l1_name:%, store_code:% ', j.l0_name ,j.l1_name,j.store_code ;
        EXECUTE v_sql;
    END LOOP;

		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
END;
$procedure$;