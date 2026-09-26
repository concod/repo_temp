--liquibase formatted sql
--changeset liquibase:roles_list runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for roles_list
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.roles_list();
CREATE OR REPLACE FUNCTION global.roles_list()
 RETURNS TABLE(roles json)
 LANGUAGE plpgsql
AS $function$
declare 
_query_combine text := '';
begin
_query_combine := '
select  json_agg(
                              jsonb_build_object(
                                  ''id'', role_code,
                                  ''name'', name
                              )
                          ) as roles from "global".roles_master rm where rm.status =true' ;
raise notice '%',
_query_combine;
return query execute _query_combine;
end
;
$function$
;


CREATE OR REPLACE FUNCTION global.roles_list(input integer[], text[], text[])
 RETURNS TABLE(roles jsonb)
 LANGUAGE plpgsql
AS $function$
declare 
_query_combine text := '';
begin
_query_combine := '
select 			distinct
                            jsonb_build_object(
                                ''id'', rm.role_code,
								''user_code'', urm.user_code,
                                ''role_name'', rm.name,
                                ''application'', lower(urm.application_name),
                                ''department'', ua.attribute_value ::varchar)
                        as roles
        from (select * from global.roles_master where status) rm 
        			join global.urm_master urm on rm.role_code = urm.role_code 
                    join global.urm_attributes ua 
                    on urm.user_code = ua.user_code
                    and ua.attribute_name =''l0_name'' 
                    and ua.attribute_value = any (''' || concat($3) || '''::varchar[])
                    and rm.role_code = any(''' || concat($1) || '''::int[])
                    and lower(urm.application_name) = any(''' || concat($2) || '''::varchar[])'
;

raise notice '%',
_query_combine;
return query execute _query_combine;
end
;
$function$
;


CREATE OR REPLACE FUNCTION global.roles_list(input integer[])
 RETURNS TABLE(roles jsonb)
 LANGUAGE plpgsql
AS $function$
declare 
_query_combine text := '';
begin
_query_combine := '
select 
                            jsonb_build_object(
                                ''id'', rm.role_code,
                                ''role_name'', rm.name,
                                ''user_code'',urm.user_code,
                                ''application'',apm.name ,
                                ''department'',lower(uahm.access_hierarchy->>''l0_name'')
                            )
                        as roles
        from (select * from global.roles_master where status) rm join
                global.user_roles_mapping urm
                    on rm.role_code = urm.role_code
                    join global.user_access_hierarchy_mapping uahm on urm.user_code = uahm.user_code 
                    join global.acl_master am on am.acl_code = uahm.acl_code
					join global.application_master apm  on am.application_code  = apm.application_code 
                    and urm.user_code = any(''' || concat($1) || '''::int[])
        group by
                    rm.role_code, rm.name, urm.user_code,apm.name,uahm.access_hierarchy->>''l0_name''
					';
raise notice '%',
_query_combine;
return query execute _query_combine;
end
$function$
;
