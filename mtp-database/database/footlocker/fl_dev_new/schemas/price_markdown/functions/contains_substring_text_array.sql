--liquibase formatted sql
--changeset anoop.madamsetty@impactanalytics.co:contains_substring_text_array-1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for contains_substring_text_array

DROP FUNCTION if exists price_markdown.contains_substring(_text, text, text);
CREATE OR REPLACE FUNCTION price_markdown.contains_substring(column_value text[], search_term text, search_type text DEFAULT 'contains'::text)
 RETURNS boolean
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Handle NULL or empty arrays
    IF column_value IS NULL OR array_length(column_value, 1) IS NULL THEN
        CASE lower(search_type)
            WHEN 'not_contains', 'not_equals' THEN
                RETURN true;  -- NULL/empty array doesn't contain anything
            ELSE
                RETURN false; -- NULL/empty array doesn't match anything
        END CASE;
    END IF;

    CASE lower(search_type)
        WHEN 'contains' THEN
            -- Return true if ANY element contains the search term
            RETURN EXISTS (
                SELECT 1 FROM unnest(column_value) AS elem 
                WHERE lower(elem) LIKE '%' || lower(search_term) || '%'
            );
        WHEN 'not_contains' THEN
            -- Return true if NO element contains the search term (ALL elements don't contain it)
            RETURN NOT EXISTS (
                SELECT 1 FROM unnest(column_value) AS elem 
                WHERE lower(elem) LIKE '%' || lower(search_term) || '%'
            );
        WHEN 'equals' THEN
            -- Return true if ANY element equals the search term
            RETURN EXISTS (
                SELECT 1 FROM unnest(column_value) AS elem 
                WHERE lower(elem) = lower(search_term)
            );
        WHEN 'not_equals' THEN
            -- Return true if NO element equals the search term (ALL elements are different)
            RETURN NOT EXISTS (
                SELECT 1 FROM unnest(column_value) AS elem 
                WHERE lower(elem) = lower(search_term)
            );
        WHEN 'starts_with' THEN
            -- Return true if ANY element starts with the search term
            RETURN EXISTS (
                SELECT 1 FROM unnest(column_value) AS elem 
                WHERE lower(elem) LIKE lower(search_term) || '%'
            );
        WHEN 'ends_with' THEN
            -- Return true if ANY element ends with the search term
            RETURN EXISTS (
                SELECT 1 FROM unnest(column_value) AS elem 
                WHERE lower(elem) LIKE '%' || lower(search_term)
            );
        ELSE
            -- Default to 'contains' for unknown search types
            RETURN EXISTS (
                SELECT 1 FROM unnest(column_value) AS elem 
                WHERE lower(elem) LIKE '%' || lower(search_term) || '%'
            );
    END CASE;
END;
$function$
;
