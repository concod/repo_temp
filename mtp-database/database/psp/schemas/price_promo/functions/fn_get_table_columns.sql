--liquibase formatted sql
--changeset harsh.singh@impactanalytics.co:fn_get_table_columns runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for fn_get_table_columns

DROP FUNCTION if exists price_promo.fn_get_table_columns;

CREATE OR REPLACE FUNCTION price_promo.fn_get_table_columns(p_schema_name text, p_table_name text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    _column_list text;
BEGIN
    SELECT string_agg(column_name, ', ' ORDER BY ordinal_position)
    INTO _column_list
    FROM information_schema.columns
    WHERE table_schema = p_schema_name
    AND table_name = p_table_name;

    RETURN _column_list;

EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error fetching columns: %', SQLERRM;
    RETURN NULL;
END;
$function$
;