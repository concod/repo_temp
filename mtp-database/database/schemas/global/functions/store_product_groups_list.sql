--liquibase formatted sql
--changeset nikhil.hallale@impactanalytics.co:MTP-111318_store_product_groups_list_ootb runOnChange:true stripComments:false splitStatements:false context:MTP-111318 labels:MTP-111318
--comment: MTP-111318 Store Product Groups List OOTB - Universal version for all clients
--rollback: SELECT 1

-- =====================================================================================================================
-- Function Overload 1: Basic store product groups list (6 jsonb parameters)
-- Returns: Table with store group details including is_default column
-- Uses store_group_view for optimized filtering when available
-- =====================================================================================================================
DROP FUNCTION IF EXISTS global.store_product_groups_list(input jsonb,jsonb,jsonb,jsonb,jsonb,jsonb);

CREATE OR REPLACE FUNCTION global.store_product_groups_list(
    input jsonb,
    jsonb,
    jsonb,
    jsonb,
    jsonb,
    jsonb
)
RETURNS TABLE(
    sg_code integer,
    name character varying,
    special_classification character varying,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    created_by character varying,
    updated_by character varying,
    store_count bigint,
    sg_count bigint,
    channel character varying,
    is_default boolean
)
LANGUAGE plpgsql 
AS $function$
DECLARE
    _query_sm text := '';
    _query_sa text := '';
    _query_pm text := '';
    _query_pa text := '';
    _query_table_filters text := '';
    _query_combine text := '';
    _query_sg text := '';
    _main_filter_cnt int := 0;
    _attr_filter_cnt int := 0;
    _main_product_filter_cnt int := 0;
    _attr_product_filter_cnt int := 0;
    _filter_con text := ' ';
    _product_filter_con text := '';
    _validaity_where_clause text := 'where validity is not null ';
    
    -- Backward compatibility flags for optional columns/tables
    _has_is_default_column boolean := false;
    _is_default_select_outer text := 'NULL::boolean as is_default';
    _is_default_select_inner text := '';
    _has_store_group_view boolean := false;
    _sg_where_clause text := '';
