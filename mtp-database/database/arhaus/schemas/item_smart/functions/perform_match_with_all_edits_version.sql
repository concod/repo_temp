--liquibase formatted sql
--changeset kalyan.chandu@impactanalytics.co:perform_match_all runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:perform_match_all
--comment: initial changeset for perform_match_all
--rollback: SELECT 1

DROP FUNCTION IF EXISTS item_smart.perform_match_with_all_edits_version(date, date, jsonb, text, _text, text, text);

CREATE OR REPLACE FUNCTION item_smart.perform_match_with_all_edits_version(sdate date, edate date, filters jsonb, dept text, channels text[], plan_version text, planing_level text)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
DECLARE
    rows_updated INT := 0;
    query_text TEXT;
BEGIN
    -- Dynamically choose the stored procedure based on the plan_version
    CASE plan_version
        WHEN 'ly' THEN
            query_text := format(
                'SELECT item_smart.match_with_all_ly_edit(%L, %L, %L, %L, %L, %L)', 
                sdate, edate, filters, dept, channels,planing_level
            );
         WHEN 'lly' THEN
            query_text := format(
                'SELECT item_smart.match_with_all_lly_edit(%L, %L, %L, %L, %L, %L)', 
                sdate, edate, filters, dept, channels,planing_level
            );
       
        WHEN 'op' THEN
            query_text := format(
                'SELECT item_smart.match_with_all_op_edit(%L, %L, %L, %L, %L, %L)', 
                sdate, edate, filters, dept, channels,planing_level
            );
        WHEN 'lf' THEN
            query_text := format(
                'SELECT item_smart.match_with_all_lf_edit(%L, %L, %L, %L, %L, %L)', 
                sdate, edate, filters, dept, channels,planing_level
            );
        ELSE
            RAISE EXCEPTION 'Unsupported version: %', plan_version;
    END CASE;

    -- Execute the dynamically constructed query
    EXECUTE query_text INTO rows_updated;

    -- Return the number of rows updated
    RETURN rows_updated;

EXCEPTION
    WHEN others THEN
        -- Handle exceptions and return -1 to indicate failure
        RETURN -1;
END;
$function$
;
