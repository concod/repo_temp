--liquibase formatted sql
--changeset nikhil.dhoot:get_oms_all_off_cycle_drafts_update2 runOnChange:true stripComments:false splitStatements:false context:Release_1_1 labels:MTP-93604.
--comment: Get all off-cycle order drafts update1

DROP FUNCTION IF EXISTS inventory_smart.get_oms_all_off_cycle_drafts(input refcursor, input_data jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.get_oms_all_off_cycle_drafts(input refcursor, input_data jsonb DEFAULT '{}'::jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
/*
    Returns a list of all off-cycle order drafts with draft_id, draft_name, created_on, last_updated, and product_count
    Supports pagination, sorting, and search via meta parameter
    
    Input:
      - input_data: JSONB object containing meta
        Example: '{"meta": {"limit": {"page": 1, "limit": 10}, "sort": [{"column": "draft_id", "order": "desc"}], "search": [...]}}'
    
    Usage:
        BEGIN;
        SELECT inventory_smart.get_oms_all_off_cycle_drafts(
            'my_cursor'::refcursor,
            '{"meta": {"limit": {"page": 1, "limit": 10}}}'::jsonb
        );
        FETCH ALL FROM my_cursor;
        COMMIT;
*/
DECLARE
    v_input_data jsonb := input_data;
    v_meta jsonb := NULL;
    v_query text := '';
    v_limit_clause text := '';
    v_where_clause text := '';
    v_order_clause text := '';
    v_limit_json jsonb := NULL;
    v_search_json jsonb := NULL;
    v_meta_cls text := '';
BEGIN
    -- Extract meta from input_data
    IF v_input_data <> '{}' AND v_input_data->'meta' IS NOT NULL THEN
        v_meta := v_input_data->'meta';
    ELSE
        v_meta := '{}'::jsonb;
    END IF;
    
    -- Extract limit for pagination
    IF v_meta <> '{}' AND v_meta->'limit' IS NOT NULL THEN
        v_limit_json := v_meta->'limit';
        v_search_json := v_meta - 'limit';
        v_limit_clause := global.form_table_query(jsonb_build_object('limit', v_limit_json));
    ELSE
        v_search_json := v_meta;
    END IF;
    
    -- Generate WHERE and ORDER BY clauses from search and sort
    IF v_search_json IS NOT NULL AND jsonb_typeof(v_search_json) = 'object' AND v_search_json <> '{}'::jsonb THEN
        v_meta_cls := global.form_table_query(v_search_json);
        
        -- Extract WHERE clause (if present)
        IF v_meta_cls ~* 'WHERE' THEN
            v_where_clause := trim(substring(v_meta_cls FROM 'WHERE\s.*?(?=\sORDER\sBY|\sLIMIT|\sOFFSET|$)'));
            -- Remove trailing comma if present
            v_where_clause := rtrim(v_where_clause, ',');
        END IF;
        
        -- Extract ORDER BY clause (if present)
        IF v_meta_cls ~* 'ORDER BY' THEN
            v_order_clause := trim(substring(v_meta_cls FROM 'ORDER\sBY\s.*?(?=\sLIMIT|\sOFFSET|$)'));
            -- Remove trailing comma if present
            v_order_clause := rtrim(v_order_clause, ',');
        END IF;
    END IF;
    
    -- Set default ORDER BY if no sort specified
    IF v_order_clause = '' THEN
        v_order_clause := 'ORDER BY draft_id DESC';
    END IF;
    
    -- Clean up limit clause (remove leading comma if present)
    IF v_limit_clause <> '' THEN
        v_limit_clause := trim(v_limit_clause);
        v_limit_clause := ltrim(v_limit_clause, ',');
    END IF;
    
    -- Build query to get distinct draft_id and draft_name with aggregated fields
    -- Count distinct articles where at least one article-loc_code combination is not approved
    v_query := '
    WITH draft_info AS (
        SELECT 
            draft_id,
            draft_name,
            MIN(created_at) AS created_on,
            MAX(updated_at) AS last_updated
        FROM inventory_smart.oms_cno_off_cycle_draft
        WHERE is_deleted = false
        GROUP BY draft_id, draft_name
    ),
    article_groups AS (
        SELECT 
            draft_id,
            article,
            BOOL_OR(is_approved = false) AS has_unapproved
        FROM inventory_smart.oms_cof_orders_recommended
        WHERE draft_id IS NOT NULL
        GROUP BY draft_id, article
    ),
    product_counts AS (
        SELECT 
            draft_id,
            COUNT(DISTINCT article) AS product_count
        FROM article_groups
        WHERE has_unapproved = true
        GROUP BY draft_id
    )
    SELECT 
        di.draft_id,
        di.draft_name,
        di.created_on,
        di.last_updated,
        COALESCE(pc.product_count, 0) AS product_count
    FROM draft_info di
    LEFT JOIN product_counts pc ON di.draft_id = pc.draft_id
    WHERE COALESCE(pc.product_count, 0) > 0';
    
    -- Add WHERE clause (if present)
    IF v_where_clause <> '' THEN
        v_query := v_query || ' AND ' || ltrim(v_where_clause, 'WHERE');
    END IF;
    
    -- Add ORDER BY clause
    IF v_order_clause <> '' THEN
        v_query := v_query || ' ' || v_order_clause;
    END IF;
    
    -- Add LIMIT/OFFSET clause for pagination
    IF v_limit_clause <> '' THEN
        v_query := v_query || ' ' || v_limit_clause;
    END IF;
    
    RAISE NOTICE 'v_query: %', v_query;
    OPEN input FOR EXECUTE v_query;
    RETURN input;
END;
$function$
;

