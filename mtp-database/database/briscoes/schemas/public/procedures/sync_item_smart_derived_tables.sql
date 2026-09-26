--liquibase formatted sql
--changeset jaya.khandelwal@impactanalytics.co:sync_item_smart_derived_tables_chg1 runOnChange:true stripComments:false splitStatements:false context:Release_1_1 labels:sync_item_smart_derived_tables
--comment: sync_item_smart_derived_tables
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_item_smart_derived_tables(IN p_source_table text, IN p_destination_table text, IN p_is_historic boolean);
CREATE OR REPLACE PROCEDURE public.sync_item_smart_derived_tables(IN p_source_table text, IN p_destination_table text, IN p_is_historic boolean DEFAULT false)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
DECLARE
  i record;
  j record;
  n int4 := 0;
  v_cnt int4 := 0;
  v_columns_text1 text;
  v_columns_text2 text;
  v_sql text;
  v_created_at timestamptz := now();
  v_created_by int4 := 155;
  _log_code varchar := gen_random_uuid();
  _sp_name varchar := 'public.sync_item_smart_derived_tables';
  _log_step varchar;
  _st TIMESTAMP := clock_timestamp();
BEGIN
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
  -- memory
  SET work_mem = '2GB';
  SET maintenance_work_mem = '4GB';

  -- prepare column lists for insert / upsert
  SELECT string_agg(src_column_name, ','), string_agg(src_column_name || ' = excluded.' || src_column_name, ',')
    INTO v_columns_text1, v_columns_text2
  FROM (
    SELECT a.column_name AS src_column_name
    FROM (
      SELECT column_name
      FROM information_schema.columns
      WHERE table_catalog = current_database()
        AND table_schema = 'public'
        AND table_name = p_source_table
      ORDER BY ordinal_position
    ) a
    FULL OUTER JOIN (
      SELECT column_name
      FROM information_schema.columns
      WHERE table_catalog = current_database()
        AND table_schema = 'item_smart'
        AND table_name = p_destination_table
      ORDER BY ordinal_position
    ) b ON a.column_name = b.column_name
  ) c
  WHERE src_column_name IS NOT NULL
    AND src_column_name NOT IN ('created_by','created_at','updated_by','updated_at');

  RAISE NOTICE 'Columns prepared: %', COALESCE(v_columns_text1,'<none>');

  -- ensure index on source
  _st := clock_timestamp();
  RAISE NOTICE 'Creating index on source table if not exists...';
  v_sql := format('CREATE INDEX IF NOT EXISTS idx_%s ON %s(dept, channel, current_week)', p_source_table, p_source_table);
  EXECUTE v_sql;
  RAISE NOTICE 'Index statement executed in %', (clock_timestamp() - _st);

  -- create tmp_partitions
  EXECUTE 'DROP TABLE IF EXISTS tmp_partitions';
  _st := clock_timestamp();
  v_sql := format(
$$
CREATE TEMP TABLE tmp_partitions AS
WITH combined AS (
  SELECT
    dept,
    channel,
    current_week,
    '%1$s_' || lower(regexp_replace(dept, '[ /.-]', '', 'g')) AS dept_partition,
    '%1$s_' || lower(regexp_replace(dept, '[ /.-]', '', 'g')) || '_' || lower(regexp_replace(channel, '[ /.-]', '', 'g')) AS channel_partition,
    '%1$s_' || item_smart.get_md5_from_array(array[
      lower(regexp_replace(dept, '[ /.-]', '', 'g')),
      lower(regexp_replace(channel, '[ /.-]', '', 'g')),
      current_week::text
    ]) AS full_partition
  FROM (
    SELECT DISTINCT dept, channel, current_week FROM public.%2$I
    UNION
    SELECT DISTINCT dept, channel, current_week FROM item_smart.wp_master_mv WHERE is_active = 1
  ) base
),
existing_tables AS (
  SELECT c.relname
  FROM pg_catalog.pg_class c
  JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'item_smart' AND c.relname LIKE '%%%1$s%%'
)
SELECT
  c.dept,
  c.channel,
  c.current_week,
  EXISTS (SELECT 1 FROM existing_tables e WHERE e.relname = c.dept_partition) AS is_dept_partition,
  EXISTS (SELECT 1 FROM existing_tables e WHERE e.relname = c.channel_partition) AS is_channel_partition,
  EXISTS (SELECT 1 FROM existing_tables e WHERE e.relname = c.full_partition) AS is_full_partition
FROM combined c;
$$
, p_destination_table, p_source_table);
  RAISE NOTICE 'Creating tmp_partitions: %', v_sql;
  EXECUTE v_sql;
  RAISE NOTICE 'tmp_partitions created in %', (clock_timestamp() - _st);

  SELECT count(*) INTO v_cnt FROM tmp_partitions;
  RAISE NOTICE 'tmp_partitions count = %', v_cnt;

  -- nothing to do if tmp_partitions is empty
  IF v_cnt = 0 THEN
    RAISE NOTICE 'No partitions/rows found. Exiting.';
    RETURN;
  END IF;

  -- -------------- CREATE MISSING PARTITIONS (always) --------------
  -- Build JSONB payload per dept and call your DDL builder which will create dept/channel/week partitions.
  FOR i IN (
    SELECT dept,
           jsonb_agg(jsonb_build_object('channel', channel, 'current_week', current_week) ORDER BY channel, current_week ASC) AS channel_week_data
    FROM (
      SELECT dept, channel, current_week
      FROM tmp_partitions
      WHERE NOT is_dept_partition
      GROUP BY dept, channel, current_week

      UNION

      SELECT dept, channel, current_week
      FROM tmp_partitions
      WHERE NOT is_channel_partition
      GROUP BY dept, channel, current_week

      UNION

      SELECT dept, channel, current_week
      FROM tmp_partitions
      WHERE NOT is_full_partition
      GROUP BY dept, channel, current_week
    ) a
    GROUP BY dept
  )
  LOOP
    -- call the partition-creation proc for every dept that needs partitions
    IF p_destination_table NOT LIKE '%components%' THEN
      _st := clock_timestamp();
      RAISE NOTICE 'Creating partitions for dept=%', i.dept;
      CALL item_smart.create_item_schema_jsonb_v2(i.dept, i.channel_week_data, p_destination_table);
      RAISE NOTICE 'Partitions created for dept=% in %', i.dept, (clock_timestamp() - _st);
    END IF;
  END LOOP;

  -- -------------- DATA LOAD: historic vs periodic --------------
  IF p_is_historic THEN
    -- Historic: truncate then bulk insert (no ON CONFLICT)
    _st := clock_timestamp();
    RAISE NOTICE 'Historic run: truncating destination table item_smart.%', p_destination_table;
    v_sql := format('TRUNCATE TABLE item_smart.%I', p_destination_table);
    EXECUTE v_sql;
    RAISE NOTICE 'Truncate done in %', (clock_timestamp() - _st);

    _st := clock_timestamp();
    FOR j IN (SELECT dept, channel, current_week FROM tmp_partitions) LOOP
      v_sql := format($$INSERT INTO item_smart.%I(%s, created_by, created_at, updated_by, updated_at)
                       SELECT %s, %L, %L, NULL, NULL
                       FROM %I
                       WHERE dept = %L AND channel = %L AND current_week = %L$$,
                      p_destination_table,
                      v_columns_text1,
                      v_columns_text1,
                      v_created_by,
                      v_created_at,
                      p_source_table,
                      j.dept,
                      j.channel,
                      j.current_week
      );
      RAISE NOTICE 'Historic insert: %', v_sql;
      EXECUTE v_sql;
    END LOOP;
    RAISE NOTICE 'Historic inserts completed in %', (clock_timestamp() - _st);
  ELSE
    _st := clock_timestamp();
    FOR j IN (SELECT dept, channel, current_week FROM tmp_partitions) LOOP
      v_sql := format($$INSERT INTO item_smart.%I(%s, created_by, created_at, updated_by, updated_at)
                       SELECT %s, %L, %L, NULL, NULL
                       FROM %I
                       WHERE dept = %L AND channel = %L AND current_week = %L
                       ON CONFLICT (dept, channel, current_week, hierarchy_code)
                       DO UPDATE SET %s$$,
                      p_destination_table,
                      v_columns_text1,
                      v_columns_text1,
                      v_created_by,
                      v_created_at,
                      p_source_table,
                      j.dept,
                      j.channel,
                      j.current_week,
                      v_columns_text2
      );
      RAISE NOTICE 'Upsert SQL: %', v_sql;
      EXECUTE v_sql;
    END LOOP;
    RAISE NOTICE 'Periodic upserts completed in %', (clock_timestamp() - _st);

RAISE NOTICE 'Starting delete of flag=0 rows for processed partitions...';

    FOR j IN (SELECT dept, channel, current_week FROM tmp_partitions) LOOP
        v_sql := format($$
            DELETE FROM item_smart.%I
            WHERE record_flag_update = 0
              AND dept = %L
              AND channel = %L
              AND current_week = %L
        $$,
        p_destination_table,
        j.dept, j.channel, j.current_week);

        RAISE NOTICE 'Delete SQL: %', v_sql;
        EXECUTE v_sql;
    END LOOP;

    RAISE NOTICE 'Delete of record_flag_update=0 rows completed.';
  END IF;

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
