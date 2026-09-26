--liquibase formatted sql
--changeset sidharth.harish@impactanalytics.co:fn_check_artifacts_opt runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: pg new price_markdown.fn_check_artifacts_opt
--rollback: SELECT 1
DROP FUNCTION if exists price_markdown.fn_check_artifacts_opt;
CREATE OR REPLACE FUNCTION price_markdown.fn_check_artifacts_opt(_type text, _schema text, _name text)
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