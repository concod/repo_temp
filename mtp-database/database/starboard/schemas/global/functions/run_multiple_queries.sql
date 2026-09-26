--liquibase formatted sql
--changeset ezhil.kannan@impact:create_run_multiple_queries runOnChange:true stripComments:false splitStatements:false context:Release_1_2 labels:rule_store_new_exception_data_renderer_v3_update
--comment: create run_multiple_queries sp
--rollback: SELECT 1

DROP FUNCTION IF EXISTS global.run_multiple_queries(json);
CREATE OR REPLACE FUNCTION global.run_multiple_queries(query_list json)
RETURNS void
LANGUAGE plpgsql
AS $function$
DECLARE
    query TEXT;
BEGIN
    -- Entire function runs in a single transaction implicitly
    BEGIN
        FOR query IN SELECT * FROM json_array_elements_text(query_list)
        LOOP
            EXECUTE query;
        END LOOP;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Query failed: %', query;
        RAISE NOTICE 'Error: %', SQLERRM;
        RAISE;
    END;
END;
$function$;
