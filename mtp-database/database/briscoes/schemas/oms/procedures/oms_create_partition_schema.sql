--liquibase formatted sql
--changeset raja.duraisamy@impactanalytics.co:oms_create_partition_schema_update2 runOnChange:true stripComments:false splitStatements:false context:Generic labels:Generic-vendor-store2
--comment: Create OMS oms_create_partition_schema1

DROP PROCEDURE IF EXISTS inventory_smart.oms_create_partition_schema(text, jsonb, text);

CREATE OR REPLACE PROCEDURE inventory_smart.oms_create_partition_schema(IN v_l0_name text, IN input_data jsonb, IN tbl_name text)
 LANGUAGE plpgsql
AS $procedure$
DECLARE
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'inventory_smart.oms_create_partition_schema';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
    l0_part_name text;
    l1_part_name text;
    store_part_name text;
    week_part_name text;
    _sql text;
    rec record;
	_worker text;
BEGIN
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
    -- Use stable short names with md5 hash
    l0_part_name := inventory_smart.get_md5_from_array(array[lower(regexp_replace(v_l0_name, '[ /.-]', '', 'g')) ]);

    -- Create l0-level partition
    _sql := format(
        'CREATE TABLE IF NOT EXISTS inventory_smart.%I
         PARTITION OF inventory_smart.%I
         FOR VALUES IN (''%L'')
         PARTITION BY LIST (l1_name);',
        tbl_name || '_' || l0_part_name,
        tbl_name,
        v_l0_name
    );
    RAISE NOTICE 'Creating l0 partition: %', _sql;
    --EXECUTE _sql;
	select async_query into _worker from public.async_query('call global.execute_as_admin(''' || _sql || ''');');
	perform dblink_get_result(_worker);
	perform dblink_disconnect(_worker);

    -- Build temp data from JSON input
    DROP TABLE IF EXISTS extract_partitions;
    
    CREATE TEMP TABLE extract_partitions AS 
    WITH cte_data AS (SELECT input_data AS json_data)
    SELECT 
        v_l0_name AS l0_name,
        l1_name,
        store_code
    FROM cte_data,
         jsonb_to_recordset(cte_data.json_data)
             AS x(l1_name TEXT, store_code TEXT);

    -- Create l1 partitions
    FOR rec IN (SELECT DISTINCT l1_name FROM extract_partitions) 
    LOOP
    
        l1_part_name := inventory_smart.get_md5_from_array(array[lower(regexp_replace(v_l0_name, '[ /.-]', '', 'g')),lower(regexp_replace(rec.l1_name, '[ /.-]', '', 'g')) ]);

        _sql := format(
            'CREATE TABLE IF NOT EXISTS inventory_smart.%I
             PARTITION OF inventory_smart.%I
             FOR VALUES IN (''%L'')
             PARTITION BY LIST (store_code);',
            tbl_name || '_' || l1_part_name,
            tbl_name || '_' || l0_part_name,
            rec.l1_name
        );
        RAISE NOTICE 'Creating l1 partition: %', _sql;
       -- EXECUTE _sql;
		select async_query into _worker from public.async_query('call global.execute_as_admin(''' || _sql || ''');');
		perform dblink_get_result(_worker);
		perform dblink_disconnect(_worker);
    END LOOP;

    --RAISE NOTICE 'store partition list: %',
      --  (SELECT string_agg(l1_name || ':' || store_code, ', ')
        -- FROM (SELECT DISTINCT l1_name, store_code FROM extract_partitions) t);

    -- Create store_code partitions
    FOR rec IN (SELECT l1_name,store_code FROM extract_partitions GROUP BY l1_name,store_code ) LOOP
        
        l1_part_name := inventory_smart.get_md5_from_array(array[lower(regexp_replace(v_l0_name, '[ /.-]', '', 'g')),lower(regexp_replace(rec.l1_name, '[ /.-]', '', 'g')) ]);
        store_part_name := inventory_smart.get_md5_from_array(array[lower(regexp_replace(v_l0_name, '[ /.-]', '', 'g')),lower(regexp_replace(rec.l1_name, '[ /.-]', '', 'g')),lower(regexp_replace(rec.store_code, '[ /.-]', '', 'g')) ]);

        _sql := format(
            'CREATE TABLE IF NOT EXISTS inventory_smart.%I
             PARTITION OF inventory_smart.%I
             FOR VALUES IN (''%L'');',
            tbl_name || '_' || store_part_name,
            tbl_name || '_' || l1_part_name,
            rec.store_code
        );
        RAISE NOTICE 'Creating store partition: %', _sql;
       -- EXECUTE _sql;
		select async_query into _worker from public.async_query('call global.execute_as_admin(''' || _sql || ''');');
		perform dblink_get_result(_worker);
		perform dblink_disconnect(_worker);
    END LOOP;

		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
END;
$procedure$
;
