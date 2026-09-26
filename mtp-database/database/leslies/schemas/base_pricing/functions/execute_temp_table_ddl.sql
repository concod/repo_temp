--liquibase formatted sql
--changeset subhasis.jena@impactanalytics.co:execute_temp_table_ddl_10 stripComments:false runOnChange:true splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.execute_temp_table_ddl_10

DROP FUNCTION IF EXISTS base_pricing.execute_temp_table_ddl;

CREATE OR REPLACE FUNCTION base_pricing.execute_temp_table_ddl(p_ddl_query text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    -- Validate query is for temp table DDL
    IF p_ddl_query !~ '(temp_new_products_|temp_rule_products_)' THEN
        RAISE EXCEPTION 'Invalid DDL: Query must reference temp table';
    END IF;
    
    -- Execute the DDL
    EXECUTE p_ddl_query;
    
    RETURN 'SUCCESS';
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Error executing temp table DDL: % - Query: %', SQLERRM, p_ddl_query;
        RAISE;
END;
$function$
;