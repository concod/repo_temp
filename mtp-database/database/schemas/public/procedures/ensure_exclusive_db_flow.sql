--liquibase formatted sql
--changeset ashish@impactanalytics.co:ensure_exclusive_db_flow runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment:  Removed terminate session statement
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.ensure_exclusive_db_flow(IN input boolean);
CREATE OR REPLACE PROCEDURE public.ensure_exclusive_db_flow(IN input boolean, text default 'Ingestion Process')
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare 
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.ensure_exclusive_db_flow';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
		_is_already_locked bool;
		_already_lockgranted timestamp;
		_already_lockedby text;
		_lockedby text := $2;
	begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
		if $1 then
			select locked, lockgranted, lockedby into _is_already_locked, _already_lockgranted, _already_lockedby from liquibase.databasechangeloglock where id = 1;
			if _is_already_locked then
				RAISE EXCEPTION '!!! % in progress from % retry after sometime !!!', _already_lockedby, _already_lockgranted;
			else
				INSERT INTO liquibase.databasechangeloglock (id, "locked", lockgranted, lockedby) VALUES(1, true, now(), _lockedby)
				on conflict(id) do update set "locked" = excluded."locked", lockgranted = excluded.lockgranted, lockedby = excluded.lockedby;
			end if;
		else
			INSERT INTO liquibase.databasechangeloglock (id, "locked", lockgranted, lockedby) SELECT id, false, null, null from liquibase.databasechangeloglock where lockedby = _lockedby
			on conflict(id) do update set "locked" = excluded."locked", lockgranted = excluded.lockgranted, lockedby = excluded.lockedby;
		end if;
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
	end;
$procedure$
;
