--liquibase formatted sql
--changeset ashish:generate_rcl_whole_constraint_data runOnChange:true stripComments:false splitStatements:false context:Release_3 labels:CI-137
--comment: initial changeset for generate_rcl_whole_constraint_data
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.generate_rcl_whole_constraint_data();
CREATE OR REPLACE PROCEDURE public.generate_rcl_whole_constraint_data()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.generate_rcl_whole_constraint_data';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
	_rcl_codes int[];
	_version int;
	_ph record;
	_q_parts text[] := '{}'::text[];
	_q_part text;
	_l0_names text[] := '{}'::text[];
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
	INSERT INTO "global".rcl_versioning (module_code) VALUES(170) returning version_code into _version;
	raise notice '_version: %', _version;
	select
		array_agg(rcl_code order by priority asc) into _rcl_codes
	from global.rcl_master where
		not is_deleted
		and module_code = 170
		and validity @> current_date 
	group by is_deleted;
	----------
	select array_agg(l0_name) into _l0_names from (select l0_name from "global".product_store_attributes_filter group by l0_name) x;
	for _ph in select l0_name, l1_name from "global".product_store_attributes_filter group by l0_name, l1_name order by count(1) desc loop 
		_q_parts := array_append(_q_parts, 'CALL public.generate_rcl_l01_constraint_data(' || _version || ', ' || quote_literal(_ph.l0_name) || ', ' || quote_literal(_ph.l1_name) || ', ' || quote_literal(_rcl_codes) || '::int[]);');
		raise notice '%, %', _rcl_codes, _ph;
		-- _l0_names := array_append(_l0_names, _ph.l0_name);
	end loop;
	----------
	CALL public.build_rcl_version(_version, 170, _l0_names);
	if cardinality(_q_parts) > 0 THEN
		FOREACH _q_part in array _q_parts loop
			execute _q_part;
		end loop;
	end if;
	execute 'CREATE INDEX rcl_vc_' || _version || '_idx ON global."rcl_vc_' || _version || '" USING GIN(store_codes, product_codes);';
	execute 'ALTER TABLE global.rcl_versions_constraint ATTACH PARTITION global.rcl_vc_' || _version || ' FOR VALUES IN(' || _version || ');';
	UPDATE "global".rcl_versioning set updated_at = now() WHERE version_code = _version;
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
