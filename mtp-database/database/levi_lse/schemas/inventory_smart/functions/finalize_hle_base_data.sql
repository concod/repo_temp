--liquibase formatted sql
--changeset shekharkrishna.nirnakar:po_allocations_support runOnChange:true stripComments:false splitStatements:false context:MTP-110516 labels:MTP-110516
--comment: MTP-110516 | PO allocations support
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.finalize_hle_base_data(refcursor, character varying);

CREATE OR REPLACE FUNCTION inventory_smart.finalize_hle_base_data(input refcursor, character varying)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$

declare
    _query_combine text;
    _created_at_filter text:='';
    _available_query text:='';
    _allocated_query text:='';
    _pm_date date;
    _tenant_timezone text;
    _inventory_source text;
    _query text;
    v_gen_random_uuid text  := gen_random_uuid()::varchar;
begin
    
    -- Get tenant timezone from tenant_attribute_master first
        SELECT (attribute_value->'value'->>'time_zone')::text
        INTO _tenant_timezone
        FROM global.tenant_attribute_master 
        WHERE name = 'tenant_time_config' 
        AND status = true
        LIMIT 1;
        
        -- Use tenant timezone if available, otherwise default to UTC
        IF _tenant_timezone IS NULL THEN
            _tenant_timezone := 'UTC';
        END IF;
        
        -- Fetch date from plan_master for the allocation code using tenant timezone
        -- Remove 'edit_' prefix if present
        _query := format('SELECT date(created_at AT TIME ZONE %L) FROM inventory_smart.plan_master WHERE plan_code = %L', _tenant_timezone, CASE WHEN $2 LIKE 'edit_%' THEN SUBSTRING($2 FROM 6) ELSE $2 END);
        raise notice 'Executing plan_master query: %', _query;
        execute _query into _pm_date;
        
        -- Check if plan_master date exists, if not use current date in tenant timezone
        IF _pm_date IS NULL THEN
            _pm_date := date(CURRENT_TIMESTAMP AT TIME ZONE _tenant_timezone);
        END IF;
        raise notice 'pm_date: %', _pm_date;
        
        -- Build created_at filter using static date (no interval)
        _created_at_filter := format(' AND date(carfg.created_at AT TIME ZONE %L) = %L', _tenant_timezone, _pm_date);
    
    -- Get the inventory_source for this allocation code
        _query := format('SELECT inventory_source FROM inventory_smart.create_allocation_result_flat_gurobi WHERE date(created_at AT TIME ZONE %L) = %L AND allocation_code = %L LIMIT 1', _tenant_timezone, _pm_date, $2);
        raise notice 'Executing inventory_source query: %', _query;
        execute _query into _inventory_source;
        
        -- If no inventory_source found, default to 'dc'
        IF _inventory_source IS NULL THEN
            _inventory_source := 'dc';
        END IF;
        raise notice 'inventory_source: %', _inventory_source;
        
        -- Build appropriate query based on inventory_source
        raise notice 'Building queries for inventory_source: %', _inventory_source;
        IF _inventory_source = 'dc' THEN
            -- DC allocations - use DC tables
            _available_query := format($$

                ,sku_dc_avai as materialized (
                            SELECT * FROM inventory_smart.sku_dc_available_units WHERE article in (SELECT DISTINCT article FROM pack_data_filtered_allocations)
                )            
                ,current_available_pack_level AS (
                    SELECT
                        a.dc_code,
                        a.article,
                        a.pack_type_id,
                        SUM(oh) oh,
                        SUM(it) it,
                        SUM(oo) oo
                    FROM (
                        SELECT
                        article,
                        size,
                        pack_type_id,
                        dc_code
                        FROM
                        pack_data_filtered_allocations
                        GROUP BY 1, 2, 3, 4
                    ) a
                    LEFT JOIN sku_dc_avai
                        ON a.article = sku_dc_avai.article AND a.size = sku_dc_avai.size AND a.pack_type_id = sku_dc_avai.pack_type_id AND a.dc_code::text = sku_dc_avai.dc_code::text
                        GROUP BY 1, 2, 3
                )
                ,other_allocations_pack_level as (
                    SELECT 
                        dc_code,
                        article, 
                        pack_type_id, 
                        SUM(allocated_reserve_qty) as allocated_reserve_qty
                    FROM (
                        SELECT 
                            am.dc_code,
                            am.article, 
                            am.pack_type_id, 
                            am.size, 
                            COALESCE(b.quantity,0) as allocated_reserve_qty
                        FROM (
                            SELECT 
                                dc_code, 
                                article, 
                                pack_type_id, 
                                size 
                            FROM pack_data_filtered_allocations
                            GROUP BY 1, 2, 3, 4
                        ) am
                        join (select * from inventory_smart.sku_dc_allocated_units( '', ARRAY(SELECT DISTINCT article FROM pack_data_filtered_allocations) )
                        where allocation_code not in (%L))b
                        ON am.dc_code::text = b.dc_code::text AND am.article = b.article AND am.size = b.size AND am.pack_type_id = b.pack_type_id
                    ) a
                    GROUP BY 1, 2, 3
                ),
            $$, $2);
            raise notice 'DC _available_query built';
            
            _allocated_query := $$
                reserve_allocation_pack_level AS (
                    SELECT
                        am.dc_code,
                        am.article,
                        am.pack_type_id,
                        SUM(COALESCE(b.quantity,0)) user_reserve_qty
                    FROM (
                        SELECT
                            dc_code,
                            article,
                            size,
                            pack_type_id
                        FROM
                        pack_data_filtered_allocations
                        GROUP BY 1, 2, 3, 4
                    ) am
                    LEFT JOIN (
                        SELECT
                        *
                        FROM
                        inventory_smart.dc_pack_reserve_quantity
                        WHERE
                        (article,dc_code::text, pack_type_id) in (
                        SELECT article, dc_code::text, pack_type_id FROM pack_data_filtered_allocations)
                        AND is_reserved = true
                        ) b
                    ON am.dc_code::text = b.dc_code::text AND am.article = b.article AND am.pack_type_id = b.pack_type_id
                    GROUP BY 1, 2, 3
                )
                ,available_units as materialized(
                    select
                        foo.article,
                        foo.dc_code,
                        foo.pack_type_id,
                        COALESCE(AVG(oh),0) AS available_total,
                        COALESCE(AVG(allocated_reserve_qty),0) AS allocated_reserve_qty,
                        COALESCE(AVG(user_reserve_qty),0) AS user_reserve_qty,
                        -- DC calculation: available - allocated - user_reserve - allocated_reserve
                        COALESCE(AVG(oh),0) - COALESCE(AVG(allocated_reserve_qty),0) - COALESCE(AVG(user_reserve_qty),0) AS net_available
                    from (
                        SELECT
                            dc_code,
                            article,
                            pack_type_id
                        FROM pack_data_filtered_allocations
                        GROUP BY 1, 2, 3
                    ) foo
                    LEFT JOIN
                        current_available_pack_level
                    ON foo.dc_code::text = current_available_pack_level.dc_code::text AND foo.article = current_available_pack_level.article AND foo.pack_type_id = current_available_pack_level.pack_type_id
                    LEFT JOIN
                        other_allocations_pack_level
                    ON foo.dc_code::text = other_allocations_pack_level.dc_code::text AND foo.article = other_allocations_pack_level.article AND foo.pack_type_id = other_allocations_pack_level.pack_type_id
                    LEFT JOIN
                        reserve_allocation_pack_level
                    ON foo.dc_code::text = reserve_allocation_pack_level.dc_code::text AND foo.article = reserve_allocation_pack_level.article AND foo.pack_type_id = reserve_allocation_pack_level.pack_type_id
                    GROUP BY 1, 2, 3
                )
            $$;
            raise notice 'DC _allocated_query built';
            
        ELSIF _inventory_source = 'po' THEN
            -- PO allocations - use PO tables with proper po_code mapping
            _available_query := format($$
                ,current_available_pack_level AS (
                    SELECT
                        a.dc_code,
                        a.article,
                        a.pack_type_id,
                        SUM(oh) as oh
                    FROM (
                        SELECT
                        article,
                        size,
                        pack_type_id,
                        dc_code
                        FROM
                        pack_data_filtered_allocations
                        GROUP BY 1, 2, 3, 4
                    ) a
                    LEFT JOIN (
                            SELECT
                            po_code::text as dc_code,
                            pack_type_id,
                            article,
                            size,
                            oh
                            FROM
                            inventory_smart.sku_po_available_units
                            WHERE (article, po_code::text) in ( 
                                SELECT article, dc_code::text 
                                FROM pack_data_filtered_allocations
                            ) ) b
                        USING(dc_code, pack_type_id, article, size)
                        GROUP BY 1, 2, 3
                )
                ,other_allocations_pack_level as (
                    SELECT 
                        dc_code,
                        article, 
                        pack_type_id, 
                        SUM(allocated_reserve_qty) as allocated_reserve_qty
                    FROM (
                        SELECT 
                            am.dc_code,
                            am.article, 
                            am.pack_type_id, 
                            am.size, 
                            COALESCE(b.quantity,0) as allocated_reserve_qty
                        FROM (
                            SELECT 
                                dc_code, 
                                article, 
                                pack_type_id, 
                                size 
                            FROM pack_data_filtered_allocations
                            GROUP BY 1, 2, 3, 4
                        ) am
                        join (select * from inventory_smart.sku_po_allocated_units( '', ARRAY(SELECT DISTINCT article FROM pack_data_filtered_allocations) )
                        where allocation_code not in (%L))b
                        ON am.dc_code::text = b.dc_code::text AND am.article = b.article AND am.size = b.size AND am.pack_type_id = b.pack_type_id
                    ) a
                    GROUP BY 1, 2, 3
                )
                ,reserve_allocation_pack_level AS (
                    SELECT
                        dc_code,
                        article,
                        pack_type_id,
                        0 as user_reserve_qty  -- PO allocations have no user reserve
                    FROM pack_data_filtered_allocations
                    GROUP BY 1, 2, 3
                ),
            $$, $2);
            raise notice 'PO _available_query built';
            
            _allocated_query := $$
                available_units as materialized(
                    select
                        article,
                        dc_code,
                        pack_type_id,
                        COALESCE(AVG(oh),0) AS available_total,
                        COALESCE(AVG(allocated_reserve_qty),0) AS allocated_reserve_qty,
                        COALESCE(AVG(user_reserve_qty),0) AS user_reserve_qty,
                        -- PO calculation: po_available - po_allocated (user_reserve_qty is 0 for PO)
                        COALESCE(AVG(oh),0) - COALESCE(AVG(allocated_reserve_qty),0) - COALESCE(AVG(user_reserve_qty),0) AS net_available
                    from (
                        SELECT
                            pack_data_filtered_allocations.dc_code,
                            pack_data_filtered_allocations.article,
                            pack_data_filtered_allocations.pack_type_id,
                            SUM(oh) AS oh,
                            SUM(allocated_reserve_qty) AS allocated_reserve_qty,
                            SUM(user_reserve_qty) AS user_reserve_qty
                        FROM pack_data_filtered_allocations
                        LEFT JOIN current_available_pack_level ON pack_data_filtered_allocations.dc_code::text = current_available_pack_level.dc_code::text AND pack_data_filtered_allocations.article = current_available_pack_level.article AND pack_data_filtered_allocations.pack_type_id = current_available_pack_level.pack_type_id
                        LEFT JOIN other_allocations_pack_level ON pack_data_filtered_allocations.dc_code::text = other_allocations_pack_level.dc_code::text AND pack_data_filtered_allocations.article = other_allocations_pack_level.article AND pack_data_filtered_allocations.pack_type_id = other_allocations_pack_level.pack_type_id
                        LEFT JOIN reserve_allocation_pack_level ON pack_data_filtered_allocations.dc_code::text = reserve_allocation_pack_level.dc_code::text AND pack_data_filtered_allocations.article = reserve_allocation_pack_level.article AND pack_data_filtered_allocations.pack_type_id = reserve_allocation_pack_level.pack_type_id
                        GROUP BY 1, 2, 3
                    ) subq
                    GROUP BY 1, 2, 3
                )
            $$;
            raise notice 'PO _allocated_query built';
        END IF;
    
    raise notice 'Building final combined query';
    _query_combine := format($$
        WITH filter_allocations_all_status as (
            select * from (
                select
                    carfg.store,
                    carfg.store_name,
                    carfg.store_grade,
                    carfg.allocated_total,
                    carfg.min,
                    carfg.wos,
                    carfg.allocation_code,
                    carfg.inv_avai,
                    carfg.article,
                    carfg.delivery_dt::timestamptz,
                    carfg.order_priority,
                    carfg.created_at,
                    carfg.created_by,
                    carfg.pack_dc_allocation,
                    carfg.retail_size_cd as size,
                    carfg.inventory_source,
                    CASE
                        WHEN inventory_source='dc' THEN 'B'
                        WHEN inventory_source='po' THEN 'L'
                        WHEN inventory_source='ns' THEN 'S'
                        ELSE ''
                    END
                    AS po_type
                from inventory_smart.create_allocation_result_flat_gurobi AS carfg
                WHERE carfg.allocation_code = '%s' %s
            ) a
        ),

        pack_data_filtered_allocations as materialized (
            select
                js.key::text as dc_code,
                carfg.store,
                carfg.store_name,
                carfg.store_grade,
                carfg.allocated_total,
                carfg.min,
                carfg.wos,
                carfg.allocation_code,
                carfg.inv_avai,
                carfg.article,
                carfg.delivery_dt,
                carfg.order_priority,
                carfg.created_at,
                carfg.created_by,
                carfg.size,
                carfg.po_type,
                carfg.inventory_source,
                pack_data.pack_type_id,
                pack_data.packs_allocated_qty,
                pack_data.packs_available_qty,
                dpc.pack_type,
                dpc.units_in_pack
            FROM
                filter_allocations_all_status carfg
                CROSS JOIN LATERAL jsonb_each(pack_dc_allocation) js
                CROSS JOIN LATERAL (
                    SELECT
                        UNNEST((TRANSLATE((js.value->>'packs_allocated'), '[]', '{}'))::text[]) AS pack_type_id,
                        UNNEST((TRANSLATE((js.value->>'packs_allocated_qty'), '[]', '{}'))::numeric[]) AS packs_allocated_qty,
                        UNNEST((TRANSLATE((js.value->>'packs_available_qty'), '[]', '{}'))::numeric[]) AS packs_available_qty
                ) pack_data
                JOIN inventory_smart.dc_pack_configuration dpc using(pack_type_id,article,size)
        ),
        
        packs_aggregation_base as materialized (
             SELECT 
                a.article,
                a.dc_code,
                a.pack_type_id,
                a.store,
                avg(packs_allocated_qty) as packs_allocated_qty
            FROM pack_data_filtered_allocations a
            where pack_type='packs'
            group by 1,2,3,4
        )
        
        ,eaches_aggregation_base as materialized(
             SELECT 
                a.article,
                a.dc_code,
                a.pack_type_id,
                a.store,
                avg(packs_allocated_qty) as packs_allocated_qty
            FROM pack_data_filtered_allocations a
            where pack_type='eaches'
            group by 1,2,3,4
        )
        
        ,store_level_aggregations_eaches as materialized (
            SELECT 
                a.store,
                a.dc_code,
                SUM(COALESCE(a.packs_allocated_qty,0)) as store_level_eaches
            FROM eaches_aggregation_base a
            GROUP BY a.store, a.dc_code
        )
        
        ,product_level_aggregations_eaches as materialized (
            SELECT 
                a.article,
                a.dc_code,
                sum(packs_allocated_qty) as product_level_eaches
            FROM eaches_aggregation_base a
            group by a.article, a.dc_code
        )
        ,
        
        store_product_level_aggregations_eaches as materialized (
            SELECT 
                a.store,
                a.dc_code, 
                a.article,
                SUM(COALESCE(a.packs_allocated_qty,0)) as store_product_level_eaches
            FROM eaches_aggregation_base a
            GROUP BY a.store, a.dc_code, a.article
        ),
         store_level_aggregations_packs as materialized (
            SELECT 
                a.store,
                a.dc_code,
                SUM(COALESCE(a.packs_allocated_qty,0)) as store_level_packs
            FROM packs_aggregation_base a
            GROUP BY a.store, a.dc_code
        ),
        
        product_level_aggregations_packs as materialized (
            SELECT 
                a.article,
                a.dc_code,
                SUM( COALESCE(a.packs_allocated_qty,0)) as product_level_packs
            FROM packs_aggregation_base a
            GROUP BY a.article, a.dc_code
        )
        
        ,
        
        store_product_level_aggregations_packs as materialized (
            SELECT 
                a.store, a.dc_code, a.article,
                SUM( COALESCE(a.packs_allocated_qty,0)) as store_product_level_packs
            FROM packs_aggregation_base a
            GROUP BY a.store, a.dc_code, a.article
        )
        
        %s
        %s
        ,original_carfg_flat as materialized(
            select 
                a.store,
                a.store_name,
                a.store_grade,
                a.article,
                a.dc_code,
                a.created_at,
                a.created_by,
                a.delivery_dt,
                a.allocation_code,
                a.pack_type,
                a.pack_type_id,
                sizes,
                units_in_pack_list,
                packs_allocated_qty,
                packs_allocated_qty as packs_allocated_qty_original,
                packs_available_qty,
                reserve_qty,
                inventory_source,
                packs_allocated_qty * (
                    SELECT SUM(elem) 
                    FROM UNNEST(units_in_pack_list) AS elem
                ) as total_allocated_qty_original,
                packs_available_qty * (
                    SELECT SUM(elem) 
                    FROM UNNEST(units_in_pack_list) AS elem
                ) as total_available_qty,
                COALESCE(slae.store_level_eaches, 0) as store_level_eaches_original,
                COALESCE(slap.store_level_packs, 0) as store_level_packs_original,
                COALESCE(plae.product_level_eaches, 0) as product_level_eaches_original,
                COALESCE(plap.product_level_packs, 0) as product_level_packs_original,
                COALESCE(splae.store_product_level_eaches, 0) as store_product_level_eaches_original,
                COALESCE(splap.store_product_level_packs, 0) as store_product_level_packs_original,
                -- UNIFIED: Same field names regardless of DC or PO
                COALESCE(AVG(au.available_total), 0) as available_total,
                COALESCE(AVG(a.wos), 0) as wos,
                COALESCE(AVG(a.min), 0) as min,
                COALESCE(AVG(au.net_available), 0) as net_available_units,
                COALESCE(AVG(au.allocated_reserve_qty), 0) as allocated_reserve_qty
            from (
                select 
                    a.store,
                    a.store_name,
                    a.store_grade,
                    a.article,
                    a.dc_code,
                    a.created_at,
                    a.delivery_dt,
                    a.allocation_code,
                    a.inventory_source,
                    a.pack_type,
                    a.pack_type_id,
                    array_agg(a.size ORDER BY a.size) AS sizes,
                    array_agg(COALESCE(a.units_in_pack, 1) ORDER BY a.size) AS units_in_pack_list,
                    avg(a.packs_allocated_qty) AS packs_allocated_qty,
                    avg(a.packs_available_qty) AS packs_available_qty,
                    avg(COALESCE(au.user_reserve_qty, 0)) AS reserve_qty,
                    COALESCE(AVG(a.wos), 0) as wos,
                    COALESCE(AVG(a.min), 0) as min,
                    a.created_by
                FROM
                    pack_data_filtered_allocations a
                    LEFT JOIN available_units au ON a.article = au.article AND a.dc_code::text = au.dc_code::text AND a.pack_type_id = au.pack_type_id
                group by
                    a.store,
                    a.store_name,
                    a.store_grade,
                    a.article,
                    a.dc_code,
                    a.created_at,
                    a.delivery_dt,
                    a.allocation_code,
                    a.inventory_source,
                    a.pack_type,
                    a.pack_type_id,
                    a.created_by
            ) a
            -- UNIFIED JOIN: Same join logic regardless of DC or PO
            LEFT JOIN available_units au on a.article=au.article and a.dc_code::text = au.dc_code::text and a.pack_type_id=au.pack_type_id
            LEFT JOIN store_level_aggregations_eaches slae on a.store = slae.store and a.dc_code::text = slae.dc_code::text
            LEFT JOIN product_level_aggregations_eaches plae on a.article = plae.article and a.dc_code::text = plae.dc_code::text
            LEFT JOIN store_product_level_aggregations_eaches splae on a.store = splae.store and a.dc_code::text = splae.dc_code::text and a.article = splae.article
            LEFT JOIN store_level_aggregations_packs slap on a.store = slap.store and a.dc_code::text = slap.dc_code::text
            LEFT JOIN product_level_aggregations_packs plap on a.article = plap.article and a.dc_code::text = plap.dc_code::text
            LEFT JOIN store_product_level_aggregations_packs splap on a.store = splap.store and a.dc_code::text = splap.dc_code::text and a.article = splap.article
            group by 
                a.store,
                a.store_name,
                a.store_grade,
                a.article,
                a.dc_code,
                a.allocation_code,
                a.pack_type,
                a.pack_type_id,
                a.sizes,
                a.units_in_pack_list,
                a.packs_allocated_qty,
                a.packs_available_qty,
                a.reserve_qty,
                a.created_at,
                a.created_by,
                a.delivery_dt,
                a.inventory_source,
                slae.store_level_eaches,
                slap.store_level_packs,
                plae.product_level_eaches,
                plap.product_level_packs,
                splae.store_product_level_eaches,
                splap.store_product_level_packs
        )
        select 
            store,
            store_name,
            store_grade,
            article,
            dc_code,
            created_at,
            created_by,
            delivery_dt,
            allocation_code,
            pack_type,
            pack_type_id,
            sizes,
            units_in_pack_list,
            packs_allocated_qty,
            packs_allocated_qty_original,
            packs_available_qty,
            reserve_qty,
            total_allocated_qty_original,
            total_available_qty,
            available_total,
            wos,
            min,
            net_available_units,
            allocated_reserve_qty,
            inventory_source,
            store_level_eaches_original,
            store_level_packs_original,
            product_level_eaches_original,
            product_level_packs_original,
            store_product_level_eaches_original,
            store_product_level_packs_original,
            store_level_eaches_original as store_level_eaches,
            store_level_packs_original as store_level_packs,
            product_level_eaches_original as product_level_eaches,
            product_level_packs_original as product_level_packs,
            store_product_level_eaches_original as store_product_level_eaches,
            store_product_level_packs_original as store_product_level_packs,
            false as is_edited
        from original_carfg_flat
    $$, $2, _created_at_filter, _available_query, _allocated_query);
    
    raise notice 'Final combined query: %', _query_combine;
    raise notice 'Parameters - allocation_code: %, created_at_filter: %', $2, _created_at_filter;
    OPEN $1 FOR execute _query_combine;  
    perform  global.sp_log(v_gen_random_uuid, 'inventory_smart.finalize_hle_base_data', 'Before returning function value',_query_combine,jsonb_build_object('allocation_code',$2));		
    RETURN $1;
END
$function$
;
