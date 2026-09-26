--liquibase formatted sql
--changeset liquibase:fetch_user_dnd runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for fetch_user_dnd
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.fetch_user_dnd(user_id integer);
CREATE OR REPLACE FUNCTION global.fetch_user_dnd(user_id integer)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$declare
	_query text;
	_cnt Integer := 0;
	
	begin
	
		_query := 'select count(*) 
                        from global.user_attributes 
                   where 
                        attribute_name=''do_not_disturb'' 
                        and user_code= ' || $1 || '
                        and attribute_value=''true''';
	
	
		raise notice '%', _query;
		execute _query into _cnt;		
		return _cnt;
end
$function$
;


CREATE OR REPLACE FUNCTION global.fetch_user_dnd(user_codes integer[])
 RETURNS json
 LANGUAGE plpgsql
AS $function$declare
	_query text;
	_data json := 0;
	
	begin
	
		_query := '
        SELECT json_object_agg(user_code, dnd_status) from (
            select 
                user_code, 
                case when attribute_value = ''true'' then true else false end as dnd_status
            from global.user_attributes where 
                attribute_name=''do_not_disturb''
                and user_code in (' || (ARRAY_TO_STRING($1, ', ', '')) || ')
            ) u';
	
	
		raise notice '%', _query;
		execute _query into _data;		
		return _data;
end$function$
;
