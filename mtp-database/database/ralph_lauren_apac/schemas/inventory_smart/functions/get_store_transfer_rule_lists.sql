--liquibase formatted sql
--changeset aniket.ashis:get_store_transfer_rule_list_v4 stripComments:false runOnChange:true splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: Fix ambiguous column reference by qualifying columns with table alias
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.get_store_transfer_rule_lists(refcursor, jsonb);

CREATE OR REPLACE FUNCTION inventory_smart.get_store_transfer_rule_lists(refcursor, _meta jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
DECLARE 
    _query_meta_filters TEXT;
    _query TEXT;
BEGIN
    -- Get the meta filters from global.form_table_query
    _query_meta_filters := global.form_table_query(_meta);

    -- Replace WHERE with AND since we already have a WHERE clause
    IF _query_meta_filters IS NOT NULL AND _query_meta_filters != '' THEN
        _query_meta_filters := REPLACE(_query_meta_filters, ' WHERE ', ' AND ');
        
        -- Fix: Replace DATE(column) with DATE(r.column) for ambiguous columns
        _query_meta_filters := REPLACE(_query_meta_filters, 'DATE(created_at)', 'DATE(r.created_at)');
        _query_meta_filters := REPLACE(_query_meta_filters, 'DATE(updated_at)', 'DATE(r.updated_at)');
        
        -- Fix: Replace unnest(column) with r.column for non-array columns
        -- Since channel, transfer_within etc are VARCHAR not arrays
        _query_meta_filters := REPLACE(_query_meta_filters, 'unnest(channel)', 'r.channel');
        _query_meta_filters := REPLACE(_query_meta_filters, 'unnest(r.channel)', 'r.channel');
        
        -- Fix: Qualify other column references
        _query_meta_filters := regexp_replace(_query_meta_filters, '\mtransfer_within\M', 'r.transfer_within', 'g');
        _query_meta_filters := regexp_replace(_query_meta_filters, '\mrule_name\M', 'r.rule_name', 'g');
        _query_meta_filters := regexp_replace(_query_meta_filters, '\mrule_id\M', 'r.rule_id', 'g');
        _query_meta_filters := regexp_replace(_query_meta_filters, '\mis_default\M', 'r.is_default', 'g');
        
        -- Fix: Remove the exists() wrapper that was added for array handling
        _query_meta_filters := regexp_replace(_query_meta_filters, 'exists\(select 1 from ([^)]+) as element where element ilike any\(''\{([^}]+)\}''\)\)', 'r.channel ILIKE ''\2''', 'g');
        
        -- Debug: Output the modified filters
        RAISE NOTICE 'Modified query filters: %', _query_meta_filters;
    END IF;

    _query := '
        SELECT 
            r.rule_id,
            r.rule_name,
            r.channel,
            r.transfer_within,
            r.is_default,
            TO_CHAR(r.created_at AT TIME ZONE ''' || inventory_smart.get_tenant_timezone() || ''', ''mm-dd-yyyy hh:mi:ss'') AS created_at,
            TO_CHAR(r.updated_at AT TIME ZONE ''' || inventory_smart.get_tenant_timezone() || ''', ''mm-dd-yyyy hh:mi:ss'') AS updated_at,
            COALESCE(um_c.user_name, r.created_by::text) AS created_by,
            COALESCE(um_u.user_name, r.updated_by::text) AS updated_by
        FROM inventory_smart.store_transfer_rules r
        LEFT JOIN global.user_master um_c
        ON r.created_by = um_c.user_code
        LEFT JOIN global.user_master um_u
        ON r.updated_by = um_u.user_code
        WHERE r.is_deleted = false
        ' || _query_meta_filters || ';
    ';

    RAISE NOTICE 'Query: %', _query;

    OPEN $1 FOR EXECUTE _query;
    RETURN $1;

END
$function$;
