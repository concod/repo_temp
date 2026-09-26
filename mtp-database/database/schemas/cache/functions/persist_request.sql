--liquibase formatted sql
--changeset liquibase:persist_request runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for persist_request
--rollback: SELECT 1
DROP FUNCTION IF EXISTS cache.persist_request(_payload jsonb, _req_name character varying, _req_type character varying, _query text, _key_pattern character varying, _values jsonb);
CREATE OR REPLACE FUNCTION cache.persist_request(_payload jsonb, _req_name character varying, _req_type character varying, _query text, _key_pattern character varying, _values jsonb)
 RETURNS void
 LANGUAGE plpgsql
 PARALLEL SAFE
AS $function$
	declare
	/*
	 * Function/Procedure name: cache.persist_request
	 * Created by: Ashish Gupta
	 * Created at: 19-Jul-2022
	 * No of input parameter: 6
	 * Parameter Description : 
	 * $1 = _payload
	 * $2 = _req_name
	 * $3 = _req_type
	 * $4 = _query
	 * $5 = _key_pattern
	 * $6 = _values
	 * Purpose: 
	 */
		_rid int;
		_key varchar;
		--_created_at timestamp := clock_timestamp(); -- bcoz can not sync timestamp b/w all sub calls.
	begin
		raise notice 'Flow: persist_request';
		insert into "cache".request_tracker(payload) 
		values (_payload || jsonb_build_object('req_name', _req_name, 'req_type', _req_type))
		returning req_code into _rid;
		raise notice 'Flow: persist_request, request saved %', _rid;
		perform cache.is_request_exists(_payload, _req_name, _req_type, _query, _rid);
		raise notice 'Flow: persist_request, dependencies saved';
		_key := replace(_key_pattern, '{request}', _rid::varchar);
		insert into "cache".request_data("key", value, req_code) 
		values (_key, _values, _rid);
		raise notice 'Flow: persist_request, data saved';
	end
$function$
;
