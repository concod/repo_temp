--liquibase formatted sql
--changeset durgaprasad.tulugu@impactanalytics.co:fn_refresh_materialized_view_2 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: function_create_2 fn_refresh_materialized_view_2
--rollback: SELECT 1
DROP FUNCTION if exists global.fn_refresh_materialized_view;
CREATE OR REPLACE FUNCTION global.fn_refresh_materialized_view(schema_name text, view_name text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    EXECUTE format('REFRESH MATERIALIZED VIEW %I.%I;', schema_name, view_name);
END;
$function$
;
