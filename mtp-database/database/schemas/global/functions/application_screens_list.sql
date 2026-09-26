--liquibase formatted sql
--changeset liquibase:application_screens_list runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for application_screens_list
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.application_screens_list(input text[], text);
CREATE OR REPLACE FUNCTION global.application_screens_list(input text[], text)
 RETURNS TABLE(attribute character varying)
 LANGUAGE plpgsql
AS $function$
 declare
    _query text;
    begin
     _query :='
    select
        distinct sm.screen_name screen
        from
            "global".screen_master sm
        left join "global".application_master am on am.application_code = any(sm.application)
        where (sm.dimensions @> (''' || concat($1) || '''::varchar[]) and sm.dimensions <@ (''' || concat($1) || '''::varchar[]))
        and lower(am.name) = lower(''' || concat($2) || '''::varchar)'
            ;
    raise notice '%',_query;
    return query execute _query;
    end
    $function$
;