BEGIN
    -- ═══════════════════════════════════════════════════════════════════════════
    -- BACKWARD COMPATIBILITY CHECK: is_default column
    -- ═══════════════════════════════════════════════════════════════════════════
    SELECT EXISTS(
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'global' 
            AND table_name = 'store_groups' 
            AND column_name = 'is_default'
    ) INTO _has_is_default_column;
    
    IF _has_is_default_column THEN
        _is_default_select_outer := 'sg.is_default';
        _is_default_select_inner := ',sg.is_default';
    END IF;
    
    -- ═══════════════════════════════════════════════════════════════════════════
    -- PERFORMANCE OPTIMIZATION: Check for store_group_view
    -- If available, use it for better performance and consistent filtering
    -- ═══════════════════════════════════════════════════════════════════════════
    SELECT EXISTS(
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'global' 
            AND table_name = 'store_group_view'
    ) INTO _has_store_group_view;
    
    -- ═══════════════════════════════════════════════════════════════════════════
    -- DEFAULT FILTERS: Append mandatory filters for data integrity
    -- ═══════════════════════════════════════════════════════════════════════════
    $1 := $1 || ('{"is_deleted":[{"type":"custom","operator":"=","values":false}]}'::jsonb);
    $2 := $2 || ('{"active":[{"type":"custom","operator":"=","values":true}]}'::jsonb);
    
    -- ═══════════════════════════════════════════════════════════════════════════
    -- BUILD STORE GROUPS FILTER QUERY
    -- ═══════════════════════════════════════════════════════════════════════════
    _query_sg := global.form_main_table_filters('store_groups', $1);
    
    -- Use store_group_view if available for optimized filtering
    IF _has_store_group_view THEN
        _sg_where_clause := ' where sg_code in (select sg_code from "global".store_group_view ' || _query_sg || ')';
        _query_sg := '';
    ELSE
        _sg_where_clause := _query_sg;
    END IF;
    
    -- ═══════════════════════════════════════════════════════════════════════════
    -- COUNT FILTERS: Determine which filter types are present
    -- ═══════════════════════════════════════════════════════════════════════════
    SELECT count(*) INTO _main_filter_cnt FROM jsonb_each_text($2);
    SELECT count(*) INTO _attr_filter_cnt FROM jsonb_each_text($3);
    SELECT count(*) INTO _main_product_filter_cnt FROM jsonb_each_text($4);
    SELECT count(*) INTO _attr_product_filter_cnt FROM jsonb_each_text($5);
    
    _query_table_filters := global.form_table_query($6);
    
    -- ═══════════════════════════════════════════════════════════════════════════
    -- BUILD PRODUCT FILTER QUERY
    -- Strategy: Build different queries based on which product filters are present
    -- ═══════════════════════════════════════════════════════════════════════════
    
    -- Case 1: Only product attribute filters (no main product filters)
    IF _main_product_filter_cnt = 0 AND _attr_product_filter_cnt != 0 THEN
        _query_pa := global.form_attribute_table_filters_v2('product_attributes', 'product_code', $5);
        _product_filter_con := 
            'select distinct y.store_code store_code 
             from ((' || _query_pa || ') x
                 join (select product_code, store_code 
                       from global.product_Store_mapping ' || _validaity_where_clause || ') y
                 on x.product_code = y.product_code)';
    
    -- Case 2: Only main product filters (no attribute filters)
    ELSIF _main_product_filter_cnt != 0 AND _attr_product_filter_cnt = 0 THEN
        _query_pm := global.form_main_table_filters('product_master', $4);
        _product_filter_con := 
            'select distinct y.store_code store_code 
             from ((select product_code from global.product_master' || _query_pm || ') x
                 join (select product_code, store_code 
                       from global.product_Store_mapping ' || _validaity_where_clause || ') y
                 on x.product_code = y.product_code)';
    
    -- Case 3: Both main and attribute product filters
    ELSIF _main_product_filter_cnt != 0 AND _attr_product_filter_cnt != 0 THEN
        _query_pa := global.form_attribute_table_filters_v2('product_attributes', 'product_code', $5);
        _query_pm := global.form_main_table_filters('product_master', $4);
        _product_filter_con := 
            'select distinct y.store_code store_code 
             from ((select product_code from global.product_master' || _query_pm || ') x
                 join (' || _query_pa || ') z on x.product_code = z.product_code
                 join (select product_code, store_code 
                       from global.product_Store_mapping ' || _validaity_where_clause || ') y
                 on x.product_code = y.product_code)';
    END IF;
    
    -- ═══════════════════════════════════════════════════════════════════════════
    -- BUILD STORE FILTER QUERY WITH PRODUCT FILTERS
    -- Strategy: LEFT JOIN to include all store groups, filtered by store criteria
    -- ═══════════════════════════════════════════════════════════════════════════
    
    -- Case 1: Only store attribute filters
    IF _main_filter_cnt = 0 AND _attr_filter_cnt != 0 THEN
        _query_sa := global.form_attribute_table_filters_v2('store_attributes', 'store_code', $3);
        
        -- With product filters
        IF length(_product_filter_con) > 1 THEN
            _filter_con := 
                ' JOIN (SELECT sgm.sg_code 
                             FROM (' || _query_sa || ') x 
                             JOIN (' || _product_filter_con || ') y on x.store_code = y.store_code
                             JOIN "global".store_groups_mapping sgm ON x.store_code = sgm.store_code 
                             group by sgm.sg_code) f ON sg.sg_code = f.sg_code ';
        
        -- Without product filters
        ELSIF length(_product_filter_con) = 0 THEN
            _filter_con := 
                ' JOIN (SELECT sgm.sg_code 
                             FROM (' || _query_sa || ') x 
                             JOIN "global".store_groups_mapping sgm ON x.store_code = sgm.store_code 
                             group by sgm.sg_code) f ON sg.sg_code = f.sg_code ';
        END IF;
    
    -- Case 2: Only main store filters
    ELSIF _main_filter_cnt != 0 AND _attr_filter_cnt = 0 THEN
        _query_sm := 'SELECT * FROM global.store_master' || (global.form_main_table_filters('store_master', $2));
        
        -- With product filters
        IF length(_product_filter_con) > 1 THEN
            _filter_con := 
                ' JOIN (SELECT sgm.sg_code 
                             FROM (' || _query_sm || ') x 
                             JOIN (' || _product_filter_con || ') y on x.store_code = y.store_code
                             JOIN "global".store_groups_mapping sgm ON x.store_code = sgm.store_code 
                             group by sgm.sg_code) f ON sg.sg_code = f.sg_code ';
        
        -- Without product filters
        ELSIF length(_product_filter_con) = 0 THEN
            _filter_con := 
                ' JOIN (SELECT sgm.sg_code 
                             FROM (' || _query_sm || ') x 
                             JOIN "global".store_groups_mapping sgm ON x.store_code = sgm.store_code 
                             group by sgm.sg_code) f ON sg.sg_code = f.sg_code ';
        END IF;
    
    -- Case 3: Both main and attribute store filters
    ELSIF _main_filter_cnt != 0 AND _attr_filter_cnt != 0 THEN
        _query_sm := 'SELECT * FROM global.store_master' || (global.form_main_table_filters('store_master', $2));
        _query_sa := global.form_attribute_table_filters_v2('store_attributes', 'store_code', $3);
        
        -- With product filters
        IF length(_product_filter_con) > 1 THEN
            _filter_con := 
                ' JOIN (SELECT sgm.sg_code 
                             FROM (' || _query_sm || ') x 
                             JOIN (' || _query_sa || ') y on x.store_code = y.store_code 
                             join (' || _product_filter_con || ') z on x.store_code = z.store_code 
                             join "global".store_groups_mapping sgm on x.store_code = sgm.store_code 
                             group by sgm.sg_code) f ON sg.sg_code = f.sg_code ';
        
        -- Without product filters
        ELSIF length(_product_filter_con) = 0 THEN
            _filter_con := 
                ' JOIN (SELECT sgm.sg_code 
                             FROM (' || _query_sm || ') x 
                             JOIN (' || _query_sa || ') y on x.store_code = y.store_code 
                             join "global".store_groups_mapping sgm ON x.store_code = sgm.store_code 
                             group by sgm.sg_code) f ON sg.sg_code = f.sg_code ';
        END IF;
    END IF;
    
    -- ═══════════════════════════════════════════════════════════════════════════
    -- BUILD FINAL QUERY
    -- Combines all filters, resolves user names, and aggregates store counts
    -- ═══════════════════════════════════════════════════════════════════════════
    _query_combine := 'SELECT * FROM (
        select 
            sg.sg_code,
            sg.name,
            sg.special_classification,
            sg.created_at,
            sg.updated_at,
            COALESCE(um.name, sg.created_by::varchar) as created_by,
            COALESCE(umup.name, sg.updated_by::varchar) as updated_by,
            COALESCE(sgm.store_count, 0) as store_count,
            COALESCE(sgm.sg_count, 0) as sg_count,
            sg.channel,
            ' || _is_default_select_outer || ' 
        from (
            select 
                sg_code,
                sg.name,
                sg.special_classification,
                sg.created_at,
                sg.updated_at,
                sg.created_by,
                sg.channel,
                sg.updated_by' || _is_default_select_inner || ' 
            from (select * from "global".store_groups ' || _sg_where_clause || ') sg
        ) sg 
        
        -- Resolve created_by user code to user name
        left join (select user_code, name 
                   from "global".user_master um 
                   where (um.is_deleted::bool = ''false''::bool)) um 
            on sg.created_by = um.user_code 
        
        -- Resolve updated_by user code to user name
        left join (select user_code, name 
                   from "global".user_master um 
                   where (um.is_deleted::bool = ''false''::bool)) umup 
            on sg.updated_by = umup.user_code' || _filter_con || ' 
        
        -- Aggregate store and nested store group counts
        left join (
            select 
                sg_code,
                count(distinct sgm.store_code) as store_count,
                count(distinct ref_sg_code) as sg_count 
            from "global".store_groups_mapping sgm 
            join "global".store_master sm on sgm.store_code = sm.store_code 
            where active 
            group by sg_code
        ) sgm on sg.sg_code = sgm.sg_code
    ) X ' || _query_table_filters;
    
	raise notice '%',_query_combine;
    RETURN QUERY EXECUTE _query_combine;
