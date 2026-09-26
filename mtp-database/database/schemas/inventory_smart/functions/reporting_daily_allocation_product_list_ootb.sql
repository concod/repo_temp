--liquibase formatted sql
--changeset shreeraksha.n:reporting_daily_allocation_product_list_ootb runOnChange:true stripComments:false splitStatements:false context:MTP-134466 labels:MTP-134466
--comment:  MTP-13446 handled dc_code column for the po allocations case
--rollback: SELECT 1

-- Drop old function signatures to handle parameter changes
DROP FUNCTION IF EXISTS inventory_smart.reporting_daily_allocation_product_list_ootb(
    input refcursor,
    product_filters jsonb,
    store_filters jsonb,
    table_filters jsonb,
    _current_date character varying,
    extra_product_attributes jsonb
);
DROP FUNCTION IF EXISTS inventory_smart.reporting_daily_allocation_product_list_ootb(
    input refcursor,
    product_filters jsonb,
    store_filters jsonb,
    table_filters jsonb,
    _current_date character varying,
    extra_product_attributes jsonb,
    is_size_level boolean
);
DROP FUNCTION IF EXISTS inventory_smart.reporting_daily_allocation_product_list_ootb(
    input refcursor,
    product_filters jsonb,
    store_filters jsonb,
    table_filters jsonb,
    _current_date character varying,
    extra_product_attributes jsonb,
    is_size_level boolean,
    include_reserved_units boolean
);

CREATE OR REPLACE FUNCTION inventory_smart.reporting_daily_allocation_product_list_ootb(
    input refcursor,
    product_filters jsonb,
    store_filters jsonb,
    table_filters jsonb,
    _current_date character varying,
    extra_product_attributes jsonb DEFAULT '[]'::jsonb,
    is_size_level boolean DEFAULT false,
    include_reserved_units boolean DEFAULT false
) RETURNS refcursor
LANGUAGE plpgsql
AS $function$
DECLARE
    timezone TEXT;
    _query_pm TEXT := '';
    _pm_filter TEXT := '';
    _query_combine TEXT := '';
    _query_pa TEXT := '';
    _query_sa TEXT := '';
    _query_table_filters TEXT := '';
    _extra_product_attributes_select TEXT := '';
    _extra_product_attributes_select_prefixed TEXT := '';
    v_gen_random_uuid text := gen_random_uuid()::varchar;

    -- ═══════════════════════════════════════════════════════════════════════════
    -- SIZE LEVEL CONFIGURATION VARIABLES
    -- ═══════════════════════════════════════════════════════════════════════════
    -- allocations_aggregated CTE
    _cte_allocations_aggregated TEXT;
    
    -- Size column: used in flat_allocation, eaches_and_packs, and allocations_aggregates_segregated
    _size_col TEXT;           -- adds size column to SELECT (aliased from retail_size_cd)
    _size_col_ref TEXT;       -- references size column with table prefix (fa.size)
    _size_join TEXT;          -- adds size condition to JOIN
    _size_group TEXT;         -- adds size to GROUP BY
    
    -- allocations_aggregates_segregated CTE
    _seg_size_group TEXT;
    
    -- Final SELECT
    _final_size_select TEXT;
    _final_key_expr TEXT;
    _final_join_size_condition TEXT;
    _final_reserve_join_size_condition TEXT;

    -- Tapestry/size-level fix: join product_details at correct grain
    _product_details_size_select TEXT := '';
    _product_details_join_clause TEXT := '';
    _product_details_join_clause_aa TEXT := '';
    _product_details_join_clause_alloc TEXT := '';

    -- ═══════════════════════════════════════════════════════════════════════════
    -- RESERVED UNITS CONFIGURATION VARIABLES
    -- ═══════════════════════════════════════════════════════════════════════════
    _cte_reserved_units TEXT := '';
    _reserved_join TEXT := '';
    _reserved_select TEXT := '';
    _reserve_size_col TEXT := '';
    _reserve_size_group TEXT := '';
    _reserve_size_join TEXT := '';
    

