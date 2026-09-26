--liquibase formatted sql
--changeset liquibase:MTP-70495 runOnChange:true stripComments:false splitStatements:false context:MTP-70495 labels:MTP-70495
--comment: MTP-70495 added underling table update check on _tuple_check key
--rollback: SELECT 1
DROP FUNCTION IF EXISTS cache.is_request_exists(_payload jsonb, _req_name character varying, _req_type character varying, _query text, _input_req_code integer);
DROP FUNCTION IF EXISTS cache.is_request_exists(jsonb, character varying, character varying, text,  integer, boolean);
CREATE OR REPLACE FUNCTION cache.is_request_exists(_payload jsonb, _req_name character varying, _req_type character varying, _query text, _input_req_code integer, _tuple_check boolean DEFAULT true)
 RETURNS integer
 LANGUAGE plpgsql
 PARALLEL SAFE
AS $function$
	declare
	/*
	 * Function/Procedure name: cache.is_request_exists
	 * Created by: Ashish Gupta
	 * Created at: 19-Jul-2022
	 * No of input parameter: 6
	 * Parameter Description : 
	 * 		$1 = _payload
	 * 		$2 = _req_name
	 * 		$3 = _req_type
	 * 		$4 = _query
	 * 		$5 = _input_req_code -- will present only in case new request
	 * 		$6 = _input_created_at
	 * Purpose: Check if a cache exists for the given stored procedure and payload. 
	 			If it exists, return the cached result. Additionally, refresh the materialized view based on updates to the underlying tables.
	 * if any modification done in same function/procedure please record the changes in below format
	 *
	 *  Updated_by                  Updated_on          Purpose
	 *  ----------                  -----------         --------
		 Nibeel Yunus           	06-Feb-2025         MTP-70495:  _tuple_check to check underlying table updates based on this key
	 */
		_latest_req_code int;
	begin
		raise notice 'Flow: is_request_exists'; -- (%, %, %, %, %, %)', $1, $2, $3, $4, $5, $6;
		if _input_req_code = 0 then
			raise notice 'Flow: is_request_exists, searching for existing key';
		    SELECT 
		      max(req_code) into _latest_req_code
		    FROM 
		      "cache".request_tracker 
		    WHERE 
		      payload = (
		        _payload || jsonb_build_object(
		          'req_name', _req_name,
		          'req_type', _req_type
		        )
		      )
		    GROUP BY 
		      payload;
		 end if;
		 if _latest_req_code is null and _input_req_code = 0 then
			raise notice 'Flow: is_request_exists, very first time request itself not exists';
		 	return 0;
		 end if;

		 if _latest_req_code is not null and not _tuple_check then
			return _latest_req_code;

		 elsif _latest_req_code is not null then
			raise notice 'Flow: is_request_exists, request exists check validity';
			select 
			  case when bool_and(
			    rd.tu = psu.n_tup_upd 
			    and rd.ti = psu.n_tup_ins 
			    and rd.td = psu.n_tup_del 
			    and rd.thu = psu.n_tup_hot_upd 
			    and rd.lt = psu.n_live_tup 
			    and rd.dt = psu.n_dead_tup
			  ) then _latest_req_code else 0 end into _latest_req_code 
			from 
			  cache.request_dependencies rd 
			  LEFT join pg_stat_user_tables psu on split_part(dep_name, '.', 1) = psu.schemaname 
			  and split_part(dep_name, '.', 2) = psu.relname 
			where 
			  req_code = _latest_req_code;
  			return _latest_req_code;
		 end if;
		if _input_req_code is not null then
			raise notice 'Flow: is_request_exists, request not exists and creating new one';
		 	INSERT INTO "cache".request_dependencies (
			  req_code, dep_name, tu, ti, td, thu, lt, dt
			) 
			select 
			  _input_req_code, 
			  psu.*
			from 
			  cache.extract_dependencies(_query) psu;
			 return 0;
		 end if;
	END
$function$
;