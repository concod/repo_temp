--liquibase formatted sql
--changeset anoop.madamsetty@impactanalytics.co:contains_substring_text_anyarray-1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for contains_substring_text_anyarray

DROP FUNCTION IF EXISTS price_markdown.contains_substring(anyarray, text, text);
CREATE OR REPLACE FUNCTION price_markdown.contains_substring(column_value anyarray, search_term text, search_type text DEFAULT 'contains'::text)
 RETURNS boolean
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Convert anyarray to text array and call the existing text array function
    RETURN price_markdown.contains_substring(column_value::text[], search_term, search_type);
END;
$function$
;
