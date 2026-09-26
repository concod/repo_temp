--liquibase formatted sql
--changeset anoop.madamsetty@impactanalytics.co:contains_substring_text_anyelement-1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for contains_substring_text_anyelement

DROP FUNCTION IF EXISTS price_markdown.contains_substring(anyelement, text, text);
CREATE OR REPLACE FUNCTION price_markdown.contains_substring(column_value anyelement, search_term text, search_type text DEFAULT 'contains'::text)
 RETURNS boolean
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Convert anyelement to text and call the existing text function
    RETURN price_markdown.contains_substring(column_value::text, search_term, search_type);
END;
$function$
;
