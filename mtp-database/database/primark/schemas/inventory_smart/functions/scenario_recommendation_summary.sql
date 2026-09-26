--liquibase formatted sql
--changeset liquibase:scenario_recommendation_summary_timezone_carfg_filter runOnChange:true stripComments:false splitStatements:false context:SCENARIO-SUMMARY labels:SCENARIO-SUMMARY
--comment: Enhanced scenario recommendation summary with multi-allocation type support (normal/PO/new store), improved article-store filtering, and allocation category-aware comparisons
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.scenario_recommendation_summary(text);
CREATE OR REPLACE FUNCTION inventory_smart.scenario_recommendation_summary(allocation_code text)
 RETURNS TABLE(
    allocation_category text,
    art_cnt bigint,
    allocated_store_cnt bigint,
    store_cnt bigint,
    dc_code text,
    size text,
    allocated_qty_size numeric,
    allocated_qty_total numeric,
    dc_available_size numeric,
    net_dc_available_size numeric,
    net_dc_available_total numeric,
    avg_min numeric,
    avg_max numeric,
    avg_wos numeric
 )
 LANGUAGE plpgsql
AS $function$
 /* 
  * Function/Procedure name: inventory_smart.scenario_recommendation_summary
  * No of input parameter: 1
  * Parameter Description : $1 = allocation_code (scenario allocation code)
  * Purpose: Compare Original vs Scenario allocation summary with multi-allocation type support
  * 
  * Features:
  * - Supports multiple allocation types: Normal (0,2), PO (4), New Store (5)
  * - Dynamically adapts data sources based on allocation type from plan_master
  * - Article-store filtering ensures accurate scenario vs original comparisons
  * - Allocation category-aware joins for proper data matching
  * - Conditional reserve allocation handling (only for normal allocations)
  * - Type-specific inventory table usage (dc/po/ns available/allocated units)
  * - Proper DC code handling (integer for normal/NS, text for PO)
  * - Distribution center lookup bypass for PO allocations
  * 
  * Data Sources by Type:
  * - Normal (0,2): sku_dc_available_units, sku_dc_allocated_units, sku_dc_reserved_units
  * - PO (4): sku_po_available_units, sku_po_allocated_units (no reserves)
  * - New Store (5): sku_ns_available_units, sku_ns_allocated_units (no reserves)
  * 
  * Dynamic Parameters (used in format string):
  * %1$s - Scenario allocation code (input parameter)
  * %2$s - Original allocation code (extracted from scenario code)
  * %3$s - Current available units query (type-specific: dc/po/ns)
  * %4$s - Reserve allocation CTE (only for normal types 0,2; empty for PO/NS)
  * %5$s - Other allocations query with UNION for both original and scenario
  * %6$s - User reserve quantity expression (SUM for normal; 0 for PO/NS)
  * %7$s - Reserve allocation join clause (only for normal types; empty for PO/NS)
  * %8$s - DC code casting (js.key::text for PO; js.key::int for others)
  * %9$s - Current available join condition (dc_code to po_code for PO; USING for others)
  * %10$s - DC name field (a.dc_code for PO; dd.name for others)
  * %11$s - Distribution centre join (empty for PO; full JOIN for others)
  */
