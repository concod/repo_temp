--liquibase formatted sql
--changeset liquibase:add_tenant_secret runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for add_tenant_secret
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.add_tenant_secret(tenant character varying, secret_id character varying, version integer);
CREATE OR REPLACE FUNCTION global.add_tenant_secret(tenant character varying, secret_id character varying, version integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$declare
_query text;
_tenant varchar := $1;
_secret_id varchar := $2;
_version integer := $3;
begin
    _query := 'INSERT INTO "global".tenant_context(tenant,secret_id,version) values(''' || _tenant || ''',''' || _secret_id || ''',''' || _version || ''');';
    execute _query;
return;
end$function$
;
