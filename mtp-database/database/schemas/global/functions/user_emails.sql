--liquibase formatted sql
--changeset liquibase:user_emails runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for user_emails
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.user_emails(user_codes integer[]);
CREATE OR REPLACE FUNCTION global.user_emails(user_codes integer[])
 RETURNS json
 LANGUAGE plpgsql
AS $function$declare
	_query text;
	_data json;
	
	begin
	
		_query := '
        SELECT json_object_agg(user_code, email) from (
            select 
                user_code, email
            from global.user_master where 
                user_code in (' || (ARRAY_TO_STRING($1, ', ', '')) || ')
            order by 1) u';
	
	
		raise notice '%', _query;
		execute _query into _data;		
		return _data;
end$function$
;
