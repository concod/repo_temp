-- liquibase formatted sql
-- changeset akashkumar.rana@impactanalytics.co:run_multiple_queries_02 runOnChange:true stripComments:false splitStatements:false context:run_multiple_queries_02 labels:run_multiple_queries_02
-- comment: initial changeset for run_multiple_queries_02

DROP FUNCTION IF EXISTS size_smart.run_multiple_queries(json);

-- DROP FUNCTION size_smart.run_multiple_queries(json);

CREATE OR REPLACE FUNCTION size_smart.run_multiple_queries(query_list json)
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
$function$
;