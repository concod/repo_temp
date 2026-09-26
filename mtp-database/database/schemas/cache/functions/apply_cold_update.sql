--liquibase formatted sql
--changeset ashish@impactanalytics.co:apply_cold_update runOnChange:true stripComments:false splitStatements:false context:Release_2 labels:Cold_Updates
--comment: initial changeset for apply_cold_update
--rollback: SELECT 1
DROP FUNCTION IF EXISTS cache.apply_cold_update(_table_name character varying, _table_type character varying, _created_by integer, _filters jsonb, _vals jsonb);
CREATE OR REPLACE FUNCTION cache.apply_cold_update(_table_name character varying, _table_type character varying, _created_by integer, _filters jsonb, _vals jsonb)
 RETURNS void
 LANGUAGE plpgsql
 PARALLEL SAFE
AS $function$
	declare
	/*
	 * Function/Procedure name: cache.apply_cold_update
	 * Created by: Ashish Gupta
	 * Created at: 22-Nov-2022
	 * No of input parameter: 5
	 * Purpose: 
	 */
		_update_code int;
		_now timestamp := now()::timestamp;
	begin
		if _table_type = 'pg' then
			_vals := _vals || jsonb_build_object('updated_by', _created_by, 'updated_at', _now, 'update_type', 'cold');
		elseif _table_type = 'gbq' then -- in case of gbq updated_by must be input
			_vals := _vals || jsonb_build_object('updated_at', _now, 'update_type', 'cold');
		end if;
		-- record creation time must be earlier then update and soft delete must be false as default condition
		_filters := _filters || ('{"created_at":[{"type":"custom", "operator":"<", "values":"' || _now || '"}], "is_deleted":[{"type": "custom", "operator": "=", "values": false}]}')::jsonb;
		insert
			into
			"cache".update_tracker
				(table_name,
			table_type,
			filters,
			created_by)
		values(_table_name,
		_table_type,
		_filters,
		_created_by) returning update_code
		into
			_update_code;
		INSERT INTO "cache".update_details
		(update_code, col, val)
		select
			_update_code as update_code,
			key as col,
			value as val
		from
			jsonb_each_text(_vals);
		if _table_type = 'pg' then
			perform cache.calculate_updated_table(_table_name, _table_type);
		end if;
	END
$function$
;
