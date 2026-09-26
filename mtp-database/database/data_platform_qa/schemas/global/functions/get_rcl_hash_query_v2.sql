--liquibase formatted sql
--changeset ashish@impactanalytics.co:get_rcl_hash_query_v2 runOnChange:true stripComments:false splitStatements:false context:Release_2 labels:Cold_Updates
--comment: modify changeset for get_rcl_hash_query_v2
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.get_rcl_hash_query_v2(_rcl_code integer, _level varchar[]);
CREATE OR REPLACE FUNCTION global.get_rcl_hash_query_v2(_rcl_code integer, _level character varying[])
 RETURNS text
 LANGUAGE plpgsql
AS $function$
	declare
		_hash text;
	begin
		select coalesce(concat(_rcl_code, ', md5(jsonb_build_object(', string_agg(concat(concat('''', l, ''', '), l), ', '), ')::text)'), '') into _hash from unnest(_level) as l;
		return _hash;
end $function$
;