END
$function$;

-- =====================================================================================================================
-- Function Overload 2: Advanced store product groups list with cursor support (9 parameters)
-- Returns: refcursor or query string based on _return_query flag
-- Supports PSA (Product Store Attributes) optimization for performance
-- Uses store_group_view for optimized filtering when available
-- =====================================================================================================================
DROP FUNCTION IF EXISTS global.store_product_groups_list(input refcursor,jsonb,jsonb,jsonb,jsonb,jsonb,jsonb,boolean,boolean);

CREATE OR REPLACE FUNCTION global.store_product_groups_list(
    input refcursor,
    jsonb,
    jsonb,
    jsonb,
    jsonb,
    jsonb,
    jsonb,
    boolean,
    boolean
)
RETURNS refcursor
LANGUAGE plpgsql 
AS $function$
DECLARE
    _query_sm text := '';
    _query_sa text := '';
    _query_pm text := '';
    _query_pa text := '';
    _query_table_filters text := '';
    _query_combine text := '';
    _query_sg text := '';
    _main_filter_cnt int := 0;
    _attr_filter_cnt int := 0;
    _main_product_filter_cnt int := 0;
    _attr_product_filter_cnt int := 0;
    _filter_con text := ' ';
    _product_filter_con text := '';
    _validaity_where_clause text := 'where validity is not null ';
    
    -- Performance optimization flags
    _psa_flag bool := $8;  -- Use product_store_attributes table for faster queries
    _return_query bool := $9;  -- Return query string instead of cursor
    _has_store_group_view boolean := false;
    _sg_where_clause text := '';
