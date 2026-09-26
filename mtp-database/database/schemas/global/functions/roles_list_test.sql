--liquibase formatted sql
--changeset liquibase:roles_list_test runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for roles_list_test
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.roles_list_test(input integer[], text[], text[]);
CREATE OR REPLACE FUNCTION global.roles_list_test(input integer[], text[], text[])
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
                                ''user_code'',urm.user_code,
                                ''application'', lower(am.application),
                                ''department'',array[uahm.access_hierarchy->>''l0_name''::varchar]

                            )
                        as roles
        from (select * from global.roles_master where status) rm join
                global.user_roles_mapping urm
                    on rm.role_code = urm.role_code
                    join global.user_access_hierarchy_mapping uahm on urm.user_code = uahm.user_code 
                    join global.acl_master am on am.acl_code = uahm.acl_code
                    and rm.role_code = any(''' || concat($1) || '''::int[])
                    and lower(am.application) = any(''' || concat($2) || '''::varchar[])
                    and lower(uahm.access_hierarchy->>''l0_name'')= any (''' || concat($3) || '''::varchar[])
';
raise notice '%',
_query_combine;
return query execute _query_combine;
end
;
$function$
;
