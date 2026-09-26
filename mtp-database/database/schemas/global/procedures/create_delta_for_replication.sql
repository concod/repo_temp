--liquibase formatted sql
--changeset ashish@impactanalytics.co:create_delta_for_replication runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for create_delta_for_replication
DROP PROCEDURE IF EXISTS global.create_delta_for_replication(IN _tbl_list text[]);
CREATE OR REPLACE PROCEDURE global.create_delta_for_replication(IN tbl_list text[])
 LANGUAGE plpgsql
AS $procedure$
DECLARE
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'global.create_delta_for_replication';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
--
    _tablename text;
    _pk_cols text;
    _spk_cols text;
    _dpk_cols text;
    _all_cols text;
    _sall_cols text;
    _dall_cols text;
    _delta_sql text;
	_cleanup_sql text;
--
	_psql text;
	_queue_length int;
	_concurrency int := 50;
	_worker text;
	_workers text[];
	_is_busy int;
	_r record;
	_record_count float := 0;
	_count float := 0;
	_status bool;
	_result jsonb;
	_error_message text;
    _error_detail text;
    _error_hint text;
	_cleanup_worker text;
BEGIN
	SELECT least((current_setting('max_connections')::int/2) - count(1), _concurrency) into _queue_length FROM pg_stat_activity WHERE pg_stat_activity.datname = current_database();
	raise notice '_queue_length: %', _queue_length;
    -- Loop over input table names
    FOR _tablename IN SELECT unnest(tbl_list)
    LOOP
        -- Get primary key columns
        SELECT 
            string_agg(kcu.column_name, ', '),
            string_agg('sou.' || kcu.column_name || ' is null', ' or '),
            string_agg('des.' || kcu.column_name || ' is null', ' or ')
        INTO _pk_cols, _spk_cols, _dpk_cols
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
            ON kcu.constraint_name = tc.constraint_name
            AND kcu.table_schema = tc.table_schema
        WHERE tc.table_name = _tablename
          AND tc.constraint_type = 'PRIMARY KEY'
          AND tc.table_schema = 'global';

        -- Get all columns for comparison
        SELECT 
            string_agg(kcu.column_name, ', '),
            string_agg('sou.' || kcu.column_name || case when data_type='json' then '::jsonb' else '' end, ', '),
            string_agg('des.' || kcu.column_name || case when data_type='json' then '::jsonb' else '' end, ', ')
        INTO _all_cols, _sall_cols, _dall_cols
        FROM information_schema.columns kcu
        WHERE table_schema = 'global'
          AND table_name = _tablename;

        -- Construct the delta SQL
        _delta_sql := 'CREATE TABLE inventory_global.' || _tablename || '_delta AS
            SELECT ' || _pk_cols || ', action_type, ROW_NUMBER() OVER ( order by ' || _pk_cols || ') AS serial_no
			FROM (
                SELECT ' || _pk_cols || ',
                CASE 
                    WHEN ' || _spk_cols || ' THEN ''delete''
                    WHEN ' || _dpk_cols || ' THEN ''insert''
                    WHEN (' || _sall_cols || ') IS DISTINCT FROM (' || _dall_cols || ') THEN ''update''
                END AS action_type
                FROM global.' || _tablename || ' AS des
                FULL OUTER JOIN inventory_global.' || _tablename || ' AS sou
                USING (' || _pk_cols || ')
            ) x 
            WHERE action_type IS NOT NULL;';

		raise notice '_delta_sql: %', _delta_sql;
		-- Drop and create delta table
        _cleanup_sql := 'DROP TABLE IF EXISTS inventory_global."' || _tablename || '_delta";';
		raise notice '_tablename: %', _tablename;

		SELECT async_query INTO _cleanup_worker FROM public.async_query(_cleanup_sql);
        PERFORM public.async_query_status(_cleanup_worker, 'cleanup');

		select async_query into _worker from public.async_query(_delta_sql);
		_workers := array_append(_workers, _worker);
		--raise notice '_workers: %', _workers;
		-- if jobs are more then limit
		if array_length(_workers, 1) > _queue_length-1 then
			FOREACH _worker in array _workers loop
				SELECT dblink_is_busy(_worker) into _is_busy;
				if _is_busy = 0 then
					perform dblink_get_result(_worker);
					perform dblink_disconnect(_worker);
					_workers := array_remove(_workers, _worker);
				end if;
			end loop;
		end if;
		-- if limit breached
		if array_length(_workers, 1) > _queue_length-1 then
			perform pg_sleep(5);
		end if;
    END LOOP;

	raise notice 'Final cleanup: %', array_length(_workers, 1);
	raise notice '_workers: %', _workers;

	FOREACH _worker in array _workers loop
 		perform dblink_get_result(_worker);
		perform dblink_disconnect(_worker);
		_workers := array_remove(_workers, _worker);
	end loop;
END;
$procedure$
;
