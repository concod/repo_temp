--liquibase formatted sql
--changeset liquibase:users_tenant_list runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for users_tenant_list
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.users_tenant_list(input integer[]);
CREATE OR REPLACE FUNCTION global.users_tenant_list(input integer[])
 RETURNS TABLE(tenant_name character varying, region text[], service_start_dt date, no_of_users integer, lic_no character varying, application_name character varying, user_name character varying)
 LANGUAGE plpgsql
AS $function$
declare 
_query_combine text := '';

begin
_query_combine := 'select distinct tm.tenant_name
,tm.region
, tm.service_start_dt ,
tm.no_of_users, tm.lic_no, am.name application_name,
um.name user_name 
from 
global.tenant_master tm join 
global.application_master am 
on am.application_code =any(tm.application_code::int[]) 
join 
global.acl_master am2 
on am.application_code = am2.application_code 
join global.role_acl_mapping ram 
on am2.acl_code =ram.acl_code 
join global.user_roles_mapping urm 
on ram.role_code = urm.role_code 
join global.user_master um 
on urm.user_code  =um.user_code 
and um.user_code =any(''' || concat($1) || '''::int[]) '
;

raise notice '%',
_query_combine;

return query execute _query_combine;
end
$function$
;
