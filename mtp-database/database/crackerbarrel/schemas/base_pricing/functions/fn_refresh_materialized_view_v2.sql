--liquibase formatted sql
--changeset subhasis.jena@impactanalytics.co:fn_refresh_materialized_view_v2 stripComments:false runOnChange:true splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.fn_refresh_materialized_view_v2

DROP FUNCTION IF EXISTS base_pricing.fn_refresh_materialized_view_v2;

CREATE OR REPLACE FUNCTION base_pricing.fn_refresh_materialized_view_v2(schema_name text, view_name text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    sql_command text;
BEGIN
    BEGIN
        -- Build the dynamic DO block as text
        sql_command := format(
            'DO $$ BEGIN EXECUTE format(''REFRESH MATERIALIZED VIEW CONCURRENTLY %%I.%%I;'', %L, %L); END $$;',
            schema_name,
            view_name
        );

        -- Execute it in a new session using dblink (so it runs outside current transaction)
        PERFORM dblink_exec('dbname=' || current_database(), sql_command);

    EXCEPTION
        WHEN undefined_function THEN
            RAISE NOTICE 'dblink not available, running normal refresh';
            EXECUTE format('REFRESH MATERIALIZED VIEW %I.%I;', schema_name, view_name);
        WHEN OTHERS THEN
            RAISE NOTICE 'Concurrent refresh failed, falling back: %', SQLERRM;
            EXECUTE format('REFRESH MATERIALIZED VIEW %I.%I;', schema_name, view_name);
    END;
END;
$function$
;