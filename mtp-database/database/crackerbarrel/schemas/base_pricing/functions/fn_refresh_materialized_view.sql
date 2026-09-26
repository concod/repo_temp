--liquibase formatted sql
--changeset subhasis.jena@impactanalytics.co:fn_refresh_materialized_view stripComments:false runOnChange:true splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.fn_refresh_materialized_view

DROP FUNCTION IF EXISTS base_pricing.fn_refresh_materialized_view;

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