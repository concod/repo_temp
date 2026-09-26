--liquibase formatted sql
--changeset liquibase:plan_data_cleanup runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for plan_data_cleanup
DROP PROCEDURE IF EXISTS assort_smart.plan_data_cleanup();
CREATE OR REPLACE PROCEDURE assort_smart.plan_data_cleanup(
	)
LANGUAGE 'plpgsql'
AS $BODY$

DECLARE
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'assort_smart.process_cleanup';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
	rec RECORD;
	delete_sql TEXT;
	tn text;
BEGIN
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin

	FOR rec IN
		SELECT * FROM assort_smart.cleanup_policies
		WHERE schema_name = 'assort_smart'
		ORDER BY sl_no
	LOOP
		RAISE NOTICE 'Processing cleanup policy for: %.%', rec.schema_name, rec.table_name;
		-- check the existence of the table --
		IF NOT EXISTS (
			SELECT 1 FROM information_schema.tables
			WHERE table_schema = rec.schema_name
			AND table_name = rec.table_name
		) THEN
			RAISE NOTICE 'Table %.% does not exist, skipping', rec.schema_name, rec.table_name;
			CONTINUE;
		END IF;

		tn := rec.schema_name || '.' || rec.table_name;

		IF rec.cleanup_strategy = 'Data Purging' THEN
			delete_sql := 'with rows as ( DELETE FROM ' || quote_ident(rec.schema_name) || '.' ||
					  quote_ident(rec.table_name) ||
					  ' {where} and ' || rec.cleanup_condition ||
					  ' RETURNING 1 ) SELECT count(1) as cnt FROM rows;';

			RAISE NOTICE 'query: %', delete_sql;
			PERFORM public.parellel_insert(delete_sql, 50, tn, rec.stl_column, null, 1000);
		ELSE
			RAISE NOTICE 'Unknown cleanup strategy: %, skipping', rec.cleanup_strategy;
			CONTINUE;
		END IF;

		UPDATE assort_smart.cleanup_policies
		SET last_cleanup_time = NOW()
		WHERE schema_name = rec.schema_name
		AND table_name = rec.table_name;
		RAISE NOTICE 'Completed processing for table: %.%', rec.schema_name, rec.table_name;
	END LOOP;

	RAISE NOTICE 'Data retention cleanup process completed';
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
END;
$BODY$;