--liquibase formatted sql
--changeset ashish@impactanalytics.co:get_rcl_hash_query runOnChange:true stripComments:false splitStatements:false context:Release_2 labels:Cold_Updates
--comment: modified changeset for get_rcl_hash_query
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.get_rcl_hash_query(_rcl_code integer, _level varchar[]);
CREATE OR REPLACE FUNCTION global.get_rcl_hash_query(_rcl_code integer, _level varchar[])
 RETURNS text
 LANGUAGE plpgsql
AS $function$
	declare
		_hash text;
	begin
		select coalesce(concat('md5(jsonb_build_object(', string_agg(concat(concat('''', l, ''', '), l), ', '), ')::text) AS rcl_hash_' || _rcl_code), '') into _hash from unnest(_level) as l;
		return _hash;
end $function$
;