BEGIN
    -- ═══════════════════════════════════════════════════════════════════════════
    -- PERFORMANCE OPTIMIZATION: Check for store_group_view
    -- ═══════════════════════════════════════════════════════════════════════════
    SELECT EXISTS(
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'global' 
            AND table_name = 'store_group_view'
    ) INTO _has_store_group_view;
    
    -- ═══════════════════════════════════════════════════════════════════════════
    -- DEFAULT FILTERS: Append mandatory filters
    -- ═══════════════════════════════════════════════════════════════════════════
    $2 := $2 || ('{"is_deleted":[{"type":"custom","operator":"=","values":false}]}'::jsonb);
    $3 := $3 || ('{"active":[{"type":"custom","operator":"=","values":true}]}'::jsonb);
    
    -- ═══════════════════════════════════════════════════════════════════════════
    -- BUILD STORE GROUPS FILTER QUERY
    -- ═══════════════════════════════════════════════════════════════════════════
    _query_sg := global.form_main_table_filters('store_groups', $2);
    
    IF _has_store_group_view THEN
        _sg_where_clause := ' where sg_code in (select sg_code from "global".store_group_view ' || _query_sg || ')';
        _query_sg := '';
    ELSE
        _sg_where_clause := _query_sg;
    END IF;
    
    -- ═══════════════════════════════════════════════════════════════════════════
    -- COUNT FILTERS
    -- ═══════════════════════════════════════════════════════════════════════════
    SELECT count(*) INTO _main_filter_cnt FROM jsonb_each_text($3);
    SELECT count(*) INTO _attr_filter_cnt FROM jsonb_each_text($4);
    SELECT count(*) INTO _main_product_filter_cnt FROM jsonb_each_text($5);
    SELECT count(*) INTO _attr_product_filter_cnt FROM jsonb_each_text($6);
    
    _query_table_filters := global.form_table_query($7);
    
    -- ═══════════════════════════════════════════════════════════════════════════
    -- BUILD PRODUCT FILTER QUERY WITH PSA OPTIMIZATION
    -- PSA (Product Store Attributes): Pre-aggregated table for faster queries
    -- ═══════════════════════════════════════════════════════════════════════════
    
    -- Case 1: Only product attribute filters
    IF _main_product_filter_cnt = 0 AND _attr_product_filter_cnt != 0 THEN
        
        -- PSA optimization: Query pre-aggregated product_store_attributes table
        IF _psa_flag = true THEN
            _query_pa := global.form_attribute_table_filters_v2('product_store_attributes', 'store_code', $6);
            _product_filter_con := 
                'select x.psa_code psa_code, x.psa_name psa_name 
                 from (' || _query_pa || ') x 
                 group by (x.psa_code, x.psa_name)';
        
        -- Standard path: Query product_attributes and join with mapping
        ELSE
            _query_pa := global.form_attribute_table_filters_v2('product_attributes', 'product_code', $6);
            _product_filter_con := 
                'select distinct y.store_code store_code 
                 from ((' || _query_pa || ') x
                     join (select product_code, store_code 
                           from global.product_Store_mapping ' || _validaity_where_clause || ') y
                     on x.product_code = y.product_code)';
        END IF;
    
    -- Case 2: Only main product filters (PSA not applicable)
    ELSIF _main_product_filter_cnt != 0 AND _attr_product_filter_cnt = 0 THEN
        _query_pm := global.form_main_table_filters('product_master', $5);
        _product_filter_con := 
            'select distinct y.store_code store_code 
             from ((select product_code from global.product_master' || _query_pm || ') x
                 join (select product_code, store_code 
                       from global.product_Store_mapping ' || _validaity_where_clause || ') y
                 on x.product_code = y.product_code)';
    
    -- Case 3: Both main and attribute product filters (PSA not applicable)
    ELSIF _main_product_filter_cnt != 0 AND _attr_product_filter_cnt != 0 THEN
        _query_pa := global.form_attribute_table_filters_v2('product_attributes', 'product_code', $6);
        _query_pm := global.form_main_table_filters('product_master', $5);
        _product_filter_con := 
            'select distinct y.store_code store_code 
             from ((select product_code from global.product_master' || _query_pm || ') x
                 join (' || _query_pa || ') z on x.product_code = z.product_code
                 join (select product_code, store_code 
                       from global.product_Store_mapping ' || _validaity_where_clause || ') y
                 on x.product_code = y.product_code)';
    END IF;
    
    -- ═══════════════════════════════════════════════════════════════════════════
    -- BUILD STORE FILTER QUERY WITH PSA AGGREGATION
    -- ═══════════════════════════════════════════════════════════════════════════
    
    -- Case 1: Store attribute filters or PSA mode
    IF (_main_filter_cnt = 0 AND _attr_filter_cnt != 0) OR _psa_flag = true THEN
        _query_sa := global.form_attribute_table_filters_v2('store_attributes', 'store_code', $4);
        
        IF length(_product_filter_con) > 1 THEN
            
            -- PSA aggregation: Use aggregated_store_groups_mapping for performance
            IF _psa_flag = true THEN
                _filter_con := 
                    'JOIN (SELECT asgm.sg_code sg_code, 
                                  sum(asgm.store_count) store_count, 
                                  count(distinct y.psa_name) as psa_name_count, 
                                  count(distinct asgm.sg_code) sg_count 
                           from (' || _product_filter_con || ') y
                           JOIN "global".aggregated_store_groups_mapping asgm 
                               ON y.psa_code = asgm.psa_code 
                           group by asgm.sg_code) f ON sg.sg_code = f.sg_code ';
            
            -- Standard path
            ELSE
                _filter_con := 
                    ' JOIN (SELECT sgm.sg_code 
                                FROM (' || _query_sa || ') x 
                                JOIN (' || _product_filter_con || ') y on x.store_code = y.store_code
                                JOIN "global".store_groups_mapping sgm ON x.store_code = sgm.store_code 
                                group by sgm.sg_code) f ON sg.sg_code = f.sg_code ';
            END IF;
        
        ELSIF length(_product_filter_con) = 0 THEN
            _filter_con := 
                ' JOIN (SELECT sgm.sg_code 
                             FROM (' || _query_sa || ') x 
                             JOIN "global".store_groups_mapping sgm ON x.store_code = sgm.store_code 
                             group by sgm.sg_code) f ON sg.sg_code = f.sg_code ';
        END IF;
    
    -- Case 2: Only main store filters
    ELSIF _main_filter_cnt != 0 AND _attr_filter_cnt = 0 THEN
        _query_sm := 'SELECT * FROM global.store_master' || (global.form_main_table_filters('store_master', $3));
        
        IF length(_product_filter_con) > 1 THEN
            _filter_con := 
                ' JOIN (SELECT sgm.sg_code 
                             FROM (' || _query_sm || ') x 
                             JOIN (' || _product_filter_con || ') y on x.store_code = y.store_code
                             JOIN "global".store_groups_mapping sgm ON x.store_code = sgm.store_code 
                             group by sgm.sg_code) f ON sg.sg_code = f.sg_code ';
        
        ELSIF length(_product_filter_con) = 0 THEN
            _filter_con := 
                ' JOIN (SELECT sgm.sg_code 
                             FROM (' || _query_sm || ') x 
                             JOIN "global".store_groups_mapping sgm ON x.store_code = sgm.store_code 
                             group by sgm.sg_code) f ON sg.sg_code = f.sg_code ';
        END IF;
    
    -- Case 3: Both main and attribute store filters
    ELSIF _main_filter_cnt != 0 AND _attr_filter_cnt != 0 THEN
        _query_sm := 'SELECT * FROM global.store_master' || (global.form_main_table_filters('store_master', $3));
        _query_sa := global.form_attribute_table_filters_v2('store_attributes', 'store_code', $4);
        
        IF length(_product_filter_con) > 1 THEN
            _filter_con := 
                ' JOIN (SELECT sgm.sg_code 
                             FROM (' || _query_sm || ') x 
                             JOIN (' || _query_sa || ') y on x.store_code = y.store_code 
                             join (' || _product_filter_con || ') z on x.store_code = z.store_code 
                             join "global".store_groups_mapping sgm on x.store_code = sgm.store_code 
                             group by sgm.sg_code) f ON sg.sg_code = f.sg_code ';
        
        ELSIF length(_product_filter_con) = 0 THEN
            _filter_con := 
                ' JOIN (SELECT sgm.sg_code 
                             FROM (' || _query_sm || ') x 
                             JOIN (' || _query_sa || ') y on x.store_code = y.store_code 
                             join "global".store_groups_mapping sgm ON x.store_code = sgm.store_code 
                             group by sgm.sg_code) f ON sg.sg_code = f.sg_code ';
        END IF;
    END IF;
    
    -- ═══════════════════════════════════════════════════════════════════════════
    -- BUILD FINAL QUERY USING HELPER FUNCTION
    -- ═══════════════════════════════════════════════════════════════════════════
    _query_combine := global.build_store_product_groups_list_final_query(
        _sg_where_clause,
        _filter_con,
        _query_table_filters,
        _psa_flag
    );
    
	raise notice '%',_query_combine;
    -- Open cursor with the built query
    OPEN $1 FOR EXECUTE _query_combine;
    
    -- Return query string or cursor based on flag
    IF _return_query = true THEN
        RETURN _query_combine;
    ELSE
        RETURN $1;
    END IF;
