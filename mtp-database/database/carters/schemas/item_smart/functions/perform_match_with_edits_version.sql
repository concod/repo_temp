--liquibase formatted sql
--changeset kalyan.chandu@impactanalytics.co:match_with runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:item_smart_initial_commit
--comment: initial changeset for match_with_edits_version.sql
--rollback: SELECT 1
DROP FUNCTION IF EXISTS item_smart.perform_match_with_edits_version(date, date, jsonb, text, _text, text, text, text);

CREATE OR REPLACE FUNCTION item_smart.perform_match_with_edits_version(sdate date, edate date, filters jsonb, dept text, channels text[], editable_kpi text, plan_version text, planing_level text)
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
                'SELECT item_smart.match_with_ly_edit(%L, %L, %L, %L, %L, %L,%L)', 
                sdate, edate, filters, dept, channels, editable_kpi,planing_level
            );
         WHEN 'lly' THEN
            query_text := format(
                'SELECT item_smart.match_with_lly_edit(%L, %L, %L, %L, %L, %L, %L)', 
                sdate, edate, filters, dept, channels, editable_kpi,planing_level
            );
        WHEN 'iaf' THEN
            query_text := format(
                'SELECT item_smart.match_with_iaf_edit(%L, %L, %L, %L, %L, %L, %L)', 
                sdate, edate, filters, dept, channels, editable_kpi,planing_level
            );
        WHEN 'op' THEN
            query_text := format(
                'SELECT item_smart.match_with_op_edit(%L, %L, %L, %L, %L, %L, %L)', 
                sdate, edate, filters, dept, channels, editable_kpi,planing_level
            );
        WHEN 'lf' THEN
            query_text := format(
                'SELECT item_smart.match_with_lf_edit(%L, %L, %L, %L, %L, %L, %L)', 
                sdate, edate, filters, dept, channels, editable_kpi,planing_level
            );
        WHEN 'wp' THEN
            query_text := format(
                'SELECT item_smart.match_with_wp_edit(%L, %L, %L, %L, %L, %L, %L)', 
                sdate, edate, filters, dept, channels, editable_kpi,planing_level
            );
        ELSE
            -- Handle unsupported version
            RAISE EXCEPTION 'Unsupported version: %', plan_version;
    END CASE;

    -- Execute the dynamically constructed query
    EXECUTE query_text INTO rows_updated;

    -- Return the number of rows updated
    RETURN rows_updated;

EXCEPTION
    WHEN others THEN
        -- Handle any exceptions and return -1 to indicate failure
        RETURN -1;
END;
$function$
;