BEGIN

    -- Query to get the timezone from tenant_attribute_master table
    SELECT attribute_value::json->'value'->>'time_zone'
    INTO timezone
    FROM global.tenant_attribute_master
    WHERE name = 'tenant_time_config'
    LIMIT 1;

    IF _current_date IS NOT NULL AND _current_date != '' THEN
        _pm_filter := format('WHERE (created_at AT TIME ZONE %L)::date = %L::date AND status = 3 AND is_deleted = false', timezone, _current_date);
    ELSE
        _pm_filter := format('WHERE status = 3 AND is_deleted = false and (created_at::timestamptz AT TIME ZONE %L)::date = (now() at time zone %L)::date', timezone, timezone);
    END IF;

    _query_pa := global.form_main_table_filters('product_attributes_filter', product_filters);
    _query_sa := global.form_main_table_filters('store_attributes_filter', store_filters);
    _query_table_filters := global.form_table_query(table_filters);

    IF _query_pa = '' THEN
        _query_pa := 'WHERE paf.active = true';
    ELSE
        _query_pa := _query_pa || ' AND paf.active = true';
    END IF;
    IF _query_sa = '' THEN
        _query_sa := 'WHERE TRUE';
    END IF;
    
    RAISE NOTICE 'Product filter table --> %', _query_pa;
    RAISE NOTICE 'Store filter table --> %', _query_sa;
    RAISE NOTICE 'Query filter table --> %', _query_table_filters;
    
    -- Build dynamic SELECT clause for extra product attributes
    IF extra_product_attributes IS NOT NULL AND jsonb_array_length(extra_product_attributes) > 0 THEN
        SELECT string_agg(quote_ident(value::text), ', ')
        INTO _extra_product_attributes_select
        FROM jsonb_array_elements_text(extra_product_attributes);
        
        SELECT string_agg('paf.' || quote_ident(value::text), ', ')
        INTO _extra_product_attributes_select_prefixed
        FROM jsonb_array_elements_text(extra_product_attributes);
        
        IF _extra_product_attributes_select IS NOT NULL THEN
            _extra_product_attributes_select := ', ' || _extra_product_attributes_select;
            _extra_product_attributes_select_prefixed := ', ' || _extra_product_attributes_select_prefixed;
        END IF;
    ELSE
        _extra_product_attributes_select := '';
        _extra_product_attributes_select_prefixed := '';
    END IF;

    -- ═══════════════════════════════════════════════════════════════════════════
    -- SIZE LEVEL CONFIGURATION BLOCK
    -- All conditional logic for size-level vs article-level aggregation
    -- ═══════════════════════════════════════════════════════════════════════════
    IF is_size_level THEN
        -- SIZE LEVEL: Aggregate at (allocation_code, article, size) level
        
        -- Add product_code to extra product attributes for size level
        IF _extra_product_attributes_select = '' THEN
            _extra_product_attributes_select := ', product_code';
        ELSE
            _extra_product_attributes_select := _extra_product_attributes_select || ', product_code';
        END IF;
        
        -- Size column configuration (retail_size_cd aliased as 'size' throughout)
        _size_col := ', retail_size_cd AS size';   -- SELECT clause: alias retail_size_cd as size
        _size_col_ref := ', fa.size';              -- SELECT clause: reference with table prefix (for eaches_and_packs)
        _size_join := ' AND dpc.size = fa.size';   -- JOIN clause: match on size
        _size_group := ', size';                   -- GROUP BY clause: include size
        
        -- allocations_aggregates_segregated: positional GROUP BY for outer query
        _seg_size_group := ', 3, 4';
        
        -- Final SELECT: Include size column
        _final_size_select := ', aa.size';
        _final_key_expr := 'CONCAT(aa.article, ''-'', aa.size, ''-'', aa.allocation_code, ''-'', ata.dc_code)';
        _final_join_size_condition := ' AND ata.size = aa.size';
        _final_reserve_join_size_condition := '';
        
        -- Ensure product_details is unique per (article,size) to prevent join-multiplication
        _product_details_size_select := ', paf.size';
        _product_details_join_clause := 'JOIN product_details pd ON pd.article = carfg.article AND pd.size = carfg.retail_size_cd';
        _product_details_join_clause_aa := 'JOIN product_details pd ON pd.article = aa.article AND pd.size = aa.size';
        _product_details_join_clause_alloc := 'INNER JOIN product_details paf ON paf.article = b.article AND paf.size = b.retail_size_cd';
        
        -- Size-level reserved units variables
        _reserve_size_col := '';
        _reserve_size_group := '';
        _reserve_size_join := '';
        
        -- Build size-level allocations_aggregated CTE (single level - no nested subquery)
        _cte_allocations_aggregated := '
        , allocations_aggregated AS -- (allocation_code, article, size)
        (
            SELECT  b.allocation_code
                ,b.article
                ,b.inventory_source
                ,b.retail_size_cd AS size
                ,SUM(b.wos_units_allocated) AS wos_units_allocation
                ,SUM(b.min_units_allocated) AS min_units_allocation
                ,SUM(b.oh) AS oh_total
                ,SUM(b.oo) AS oo_total
                ,SUM(b.it) AS it_total
            FROM allocations_calc_base b
            ' || _product_details_join_clause_alloc || '
            GROUP BY 1, 2, 3, 4
        )';
        
    ELSE
        -- ARTICLE LEVEL: Aggregate at (allocation_code, article) level (current behavior)
        
        -- Size column configuration: empty for article level
        _size_col := '';
        _size_col_ref := '';
        _size_join := '';
        _size_group := '';
        
        -- allocations_aggregates_segregated: No size grouping
        _seg_size_group := ', 3';
        
        -- Final SELECT: No size column
        _final_size_select := '';
        _final_key_expr := 'CONCAT(aa.article, ''-'', aa.allocation_code)';
        _final_join_size_condition := '';
        _final_reserve_join_size_condition := '';
        
        _product_details_size_select := '';
        _product_details_join_clause := 'JOIN product_details pd ON pd.article = carfg.article';
        _product_details_join_clause_aa := 'JOIN product_details pd ON pd.article = aa.article';
        _product_details_join_clause_alloc := 'INNER JOIN product_details paf USING (article)';
        
        -- Article-level reserved units variables (no size)
        _reserve_size_col := '';
        _reserve_size_group := '';
        _reserve_size_join := '';
        
        _cte_allocations_aggregated := '
        , allocations_aggregated AS -- (allocation_code, article)
        (
            SELECT  article
                ,allocation_code
                ,inventory_source
                ,SUM(wos_units_allocation) AS wos_units_allocation
                ,SUM(min_units_allocation) AS min_units_allocation
                ,SUM(oh) AS oh_total
                ,SUM(oo) AS oo_total
                ,SUM(it) AS it_total
            FROM
            (
                -- Inner: aggregate per (allocation_code, article, size) with AVG(inv_avai)
                SELECT  allocation_code
                    ,article
                    ,retail_size_cd
                    ,inventory_source
                    ,SUM(wos_units_allocated) AS wos_units_allocation
                    ,SUM(min_units_allocated) AS min_units_allocation
                    ,SUM(oh) AS oh
                    ,SUM(oo) AS oo
                    ,SUM(it) AS it
                FROM allocations_calc_base b
                ' || _product_details_join_clause_alloc || '
                GROUP BY 1, 2, 3, 4
            ) a
            GROUP BY 1, 2, 3
        )';
    END IF;

    -- ═══════════════════════════════════════════════════════════════════════════
    -- RESERVED UNITS CONFIGURATION BLOCK
    -- Simplified implementation using only sku_dc_reserved_units
    -- ═══════════════════════════════════════════════════════════════════════════
    IF include_reserved_units THEN
        _cte_reserved_units := '
        , reserved_units_aggregated AS
        (
            SELECT 
                article
                ' || _reserve_size_group || '
                , SUM(reserve_quantity) AS total_reserve_quantity
            FROM (
                -- Source 1: sku_dc_reserved_units (current/active reserves)
                SELECT 
                    sdru.article
                    ' || _reserve_size_col || '
                    , SUM(COALESCE(sdru.quantity, 0)) AS reserve_quantity
                FROM inventory_smart.sku_dc_reserved_units sdru
                GROUP BY sdru.article' || _reserve_size_group || '
                
                UNION ALL
                
                -- Source 2: dc_pack_reserve_quantity_derived_table (historical reserves)
                -- Used for date-specific reserved quantities
                SELECT 
                    dprqd.article
                    ' || _reserve_size_col || '
                    , SUM(COALESCE(dprqd.reserve_quantity, 0)) AS reserve_quantity
                FROM inventory_smart.dc_pack_reserve_quantity_derived_table dprqd
                WHERE (dprqd.date AT TIME ZONE ' || quote_literal(timezone) || ')::date = (' || quote_literal(_current_date) || ')::date
                GROUP BY dprqd.article' || _reserve_size_group || '
            ) combined_reserves
            GROUP BY article' || _reserve_size_group || '
        )';
        
        _reserved_join := '
        LEFT JOIN reserved_units_aggregated ru 
            ON ru.article = aa.article' || _final_reserve_join_size_condition;
        
        -- Configure the SELECT for reserve_quantity
        _reserved_select := 'COALESCE(ru.total_reserve_quantity, 0)';
        
        RAISE NOTICE 'Reserved units feature ENABLED';
    ELSE
        _cte_reserved_units := '';
        _reserved_join := '';
        _reserved_select := '0';
        
        RAISE NOTICE 'Reserved units feature DISABLED';
    END IF;

    -- ═══════════════════════════════════════════════════════════════════════════
    -- BUILD FINAL QUERY
    -- ═══════════════════════════════════════════════════════════════════════════
    _query_combine := '
        WITH plan_master AS  -- (plan_code)
        (
            SELECT DISTINCT plan_code, name
            FROM inventory_smart.plan_master
            WHERE (created_at AT TIME ZONE ' || quote_literal(timezone) || ')::date = (' || quote_literal(_current_date) || ')::date
            AND status = 3
            AND is_deleted = false 
        )
        -- SELECT * FROM plan_master;
        , product_details AS -- (article)
        (
            SELECT DISTINCT paf.article 
                ' || _product_details_size_select || '
                ' || _extra_product_attributes_select || '
            FROM global.product_attributes_filter paf 
            ' || _query_pa || '
        )
        -- SELECT * FROM product_details;
        , allocations_calc_base AS MATERIALIZED -- (allocation_code, article, size, store)
        (
            SELECT  carfg.allocation_code
                ,carfg.article
                ,carfg.inventory_source
                ,carfg.retail_size_cd
                ,carfg.store
                ,carfg.pack_dc_allocation
                ,LEAST(COALESCE(carfg.allocated_total,0)::int,GREATEST(0,COALESCE(carfg.min,0)::int - COALESCE(carfg.updated_oh_oo_it,0)::int))                               AS min_units_allocated
                ,COALESCE(carfg.allocated_total,0) - LEAST(COALESCE(carfg.allocated_total,0)::int,GREATEST(0,COALESCE(carfg.min,0)::int - COALESCE(carfg.updated_oh_oo_it,0)::int)) AS wos_units_allocated
                ,carfg.oh
                ,carfg.oo
                ,carfg.it
            FROM inventory_smart.create_allocation_result_flat_gurobi carfg
            ' || _product_details_join_clause || '
            WHERE carfg.created_at >= (' || quote_literal(_current_date) || '::date - INTERVAL ''1 day'')
            AND carfg.created_at <= (' || quote_literal(_current_date) || '::date + INTERVAL ''1 day'')
            AND carfg.allocation_code IN ( SELECT plan_code FROM plan_master) 
        )
        -- SELECT * FROM allocations_calc_base;
        ' || _cte_allocations_aggregated || '
        , flat_allocation AS -- (allocation_code, article, store, dc_code, pack_type_id, size?)
        (
            SELECT  allocation_code
                ,article
                ,store
                ,js.key AS dc_code
                ,UNNEST((TRANSLATE((js.value::jsonb->>''packs_allocated'')::text,''[]'',''{}''))::text[]) AS pack_type_id
                ,UNNEST((TRANSLATE((js.value::jsonb->>''packs_allocated_qty'')::text,''[]'',''{}''))::numeric[]) AS packs_allocated_qty
                ,UNNEST((TRANSLATE((js.value::jsonb->>''packs_available_qty'')::text,''[]'',''{}''))::numeric[]) AS packs_available_qty
                ' || _size_col || ' -- if is_size_level: , retail_size_cd AS size else: blank
            FROM allocations_calc_base, jsonb_each(allocations_calc_base.pack_dc_allocation) AS js
            GROUP BY 1, 2, 3, 4, 5, 6, 7' || _size_group || ' -- if is_size_level: , size else: blank
        )
        , eaches_and_packs AS -- (allocation_code, article, store, dc_code, pack_type_id, pack_type, size?)
        (
            SELECT  fa.allocation_code
                ,fa.article
                ,fa.store
                ,fa.dc_code
                ,fa.pack_type_id
                ,CASE WHEN dpc.units_in_pack IS NULL THEN ''eaches'' ELSE ''packs'' END AS pack_type
                ,packs_available_qty * COALESCE(dpc.units_in_pack,1)                    AS available_qty
                ,packs_allocated_qty * COALESCE(dpc.units_in_pack,1)                    AS allocated_qty
                ' || _size_col_ref || ' -- if is_size_level: , fa.size else: blank
            FROM flat_allocation fa
            LEFT JOIN inventory_smart.dc_pack_configuration dpc 
                ON fa.article = dpc.article 
                AND fa.pack_type_id = dpc.pack_type_id' || _size_join || ' -- if is_size_level: AND dpc.size = fa.size else: blank
        )
        , allocations_aggregates_segregated AS MATERIALIZED -- (allocation_code, article, size?)
        (
            SELECT  allocation_code
                ,article
                ' || _size_group || ' -- if is_size_level: , size else: blank
                ,dc_code
                ,SUM(ata_eaches)       AS ata_eaches
                ,SUM(ata_packs)        AS ata_packs
                ,SUM(allocated_eaches) AS allocated_eaches
                ,SUM(allocated_packs)  AS allocated_packs
            FROM 
            (
                SELECT  allocation_code
                    ,article
                    ' || _size_group || ' -- if is_size_level: , size else: blank
                    ,dc_code
                    ,pack_type
                    ,CASE WHEN pack_type = ''eaches'' THEN available_qty ELSE 0 END AS ata_eaches
                    ,CASE WHEN pack_type = ''packs'' THEN available_qty ELSE 0 END  AS ata_packs
                    ,CASE WHEN pack_type = ''eaches'' THEN allocated_qty ELSE 0 END AS allocated_eaches
                    ,CASE WHEN pack_type = ''packs'' THEN allocated_qty ELSE 0 END  AS allocated_packs
                FROM 
                (  
                    SELECT  allocation_code
                        ,article
                        ' || _size_group || ' -- if is_size_level: , size else: blank
                        ,dc_code
                        ,pack_type
                        ,pack_type_id
                        ,MAX(available_qty) AS available_qty
                        ,SUM(allocated_qty) AS allocated_qty
                    FROM eaches_and_packs
                    GROUP BY allocation_code, article' || _size_group || ', dc_code, pack_type, pack_type_id -- if is_size_level: , size else: blank
                ) x
            ) y
            GROUP BY 1, 2' || _seg_size_group || ', dc_code -- if is_size_level: , 3 else: blank
        )
        ' || _cte_reserved_units || '
        SELECT  aa.allocation_code
            ,pm.name                                                              AS allocated_plan_name
            ,aa.article 
            ' || _final_size_select || ' -- if is_size_level: , aa.size else: blank
            ,CASE WHEN UPPER(TRIM(COALESCE(aa.inventory_source, ''''))) = ''PO'' THEN ata.dc_code ELSE dc.linked_store_code END AS dc_code
            ,ata.dc_code                                                          AS carfg_dc_code
            ' || _extra_product_attributes_select || '
            ,' || _reserved_select || '                                           AS reserve_quantity
            ,COALESCE(aa.min_units_allocation,0)                                  AS min_units_allocation
            ,COALESCE(aa.wos_units_allocation,0)                                  AS wos_units_allocation
            ,COALESCE(ata.allocated_eaches + ata.allocated_packs, 0)              AS total_units_allocated
            ,COALESCE(ata.ata_eaches,0)                                           AS ata_eaches
            ,COALESCE(ata.ata_packs,0)                                            AS ata_packs
            ,ata.ata_eaches + ata.ata_packs                                       AS inv_avai
            ,GREATEST((ata.ata_eaches + ata.ata_packs) - (ata.allocated_eaches + ata.allocated_packs) - ' || _reserved_select || ', 0) AS remaining_available_to_allocate
            ,COALESCE(aa.oh_total, 0)                                             AS oh_total
            ,COALESCE(aa.oo_total, 0)                                             AS oo_total
            ,COALESCE(aa.it_total, 0)                                             AS it_total
            ,0                                                                    AS store_in_stock
            ,0                                                                    AS store_in_stock_ata
            ,' || _final_key_expr || '                                            AS key -- if is_size_level: article-size-allocation_code else: article-allocation_code
        FROM allocations_aggregated aa
        ' || _product_details_join_clause_aa || '
        JOIN plan_master pm ON pm.plan_code = aa.allocation_code
        JOIN allocations_aggregates_segregated ata 
            ON ata.article = aa.article  
            AND ata.allocation_code = aa.allocation_code' || _final_join_size_condition || ' -- if is_size_level: AND ata.size = aa.size else: blank
            ' || _reserved_join || '
        LEFT JOIN global.distribution_centres dc 
            ON ata.dc_code = dc.dc_code::varchar' ;
    
    RAISE NOTICE 'query combine --> %', _query_combine;
    PERFORM global.sp_log(null, 'inventory_smart.reporting_daily_allocation_product_list_ootb', 'Before Execute', _query_combine, jsonb_build_object('product_filters', $2, 'store_filters', $3, 'table_filters', $4, '_current_date', $5, 'extra_product_attributes', $6, 'is_size_level', $7, 'include_reserved_units', $8));
    
    OPEN input FOR EXECUTE _query_combine;
    PERFORM global.sp_log(v_gen_random_uuid, 'inventory_smart.reporting_daily_allocation_product_list_ootb', 'After Execute', _query_combine, jsonb_build_object('product_filters', $2, 'store_filters', $3, 'table_filters', $4, '_current_date', $5, 'extra_product_attributes', $6, 'is_size_level', $7, 'include_reserved_units', $8));
    RETURN input;
END
$function$;