END
$function$;

-- =====================================================================================================================
-- Function Overload 3: Store product groups list with is_uploaded flag (7 parameters)
-- Returns: Table with store group details including is_uploaded column from extra JSON
-- Uses INNER JOIN for filtering to show only matching groups
-- Uses store_group_view for optimized filtering when available
-- =====================================================================================================================

DROP FUNCTION IF EXISTS global.store_product_groups_list(input jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, boolean);
CREATE OR REPLACE FUNCTION global.store_product_groups_list(
    input jsonb,
    jsonb,
    jsonb,
    jsonb,
    jsonb,
    jsonb,
    boolean
)
RETURNS TABLE(
    sg_code integer,
    name varchar,
    special_classification varchar,
    created_at timestamptz,
    updated_at timestamptz,
    created_by varchar,
    updated_by varchar,
    store_count bigint,
    sg_count bigint,
    channel varchar,
    is_uploaded varchar
)
LANGUAGE plpgsql AS
$function$
DECLARE
    -- Intermediate query fragments for different filter types
    _query_sm                text := '';
    _query_sa                text := '';
    _query_pm                text := '';
    _query_pa                text := '';
    _query_sg                text := '';
    _query_table_filters     text := '';
    _query_combine           text := '';
    _product_filter_con      text := '';
    _filter_con              text := '';

    -- Static where clause used when joining product_store_mapping (validity filter)
    _validaity_where_clause  text := 'where validity is not null ';

    -- Counters to detect presence of filters in each category
    _main_filter_cnt         int := 0;
    _attr_filter_cnt         int := 0;
    _main_product_filter_cnt int := 0;
    _attr_product_filter_cnt int := 0;

    -- Flag and clause for optional use of store_group_view
    _has_store_group_view    boolean := false;
    _sg_where_clause         text := '';
