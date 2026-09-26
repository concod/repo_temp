--liquibase formatted sql
--changeset ashish@impactanalytics.co:cold_update_status runOnChange:true stripComments:false splitStatements:false context:Release_2 labels:Cold_Updates
--comment: initial changeset for cold_update_status
--rollback: SELECT 1
DROP FUNCTION IF EXISTS cache.cold_update_status(_table_name character varying, _table_type character varying, _updated_by integer, _update_codes int[], _status varchar);
CREATE OR REPLACE FUNCTION cache.cold_update_status(_table_name character varying, _table_type character varying, _updated_by integer, _update_codes int[], _status varchar)
 RETURNS void
 LANGUAGE plpgsql
 PARALLEL SAFE
AS $function$
	declare
	/*
	 * Function/Procedure name: cache.cold_update_status
	 * Created by: Ashish Gupta
	 * Created at: 22-Nov-2022
	 * No of input parameter: 5
	 * Purpose: 
	 */
		_status_code int := case when _status = 'validated' then 1 when _status = 'in-queue' then 2 when _status = 'merged' then 3 end;
	begin
--		raise notice '%', _status_code;
		update cache.update_tracker set status = _status_code,
		updated_at = now(),
		is_deleted = (case when _status_code = 3 then true else false end)
		where 
		table_name = _table_name 
		and table_type = _table_type
		and created_by = _updated_by
		and status = (_status_code - 1)
		and update_code = any(_update_codes)
		and is_deleted = false;
	END
$function$
;
