--liquibase formatted sql
--changeset liquibase:user_application_list runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for user_application_list
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.user_application_list(input integer[]);
CREATE OR REPLACE FUNCTION global.user_application_list(input integer[])
 RETURNS TABLE(application jsonb)
 LANGUAGE plpgsql
AS $function$
declare 
_query_combine text := '';
begin
_query_combine := 
	'select
	distinct jsonb_build_object(
	''applications'', am2.name)
	from
		global.application_master am2
	join global.acl_master am
	 on
		am.application_code = am2.application_code
	join global.role_acl_mapping ram 
	 on
		am.acl_code = ram.acl_code
	join global.user_roles_mapping urm
	 on
		ram.role_code = urm.role_code
	join global.user_master um 
	 on
		urm.user_code = um.user_code
		and um.user_code = any(''' || concat($1) || '''::int[])';

raise notice '%',
_query_combine;
return query execute _query_combine;
end
;
$function$
;


CREATE OR REPLACE FUNCTION global.user_application_list(input integer)
 RETURNS TABLE(application jsonb)
 LANGUAGE plpgsql
AS $function$
declare 
_query_combine text := '';
begin
_query_combine := 
	'select
	distinct jsonb_build_object(
	''applications'', am2.name)
	from
		global.application_master am2
	join global.acl_master am
	 on
		am.application_code = am2.application_code
	join global.role_acl_mapping ram 
	 on
		am.acl_code = ram.acl_code
	join global.user_roles_mapping urm
	 on
		ram.role_code = urm.role_code
	join global.user_master um 
	 on
		urm.user_code = um.user_code
		and um.user_code ='|| $1 ;
--any(''' || concat($1) || '''::int[])
raise notice '%',
_query_combine;
return query execute _query_combine;
end
;
$function$
;
