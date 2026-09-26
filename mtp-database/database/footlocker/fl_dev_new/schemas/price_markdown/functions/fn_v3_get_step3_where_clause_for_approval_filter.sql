--liquibase formatted sql
--changeset durgaprasad.tulugu@impactanalytics.co:fn_v3_get_step3_where_clause_for_approval_filter-1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:approval
--comment: fn_v3_get_step3_where_clause_for_approval_filter-1
--rollback: SELECT 1

DROP FUNCTION if exists price_markdown.fn_v3_get_step3_where_clause_for_approval_filter;


CREATE OR REPLACE FUNCTION price_markdown.fn_v3_get_step3_where_clause_for_approval_filter(_approval_filter text[] DEFAULT NULL::text[])
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
    approval_enum_filter text[];
    approval_filter_condition text;
BEGIN
    -- If no filter is provided or multiple filters exist, return an empty condition
    IF _approval_filter IS NULL OR array_length(_approval_filter, 1) IS NULL OR array_length(_approval_filter, 1) > 1 THEN
        RETURN '';
    END IF;

    -- Determine the appropriate approval status values based on the filter
    IF 'not_approved' = ANY(_approval_filter) THEN
        approval_enum_filter := ARRAY['Not Approved'];
    ELSE
        approval_enum_filter := ARRAY['Initially Approved', 'Finally Approved'];
    END IF;

    -- Construct the approval filter condition
    approval_filter_condition := format(
        'INNER JOIN (
            SELECT product_level_id, store_level_id 
            FROM upcoming_pcd_cte 
            WHERE approval_status = ANY(%L::price_markdown.strategy_approval_status_enum[])
        ) fw 
        ON fw.product_level_id = s.product_level_id 
        AND fw.store_level_id = s.store_level_id',
        approval_enum_filter
    );
    
    RETURN approval_filter_condition;
END;
$function$
;
