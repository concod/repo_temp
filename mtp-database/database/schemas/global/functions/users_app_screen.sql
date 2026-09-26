--liquibase formatted sql
--changeset srishti.kumari@impactanalytics.co:users_app_screen runOnChange:true stripComments:false splitStatements:false context:MTP-118205 labels:MTP-118205
--comment: sending parameters seperately to query
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.users_app_screen(input integer[], character varying[]);
CREATE OR REPLACE FUNCTION global.users_app_screen(
    user_codes integer[], 
    app_names character varying[]
)
RETURNS TABLE(application_name character varying, screen_name character varying)
LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY EXECUTE '
        SELECT 
            am.name AS application_name, 
            sm.screen_name
        FROM global.acl_master acm 
        JOIN global.user_access_hierarchy_mapping uahm ON acm.acl_code = uahm.acl_code 
        JOIN global.application_master am ON acm.application_code = am.application_code 
        JOIN global.screen_master sm ON acm.screen_code = sm.screen_code 
        WHERE 1=1
            AND am.status 
            AND acm.status 
            AND uahm.user_code = ANY($1)
            AND (array_length($2, 1) IS NULL OR lower(am.name) = ANY($2))
        GROUP BY am.name, sm.screen_name
        ORDER BY sm.screen_name'
    USING user_codes, app_names;
END
$function$;

--liquibase formatted sql
--changeset srishti.kuamri@impactanalytics.co:users_app_screen_ runOnChange:true stripComments:false splitStatements:false context:MTP-118205 labels:MTP-118205
--comment: sending parameters seperately to query
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.users_app_screen(input integer[], character varying[], character varying[]);
CREATE OR REPLACE FUNCTION global.users_app_screen(
    user_codes integer[], 
    app_names character varying[], 
    screens character varying[]
)
RETURNS TABLE(application character varying, screen character varying, action character varying, access_hierarchy jsonb)
LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY EXECUTE '
        SELECT urm.application_code, urm.screen_name, am3."action", urm.access_hierarchy
        FROM (
            SELECT 
                application_name AS application_code,
                screen AS screen_name,
                unnest(action_code::int[]) AS action_code,
                access_hierarchy::jsonb AS access_hierarchy
            FROM global.urm_master um
            WHERE um.user_code = ANY($1)
              AND lower(um.application_name) = ANY($2)
              AND (lower(um.screen) = ANY($3) OR um.screen = ''All'')
        ) urm
        JOIN global.action_master am3 ON urm.action_code = am3.action_code
        ORDER BY urm.application_code, urm.screen_name'
    USING user_codes, app_names, screens;
END
$function$;
