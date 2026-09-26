
--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:fn_refresh_materialized_view_v1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial_function_create for fn_refresh_materialized_view_v1


DROP FUNCTION IF EXISTS base_pricing.fn_refresh_materialized_view(text, text);

CREATE OR REPLACE FUNCTION base_pricing.fn_refresh_materialized_view(schema_name text, view_name text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    EXECUTE format('REFRESH MATERIALIZED VIEW %I.%I;', schema_name, view_name);
END;
$function$
;
