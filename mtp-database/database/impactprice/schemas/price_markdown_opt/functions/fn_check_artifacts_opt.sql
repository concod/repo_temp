--liquibase formatted sql
--changeset liquibase:fn_check_artifacts_opt runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for fn_check_artifacts_opt

DROP FUNCTION IF EXISTS price_markdown_opt.fn_check_artifacts_opt(text, text, text);

CREATE OR REPLACE FUNCTION price_markdown_opt.fn_check_artifacts_opt(_type text, _schema text, _name text)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
BEGIN
    CASE _type
        WHEN 'table' THEN
            RETURN (SELECT CASE WHEN EXISTS (
                SELECT 1
                FROM information_schema.tables
                WHERE table_schema = _schema
                AND table_name = _name
            ) THEN 1 ELSE 0 END);
        WHEN 'materialized view' THEN
            RETURN (SELECT CASE WHEN EXISTS (
                SELECT 1
                FROM pg_matviews
                WHERE schemaname = _schema
                AND matviewname = _name
            ) THEN 1 ELSE 0 END);
        WHEN 'procedure' THEN
            RETURN (SELECT CASE WHEN EXISTS (
                SELECT 1
                FROM information_schema.routines
                WHERE routine_schema = _schema
                AND routine_name = _name
            ) THEN 1 ELSE 0 END);
        WHEN 'function' THEN
            RETURN (SELECT CASE WHEN EXISTS (
                SELECT 1
                FROM information_schema.routines
                WHERE routine_schema = _schema
                AND routine_name = _name
                AND routine_type = 'FUNCTION'
            ) THEN 1 ELSE 0 END);
        ELSE
            RETURN 0; -- Default to 0 if invalid type
    END CASE;
END;
$function$
;