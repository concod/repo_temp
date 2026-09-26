--liquibase formatted sql
--changeset anoop.madamsetty@impactanalytics.co:contains_substring_text-1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for contains_substring_text

DROP FUNCTION if exists price_markdown.contains_substring(text, text, text);
CREATE OR REPLACE FUNCTION price_markdown.contains_substring(column_value text, search_term text, search_type text DEFAULT 'contains'::text)
 RETURNS boolean
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Handle NULL search_term
    IF search_term IS NULL THEN
        CASE lower(search_type)
            WHEN 'not_contains', 'not_equals' THEN
                RETURN true;  -- NULL search term means "not contains/equals" is true
            ELSE
                RETURN false; -- NULL search term means other operations are false
        END CASE;
    END IF;

    -- Handle NULL column_value
    IF column_value IS NULL THEN
        CASE lower(search_type)
            WHEN 'not_contains', 'not_equals' THEN
                RETURN true;  -- NULL value doesn't contain/equal anything
            ELSE
                RETURN false; -- NULL value doesn't match anything
        END CASE;
    END IF;

    -- Handle both NULL cases
    IF column_value IS NULL AND search_term IS NULL THEN
        CASE lower(search_type)
            WHEN 'equals' THEN
                RETURN true;  -- NULL equals NULL
            WHEN 'not_equals' THEN
                RETURN false; -- NULL equals NULL, so not_equals is false
            ELSE
                RETURN false; -- Other operations with both NULL are false
        END CASE;
    END IF;

    -- Normal processing for non-NULL values
    CASE lower(search_type)
        WHEN 'contains' THEN
            RETURN lower(column_value) LIKE '%' || lower(search_term) || '%';
        WHEN 'not_contains' THEN
            RETURN lower(column_value) NOT LIKE '%' || lower(search_term) || '%';
        WHEN 'equals' THEN
            RETURN lower(column_value) = lower(search_term);
        WHEN 'not_equals' THEN
            RETURN lower(column_value) != lower(search_term);
        WHEN 'starts_with' THEN
            RETURN lower(column_value) LIKE lower(search_term) || '%';
        WHEN 'ends_with' THEN
            RETURN lower(column_value) LIKE '%' || lower(search_term);
        ELSE
            -- Default to 'contains' for unknown search types
            RETURN lower(column_value) LIKE '%' || lower(search_term) || '%';
    END CASE;
END;
$function$
;
