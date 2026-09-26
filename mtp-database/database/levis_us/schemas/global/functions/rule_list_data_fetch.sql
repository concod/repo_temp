--liquibase formatted sql
--changeset disha.a@impactanalytics.co:levis_changes runOnChange:true stripComments:false splitStatements:false context:MTP-89745 labels:MTP-89745
--comment: handling the initcap function
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.rule_list_data_fetch(refcursor, jsonb);
CREATE OR REPLACE FUNCTION global.rule_list_data_fetch(output refcursor, p_module_code jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
DECLARE
    _query text;
    module_code text;
BEGIN
    -- Extract the module_code value from the JSONB input
    module_code := p_module_code ->> 'p_module_code';

    -- Build the dynamic SQL query
    _query := '
        WITH pgsm_data AS (
            SELECT
                generic_column_name,
                COALESCE(NULLIF(pgsm.display_name, ''''), pgsm.source_column_name, pgsm.generic_column_name) AS source_display_name
            FROM
                global.product_generic_schema_mapping pgsm
        )
        SELECT
            rm.rcl_code,
            rm.module_code,
            ARRAY_AGG(REPLACE(pgsm_data.source_display_name::text, ''_'', '' '')::character varying) AS level,
            rm.priority
        FROM
            global.rcl_master rm
        JOIN pgsm_data
            ON pgsm_data.generic_column_name = ANY(rm.rcl_lowest_level)
        WHERE
            rm.module_code = ''' || module_code || '''
            AND rm.is_deleted = false
        GROUP BY
            rm.rcl_code,
            rm.module_code,
            rm.priority
    ';

    RAISE NOTICE '%', _query;

    -- Execute the query into the cursor
    OPEN output FOR EXECUTE _query;
    RETURN output;
END;
$function$
;
