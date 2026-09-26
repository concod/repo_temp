--liquibase formatted sql
--changeset liquibase:user_details runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for user_details
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.user_details(user_code integer);
CREATE OR REPLACE FUNCTION global.user_details(user_code integer)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$declare
	_query text;
    _result jsonb;
	begin
        _query := 'SELECT to_jsonb(r) FROM (SELECT user_code, name, email, user_name FROM "global".user_master WHERE user_code = ' || $1 ||' AND is_deleted = false) r;';
        raise notice '%',_query;
        execute _query into _result;
        return _result;
	end
$function$
;


CREATE OR REPLACE FUNCTION global.user_details(user_codes integer[])
 RETURNS jsonb[]
 LANGUAGE plpgsql
AS $function$declare
	_query text;
    _result jsonb[];
	begin
        _query := 'select array_agg(users) from (SELECT to_jsonb(r) as users FROM (
            SELECT user_code, name, email, user_name 
            FROM "global".user_master WHERE user_code in 
            ('|| (ARRAY_TO_STRING($1, ', ', '')) || ') AND is_deleted = false) 
        r) users;';
        raise notice '%',_query;
        execute _query into _result;
        return _result;
	end
$function$
;