BEGIN
    -- Check if store_group_view exists for optimized filtering
    SELECT EXISTS(
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'global'
          AND table_name = 'store_group_view'
    ) INTO _has_store_group_view;

    -- Append default filters to input JSONs (ensures soft-deleted/inactive rows are excluded)
    $1 := $1 || '{"is_deleted":[{"type":"custom","operator":"=","values":false}]}'::jsonb;
    $2 := $2 || '{"active":[{"type":"custom","operator":"=","values":true}]}'::jsonb;

    -- Build store groups filter fragment using shared helper
    _query_sg := global.form_main_table_filters('store_groups', $1);

    -- If store_group_view exists, prefer it for consistent/optimized filtering.
    -- We build a WHERE clause that restricts sg_code to those returned by the view + filters.
    IF _has_store_group_view THEN
        _sg_where_clause := ' WHERE sg.sg_code IN (SELECT sg_code FROM global.store_group_view ' || _query_sg || ')';
        -- Clear _query_sg to avoid double-applying filters later
        _query_sg := '';
    ELSE
        -- If view not present, use the generated filter fragment directly
        _sg_where_clause := _query_sg;
    END IF;

    -- Count filters for each category to decide which filter-building path to take
    SELECT count(*) INTO _main_filter_cnt FROM jsonb_each_text($2);
    SELECT count(*) INTO _attr_filter_cnt FROM jsonb_each_text($3);    -- Note: above line uses an explicit WHERE true to keep the expression simple; it counts attribute filters
    SELECT count(*) INTO _main_product_filter_cnt FROM jsonb_each_text($4);
    SELECT count(*) INTO _attr_product_filter_cnt FROM jsonb_each_text($5);

    -- Build table-level query modifiers (pagination, order, limit) if provided
    _query_table_filters := global.form_table_query($6);

    -- ==========================================================================
    -- Build product filter query based on presence/combination of product filters
    -- The resulting _product_filter_con returns store_code(s) that match product filters
    -- ===========================================================================
    IF _main_product_filter_cnt = 0 AND _attr_product_filter_cnt != 0 THEN
        -- Only attribute-level product filters present
        _query_pa := global.form_attribute_table_filters_v2('product_attributes', 'product_code', $5);

        -- Join attribute-derived product list with product_store_mapping (apply validity)
        _product_filter_con :=
            'select distinct y.store_code from ((' || _query_pa || ') x join (select product_code, store_code from global.product_store_mapping '
            || _validaity_where_clause || ') y on x.product_code = y.product_code)';

    ELSIF _main_product_filter_cnt != 0 AND _attr_product_filter_cnt = 0 THEN
        -- Only main product filters present
        _query_pm := global.form_main_table_filters('product_master', $4);

        _product_filter_con :=
            'select distinct y.store_code from ((select product_code from global.product_master ' || _query_pm || ') x join (select product_code, store_code from global.product_store_mapping '
            || _validaity_where_clause || ') y on x.product_code = y.product_code)';

    ELSIF _main_product_filter_cnt != 0 AND _attr_product_filter_cnt != 0 THEN
        -- Both main and attribute product filters present; intersect them
        _query_pa := global.form_attribute_table_filters_v2('product_attributes', 'product_code', $5);
        _query_pm := global.form_main_table_filters('product_master', $4);

        _product_filter_con :=
            'select distinct y.store_code from ((select product_code from global.product_master ' || _query_pm || ') x join ('
            || _query_pa || ') z on x.product_code = z.product_code join (select product_code, store_code from global.product_store_mapping '
            || _validaity_where_clause || ') y on x.product_code = y.product_code)';
    END IF;

    -- ==========================================================================================================
    -- Build store filter with INNER JOIN to show only matching groups
    -- Two main branches:
    -- 1) Attribute-level store filters present -> use attribute filters
    -- 2) Main store filters present -> use store_master filters
    -- Each branch optionally joins with product filter result to restrict to stores that have matching products
    -- ===========================================================================================================
    IF _attr_filter_cnt != 0 THEN
        -- Attribute-level store filters
        _query_sa := global.form_attribute_table_filters_v2('store_attributes', 'store_code', $3);

        IF length(_product_filter_con) > 1 THEN
            -- Both store attribute filters and product filters exist: join them and map to store groups
            _filter_con :=
                'JOIN (select distinct sgm.sg_code from (' || _query_sa || ') sa join (' || _product_filter_con
                || ') ps on sa.store_code = ps.store_code join global.store_groups_mapping sgm on sa.store_code = sgm.store_code) f ON sg.sg_code = f.sg_code';
        ELSE
            -- Only store attribute filters exist (no product filter)
            _filter_con :=
                'JOIN (select distinct sgm.sg_code from (' || _query_sa || ') sa join global.store_groups_mapping sgm on sa.store_code = sgm.store_code) f ON sg.sg_code = f.sg_code';
        END IF;

    ELSIF _main_filter_cnt != 0 THEN
        -- Main store filters (store_master)
        _query_sm := 'select * from global.store_master ' || global.form_main_table_filters('store_master', $2);

        IF length(_product_filter_con) > 1 THEN
            -- Both main store filters and product filters exist
            _filter_con :=
                'JOIN (select distinct sgm.sg_code from (' || _query_sm || ') sm join (' || _product_filter_con
                || ') ps on sm.store_code = ps.store_code join global.store_groups_mapping sgm on sm.store_code = sgm.store_code) f ON sg.sg_code = f.sg_code';
        ELSE
            -- Only main store filters exist
            _filter_con :=
                'JOIN (select distinct sgm.sg_code from (' || _query_sm || ') sm join global.store_groups_mapping sgm on sm.store_code = sgm.store_code) f ON sg.sg_code = f.sg_code';
        END IF;
    END IF;

    -- ======================================================================
    -- Build final query:
    -- - Select store group fields
    -- - Aggregate store_count and sg_count via store_groups_mapping
    -- - Extract is_uploaded flag from sg.extra JSON (default FALSE)
    -- - Join with user_master to resolve created_by/updated_by names when available
    -- - Apply optional _filter_con (constructed above) and _sg_where_clause (view-based or direct filters)
    -- - Apply table-level modifiers (pagination, ordering) from _query_table_filters
    -- =======================================================================
    _query_combine :=
        'select ' ||
            'sg.sg_code, ' ||
            'sg.name, ' ||
            'sg.special_classification, ' ||
            'sg.created_at, ' ||
            'sg.updated_at, ' ||
            'COALESCE(um.name, sg.created_by::varchar) as created_by, ' ||
            'COALESCE(umup.name, sg.updated_by::varchar) as updated_by, ' ||
            'count(distinct sgm.store_code) as store_count, ' ||
            'count(distinct sgm.ref_sg_code) as sg_count, ' ||
            'sg.channel, ' ||
            -- Extract is_uploaded from JSON extra; default to 'FALSE' when absent
            'coalesce(sg.extra->>''is_uploaded'', ''FALSE'') as is_uploaded ' ||
        'from global.store_groups sg ' ||
        -- _filter_con may be empty if no store filters were provided
        COALESCE(_filter_con, '') || ' ' ||
        -- Always join mapping and store_master to compute counts and ensure active stores
        'join global.store_groups_mapping sgm on sg.sg_code = sgm.sg_code ' ||
        'join global.store_master sm on sgm.store_code = sm.store_code and sm.active ' ||
        -- Left joins to resolve user names; only non-deleted users considered
        'left join global.user_master um on sg.created_by = um.user_code and um.is_deleted = false ' ||
        'left join global.user_master umup on sg.updated_by = umup.user_code and umup.is_deleted = false ' ||
        -- Apply store_group_view-based where clause or direct store_groups filters
        _sg_where_clause || ' ' ||
        -- Grouping required for aggregates and COALESCE columns
        'group by sg.sg_code, sg.name, sg.special_classification, sg.created_at, sg.updated_at, um.name, umup.name, sg.channel, sg.extra ' ||
        -- Append any table-level filters (ORDER BY, LIMIT, OFFSET) generated earlier
        _query_table_filters;

    -- Execute the dynamically constructed query and return its result set
	raise notice '%',_query_combine;
    RETURN QUERY EXECUTE _query_combine;
END;
$function$;