declare
    _query_combine text;
    v_gen_random_uuid text  := gen_random_uuid()::varchar;
    _original_allocation_code text;
    _allocation_type integer;
    _pm_date date;
    _timezone text;
    begin
    
    -- Extract original allocation code by splitting on '_SCENARIO'
    _original_allocation_code := SPLIT_PART($1, '_SCENARIO', 1);
    
    -- Get allocation type from plan_master
    raise notice 'Querying plan_master for allocation_code: %', _original_allocation_code;
    
    SELECT "type"::integer INTO _allocation_type 
    FROM inventory_smart.plan_master 
    WHERE plan_code = _original_allocation_code 
    LIMIT 1;
    
    -- Default to type 0 if not found
    _allocation_type := COALESCE(_allocation_type, 0);
    
    -- fetch timezone from tenant_attribute_master
    SELECT attribute_value::json->>'time_zone' INTO _timezone
    FROM global.tenant_attribute_master
    WHERE name = 'tenant_time_config'
    LIMIT 1;
    _timezone := COALESCE(_timezone, 'America/Chicago');
    raise notice 'timezone: %', _timezone;
    
    -- Current date in tenant timezone for carfg filter (compare created_at at timezone with this date)
    _pm_date := (NOW() AT TIME ZONE _timezone)::date;
    raise notice 'filter date (current date at tenant TZ) for carfg: %', _pm_date;
    
    raise notice 'Retrieved allocation type: % for allocation_code: %', _allocation_type, _original_allocation_code;
    
    _query_combine := format($$
        WITH 
        base_table_temp as (  
            SELECT allocation_code,
            case 
                when allocation_code like '%%SCENARIO%%' then 'scenario'
                else 'original'
            end as allocation_category,
            article,store store_code, pack_dc_allocation, carfs.allocated_total,carfs.retail_size_cd size,
            min, max, wos
            from inventory_smart.create_allocation_result_flat_gurobi carfs
            WHERE 
            date(carfs.created_at AT TIME ZONE %12$s) = %13$s
            and allocation_code in ('%1$s','%2$s')
        )
        ,scenario_article_store AS MATERIALIZED (
            SELECT article, store_code
            FROM base_table_temp 
            WHERE allocation_category = 'scenario' 
            GROUP BY 1,2
        )
        ,base_table as (
        select * from base_table_temp a
        where exists (select 1 from scenario_article_store b where b.article=a.article and b.store_code=a.store_code)
        )
        ,flat_table as (
            SELECT 
                   allocation_category,
                   article,
                   store_code,
                   %8$s dc_code, 
                   size,
                   min,
                   max,
                   wos,
                   UNNEST((TRANSLATE((js.value::jsonb->>'packs_allocated')::text, '[]', '{}'))::text[]) pack_type_id,
                   UNNEST((TRANSLATE((js.value::jsonb->>'packs_allocated_qty')::text, '[]', '{}'))::numeric[]) allocated_qty,
                   UNNEST((TRANSLATE((js.value::jsonb->>'packs_available_qty')::text, '[]', '{}'))::numeric[]) available_qty        
            FROM (
                SELECT * FROM base_table 
            ) foo , JSONB_EACH(pack_dc_allocation) js
        )
        ,packs AS materialized (
            SELECT article,
                   dc_code,
                   store_code,
                   pack_type_id,
                   size,
                   min,
                   max,
                   wos,
                   pack_type,
                   allocated_qty * units_in_pack::double precision AS allocated_qty,
                   available_qty * units_in_pack::double precision AS available_qty,
                   allocation_category
            FROM inventory_smart.dc_pack_configuration dpc
            JOIN flat_table USING (pack_type_id,article,size)
        )
        ,current_available as (
            SELECT  a.dc_code, a.size, SUM(oh) oh
            FROM (
                SELECT  article, size, pack_type_id, dc_code FROM packs GROUP BY 1, 2, 3, 4
            ) a 
            LEFT JOIN (
            %3$s
            ) b
            %9$s
            GROUP BY 1, 2
         )
        %4$s
        ,other_allocations as (
            SELECT allocation_category, dc_code, size, SUM(coalesce(allocated_reserve_qty,0)) as allocated_reserve_qty
            FROM (
                %5$s
            ) a
            GROUP BY 1, 2, 3
        )
        ,fourth_table as (
            SELECT 
                   a.allocation_category,
                   a.dc_code,
                   %10$s as dc_name,
                   a.size,
                   SUM(a.allocated_qty) as allocated_qty,
                   SUM(COALESCE(ca.oh,0)) as dc_available,
                   coalesce(SUM(coalesce(oa.allocated_reserve_qty,0)),0) as allocated_reserve_qty,
                   %6$s as user_reserve_qty
            FROM (
                SELECT size,
                       dc_code,
                       allocation_category,
                       SUM(allocated_qty) as allocated_qty
                FROM packs
                GROUP BY 1, 2, 3
            ) a
            LEFT JOIN current_available ca ON (a.size = ca.size AND a.dc_code = ca.dc_code)
            %7$s
            LEFT JOIN other_allocations oa ON (a.size = oa.size AND a.dc_code = oa.dc_code AND a.allocation_category = oa.allocation_category)
            %11$s
            GROUP BY 1, 2, 3, 4
        )
        ,net_available_count as (
            select allocation_category, dc_code, size,
            coalesce(sum(dc_available),0) as dc_available_size,
            COALESCE(sum(dc_available),0) - COALESCE(sum(allocated_qty),0) - COALESCE(SUM(allocated_reserve_qty),0)  net_dc_available_size
            from fourth_table
            group by 1,2,3
        )
        ,net_available_overall as (
            select allocation_category, dc_code, sum(net_dc_available) net_dc_available
            from (
            select allocation_category, dc_code, size, COALESCE(sum(dc_available),0) - COALESCE(sum(allocated_qty),0) - COALESCE(SUM(allocated_reserve_qty),0)  net_dc_available
            from fourth_table
            group by 1,2,3) z
            group by 1, 2
        )
        ,first_table as (
            SELECT COUNT(DISTINCT article) as art_cnt,
                COUNT(distinct store_code) as store_cnt 
            FROM
                base_table 
        ) 
        ,second_table as (
            SELECT allocation_category, count(DISTINCT store_code) as allocated_store_cnt
            FROM packs
            WHERE allocated_qty > 0
            group by 1
        )
        , other_metrics_fetch as (
        select 
            allocation_category,
            sum(allocated_qty) allocated_qty_total,
            round(avg(min::int),0) avg_min,
            round(avg(max::int),0) avg_max,
            round(avg(wos::int),0) avg_wos
        from packs
        group by 1
        )
        select 
        a.allocation_category,
        f.art_cnt,
        coalesce(e.allocated_store_cnt,0) as allocated_store_cnt,
        f.store_cnt,
        a.dc_code::text as dc_code,
        a.size::text,
        a.allocated_qty::numeric as allocated_qty_size,
        d.allocated_qty_total::numeric,
        b.dc_available_size::numeric,
        b.net_dc_available_size::numeric,
        c.net_dc_available::numeric as net_dc_available_total,
        d.avg_min::numeric,
        d.avg_max::numeric,
        d.avg_wos::numeric
        from fourth_table a
        left join net_available_count b using(allocation_category, dc_code, size)
        left join net_available_overall c using(allocation_category, dc_code)
        left join other_metrics_fetch d using(allocation_category)
        left join second_table e using(allocation_category)
        cross join first_table f
    $$, 
    $1, 
    _original_allocation_code,
    -- Parameter 3: Current available units query based on allocation type
    CASE 
        WHEN _allocation_type = 5 THEN 
            'SELECT * FROM inventory_smart.sku_ns_available_units a where exists (SELECT 1 FROM packs b where b.article=a.article and b.dc_code=a.dc_code)'
        WHEN _allocation_type = 4 THEN 
            'SELECT * FROM inventory_smart.sku_po_available_units a where exists (SELECT 1 FROM packs b where b.article=a.article and b.dc_code=a.po_code)'
        ELSE 
            'SELECT * FROM inventory_smart.sku_dc_available_units a where exists (SELECT 1 FROM packs b where b.article=a.article and b.dc_code=a.dc_code)'
    END,
    -- Parameter 4: Reserve allocation CTE (only for normal allocations)
    CASE 
        WHEN _allocation_type IN (0, 2) THEN 
            ',reserve_allocation as (
            SELECT dc_code, size, SUM(COALESCE(quantity,0)) user_reserve_qty 
            FROM (
                SELECT  dc_code, article, size, pack_type_id FROM packs
                GROUP BY 1, 2, 3, 4
            ) am
            LEFT JOIN (
            SELECT * FROM inventory_smart.sku_dc_reserved_units a where  exists  (SELECT 1 FROM packs b where b.article=a.article and b.dc_code=a.dc_code )
            ) b
            USING (dc_code, article, size, pack_type_id)
            GROUP BY 1, 2
        )'
        ELSE ''
    END,
    -- Parameter 5: Other allocations query based on allocation type (both original and scenario)
    CASE 
        WHEN _allocation_type = 5 THEN 
            'SELECT ''original'' as allocation_category, am.dc_code, am.article, am.pack_type_id, am.size, COALESCE(quantity,0) as allocated_reserve_qty
             FROM (SELECT dc_code, article, pack_type_id, size FROM packs GROUP BY 1, 2, 3, 4) am
             LEFT JOIN (select * from inventory_smart.sku_ns_allocated_units( ''' || _original_allocation_code || ''' )) b 
             USING (dc_code, article, size, pack_type_id)
             UNION ALL
             SELECT ''scenario'' as allocation_category, am.dc_code, am.article, am.pack_type_id, am.size, COALESCE(quantity,0) as allocated_reserve_qty
             FROM (SELECT dc_code, article, pack_type_id, size FROM packs GROUP BY 1, 2, 3, 4) am
             LEFT JOIN (select * from inventory_smart.sku_ns_allocated_units( ''' || $1 || ''' )) b 
             USING (dc_code, article, size, pack_type_id)'
        WHEN _allocation_type = 4 THEN 
            'SELECT ''original'' as allocation_category, am.dc_code, am.article, am.pack_type_id, am.size, COALESCE(quantity,0) as allocated_reserve_qty
             FROM (SELECT dc_code, article, pack_type_id, size FROM packs GROUP BY 1, 2, 3, 4) am
             LEFT JOIN (select * from inventory_smart.sku_po_allocated_units( ''' || _original_allocation_code || ''' )) b 
             ON (am.dc_code = b.dc_code AND am.article = b.article AND am.size = b.size AND am.pack_type_id = b.pack_type_id)
             UNION ALL
             SELECT ''scenario'' as allocation_category, am.dc_code, am.article, am.pack_type_id, am.size, COALESCE(quantity,0) as allocated_reserve_qty
             FROM (SELECT dc_code, article, pack_type_id, size FROM packs GROUP BY 1, 2, 3, 4) am
             LEFT JOIN (select * from inventory_smart.sku_po_allocated_units( ''' || $1 || ''' )) b 
             ON (am.dc_code = b.dc_code AND am.article = b.article AND am.size = b.size AND am.pack_type_id = b.pack_type_id)'
        ELSE 
            'SELECT ''original'' as allocation_category, am.dc_code, am.article, am.pack_type_id, am.size, COALESCE(quantity,0) as allocated_reserve_qty
             FROM (SELECT dc_code, article, pack_type_id, size FROM packs GROUP BY 1, 2, 3, 4) am
             LEFT JOIN (select * from inventory_smart.sku_dc_allocated_units( ''' || _original_allocation_code || ''' )) b 
             USING (dc_code, article, size, pack_type_id)
             UNION ALL
             SELECT ''scenario'' as allocation_category, am.dc_code, am.article, am.pack_type_id, am.size, COALESCE(quantity,0) as allocated_reserve_qty
             FROM (SELECT dc_code, article, pack_type_id, size FROM packs GROUP BY 1, 2, 3, 4) am
             LEFT JOIN (select * from inventory_smart.sku_dc_allocated_units( ''' || $1 || ''' )) b 
             USING (dc_code, article, size, pack_type_id)'
    END,
    -- Parameter 6: User reserve quantity (0 for PO and NS allocations)
    CASE 
        WHEN _allocation_type IN (0, 2) THEN 'SUM(COALESCE(ra.user_reserve_qty,0))'
        ELSE '0'
    END,
    -- Parameter 7: Reserve allocation join (only for normal allocations)
    CASE 
        WHEN _allocation_type IN (0, 2) THEN 'LEFT JOIN reserve_allocation ra ON (a.size = ra.size AND a.dc_code = ra.dc_code)'
        ELSE ''
    END,
    -- Parameter 8: DC code casting (text for PO, int for others)
    CASE 
        WHEN _allocation_type = 4 THEN 'js.key::text'
        ELSE 'js.key::int'
    END,
    -- Parameter 9: Join condition for current_available (dc_code to po_code for PO)
    CASE 
        WHEN _allocation_type = 4 THEN 'ON (a.dc_code = b.po_code AND a.pack_type_id = b.pack_type_id AND a.article = b.article AND a.size = b.size)'
        ELSE 'USING(dc_code, pack_type_id, article, size)'
    END,
    -- Parameter 10: DC name field (dc_code for PO, dd.name for others)
    CASE 
        WHEN _allocation_type = 4 THEN 'a.dc_code'
        ELSE 'dd.name'
    END,
    -- Parameter 11: Distribution centre join (not needed for PO)
    CASE 
        WHEN _allocation_type = 4 THEN ''
        ELSE 'LEFT JOIN "global".distribution_centres dd ON (a.dc_code = dd.dc_code)'
    END,
    -- Parameter 12 & 13: carfg date filter (timezone + current date in tenant TZ; compare date(created_at AT TIME ZONE tz) = filter_date)
    quote_literal(_timezone),
    quote_literal(_pm_date)
    );
    
    raise notice 'Allocation Type: %, Query: %', _allocation_type, _query_combine;
    perform global.sp_log(v_gen_random_uuid, 'inventory_smart.scenario_recommendation_summary', 'Before returning function value', _query_combine, jsonb_build_object('allocation_code',$1, 'original_allocation_code', _original_allocation_code, 'allocation_type', _allocation_type));		
    
    RETURN QUERY EXECUTE _query_combine;
    end
$function$
; 