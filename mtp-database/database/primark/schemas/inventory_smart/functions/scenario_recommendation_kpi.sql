--liquibase formatted sql
--changeset liquibase:scenario_recommendation_kpi_timezone_carfg_filter runOnChange:true stripComments:false splitStatements:false context:MTP-91115 labels:MTP-91115
--comment: Enhanced scenario recommendation KPI with improved article-store filtering and accurate store count calculation
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.scenario_recommendation_kpi(text, text);
DROP FUNCTION IF EXISTS inventory_smart.scenario_recommendation_kpi(text);
CREATE OR REPLACE FUNCTION inventory_smart.scenario_recommendation_kpi(allocation_code text)
 RETURNS TABLE(
    key text,
    original numeric,
    scenario numeric,
    trend numeric
 )
 LANGUAGE plpgsql
AS $function$
 /* 
  * Function/Procedure name: inventory_smart.scenario_recommendation_kpi
  * Created by: AI Assistant
  * Created at: Current Date
  * No of input parameter: 1
  * Parameter Description : $1 = allocation_code (scenario allocation code)
  * Purpose: Compare Original vs Scenario allocation KPIs
  *
  * if any modification done in same function/procedure please record the changes in below format
  *
  * Updated_by       Updated_on      Purpose
  * ----------       -----------     --------
  * Shekharkrishna   17-06-2025      MTP-91115
  */
declare
    _query_combine text;
    v_gen_random_uuid text := gen_random_uuid()::varchar;
    v_allocation_code text := allocation_code;
    v_original_allocation_code text := SPLIT_PART(allocation_code, '_SCENARIO', 1);
    v_current_date date;
    _timezone text;
    begin
    
    -- fetch timezone from tenant_attribute_master
    SELECT attribute_value::json->>'time_zone' INTO _timezone
    FROM global.tenant_attribute_master
    WHERE name = 'tenant_time_config'
    LIMIT 1;
    _timezone := COALESCE(_timezone, 'America/Chicago');
    raise notice 'timezone: %', _timezone;
    
    -- Current date in tenant timezone for carfg filter (compare created_at at timezone with this date)
    v_current_date := (NOW() AT TIME ZONE _timezone)::date;
    raise notice 'filter date (current date at tenant TZ) for carfg: %', v_current_date;
    
    _query_combine := $$
        WITH
        plan_master AS MATERIALIZED (
            SELECT 
                plan_code,
                plan_code AS allocation_name,
                created_at,
                updated_at,
                type AS plan_type,
                status
            FROM inventory_smart.plan_master
            WHERE plan_code = $$ || quote_literal(v_allocation_code) || $$ 
               OR plan_code = $$ || quote_literal(v_original_allocation_code) || $$
        ),
        scenario_base_allocation AS (
            SELECT 
                carfg.article,
                carfg.retail_size_cd AS size,
                carfg.store AS store_code,
                carfg.pack_dc_allocation,
                carfg.min,
                carfg.max,
                carfg.wos,
                carfg.oh_oo_intransit,
                carfg.demand,
                carfg.allocation_code,
                plm.allocation_name,
                plm.created_at AS plan_created_at,
                plm.updated_at AS plan_updated_at,
                plm.status AS plan_status,
                -- Extract original allocation code by splitting on '_SCENARIO'
                CASE 
                    WHEN carfg.allocation_code LIKE '%_SCENARIO%' THEN
                        SPLIT_PART(carfg.allocation_code, '_SCENARIO', 1)
                    ELSE carfg.allocation_code
                END AS original_allocation_code,
                -- Determine if this is original or scenario
                CASE 
                    WHEN carfg.allocation_code LIKE '%_SCENARIO%' THEN 'scenario'
                    ELSE 'original'
                END AS allocation_category
            FROM inventory_smart.create_allocation_result_flat_gurobi AS carfg
            INNER JOIN plan_master plm ON plm.plan_code = carfg.allocation_code
            WHERE DATE(carfg.created_at at time zone $$ || quote_literal(_timezone) || $$) = $$ || quote_literal(v_current_date) || $$
            and  (allocation_code = $$ || quote_literal(v_allocation_code) || $$ 
               OR allocation_code = $$ || quote_literal(v_original_allocation_code) || $$)
        ),
        scenario_article AS MATERIALIZED (
            SELECT article 
            FROM scenario_base_allocation 
            WHERE allocation_category = 'scenario' 
            GROUP BY 1
        ),
        scenario_article_store AS MATERIALIZED (
            SELECT article, store_code
            FROM scenario_base_allocation 
            WHERE allocation_category = 'scenario' 
            GROUP BY 1,2
        ),
        filtered_allocation AS (
            SELECT * 
            FROM scenario_base_allocation a 
            WHERE EXISTS (
                SELECT 1 
                FROM scenario_article_store b 
                WHERE b.article = a.article
                and b.store_code=a.store_code
            )
        ),
        -- Unpack pack_dc_allocation JSON to get actual allocated quantities
        allocation_unpack AS (
            SELECT
                fa.*,
                js.key AS dc_code,
                pack_data.pack_type_id,
                pack_data.packs_allocated_qty,
                pack_data.packs_available_qty
            FROM filtered_allocation fa
            CROSS JOIN LATERAL jsonb_each(fa.pack_dc_allocation) js
            CROSS JOIN LATERAL (
                SELECT 
                    UNNEST((TRANSLATE((js.value->>'packs_allocated')::text, '[]', '{}'))::text[]) AS pack_type_id,
                    UNNEST((TRANSLATE((js.value->>'packs_allocated_qty')::text, '[]', '{}'))::numeric[]) AS packs_allocated_qty,
                    UNNEST((TRANSLATE((js.value->>'packs_available_qty')::text, '[]', '{}'))::numeric[]) AS packs_available_qty
            ) pack_data
        ),
        -- Get units per pack to calculate actual allocated quantities
        allocation_with_units AS MATERIALIZED (
            SELECT 
                au.*,
                au.packs_allocated_qty * COALESCE(dpc.units_in_pack, 0) AS actual_allocated_qty,
                (au.packs_allocated_qty * COALESCE(dpc.units_in_pack, 0)) + 
                COALESCE(au.oh_oo_intransit, 0) AS total_inventory_per_sku_store
            FROM allocation_unpack au
            JOIN inventory_smart.dc_pack_configuration dpc 
                ON  dpc.pack_type_id = au.pack_type_id 
                AND dpc.article = au.article 
                AND dpc.size = au.size
        ),
        product_filters AS MATERIALIZED (
            SELECT l0_name, article, size, product_code 
            FROM global.product_attributes_filter paf
            WHERE EXISTS (
                SELECT 1 
                FROM scenario_article b 
                WHERE b.article = paf.article
            )     
        ),
        fwos_pre AS MATERIALIZED (
            SELECT 
                fsst.product_code,
                fsst.store_code,
                fsst.str_inv,
                fsst.wos_oh_oo_it,
                CASE 
                    WHEN fsst.wos_oh_oo_it != 0 
                    THEN ROUND(CAST(fsst.str_inv / fsst.wos_oh_oo_it AS NUMERIC), 2) 
                    ELSE 0 
                END AS str_wos_factor   
            FROM inventory_smart.fwos_sku_store_table fsst 
            WHERE EXISTS (
                SELECT 1 
                FROM product_filters b 
                WHERE b.product_code = fsst.product_code
            )  
        ),
        fwos AS (
            SELECT a.*, b.article, b.size 
            FROM fwos_pre a
            JOIN product_filters b USING(product_code)
        ),
        wos_metric_base_pre AS MATERIALIZED (
            SELECT 
                a.*, 
                f.str_inv,
                COALESCE(f.wos_oh_oo_it, 0) AS wos_oh_oo_it,
                f.str_wos_factor,
                CASE 
                    WHEN f.str_wos_factor != 0 
                    THEN a.actual_allocated_qty / COALESCE(str_wos_factor, 1) 
                END AS alloc_qty_wos
            FROM allocation_with_units a
            LEFT JOIN fwos f USING (article, size, store_code) 
        ),
        wos_metric_base AS (
            SELECT 
                allocation_category, 
                CASE 
                    WHEN SUM(total_inventory_per_sku_store) != 0 
                    THEN ROUND(CAST(sum(CASE 
                        WHEN total_inventory_per_sku_store != 0 
                        THEN (total_inventory_per_sku_store * (wos_oh_oo_it + alloc_qty_wos))
                        ELSE NULL 
                    END)/sum(CASE 
                        WHEN total_inventory_per_sku_store != 0 
                        THEN total_inventory_per_sku_store
                        ELSE NULL 
                    END) AS NUMERIC), 2) 
                END AS avg_fwos_post_alloc,
                CASE 
                    WHEN SUM(total_inventory_per_sku_store) != 0 
                    THEN ROUND(CAST(sum(CASE 
                        WHEN total_inventory_per_sku_store != 0 
                        THEN (total_inventory_per_sku_store * (wos - wos_oh_oo_it - alloc_qty_wos))
                        ELSE NULL 
                    END)/sum(CASE 
                        WHEN total_inventory_per_sku_store != 0 
                        THEN total_inventory_per_sku_store
                        ELSE NULL 
                    END) AS NUMERIC), 2) 
                END AS target_wos_diff
            FROM wos_metric_base_pre
            GROUP BY 1
        ),
        avg_store_inv_post_alloc_kpi AS ( 
            SELECT 
                allocation_category, 
                ROUND(AVG(avg_store_inv_post_alloc::INT)::NUMERIC, 0) AS avg_store_inv_post_alloc
            FROM (
                SELECT 
                    allocation_category, 
                    store_code, 
                    SUM(total_inventory_per_sku_store) AS avg_store_inv_post_alloc 
                FROM allocation_with_units 
                GROUP BY 1, 2
            ) a
            GROUP BY 1
        ),
        total_stores_kpi as (
            select allocation_category,
            coalesce(count (distinct store_code),0) as total_stores
             FROM allocation_with_units
            where actual_allocated_qty>0
            group by 1
        ),
        -- Calculate KPIs for each allocation type (original vs scenario)
        kpi_calculations AS MATERIALIZED (
            SELECT
                original_allocation_code,
                allocation_category,
                f.avg_store_inv_post_alloc,
                g.avg_fwos_post_alloc,
                g.target_wos_diff,
                lb.total_stores,
                SUM(total_inventory_per_sku_store)::NUMERIC AS total_inventory_all_sku_stores,
                ROUND(
                    CASE 
                        WHEN COUNT(DISTINCT store_code) > 0 THEN
                            SUM(actual_allocated_qty)::NUMERIC / COUNT(DISTINCT store_code)::NUMERIC
                        ELSE 0
                    END::NUMERIC, 0
                ) AS avg_allocated_qty_per_store,
                ROUND(
                    CASE 
                        WHEN COUNT(DISTINCT store_code) > 0 THEN
                            SUM(total_inventory_per_sku_store)::NUMERIC / COUNT(*)::NUMERIC
                        ELSE 0
                    END::NUMERIC, 0
                ) AS avg_sku_store_inventory_per_store,
                (CASE 
                    WHEN COUNT(*) != 0 THEN 
                        SUM(CASE WHEN total_inventory_per_sku_store > 0 THEN 1 ELSE 0 END)::NUMERIC / COUNT(*)::NUMERIC * 100 
                    ELSE 0 
                END)::NUMERIC AS in_stock_percentage,
                SUM(demand)::NUMERIC AS total_demand,
                ROUND((SUM(demand)::NUMERIC / AVG(wos)::NUMERIC)::NUMERIC, 2) AS forward_looking_ros
            FROM allocation_with_units
            LEFT JOIN avg_store_inv_post_alloc_kpi f USING (allocation_category)
            LEFT JOIN wos_metric_base g USING (allocation_category)
            LEFT JOIN total_stores_kpi lb using(allocation_category)
            GROUP BY original_allocation_code, allocation_category, avg_store_inv_post_alloc, avg_fwos_post_alloc, target_wos_diff, total_stores
        ),
        -- Get all unique original allocation codes to ensure we show all KPIs
        all_allocation_codes AS (
            SELECT DISTINCT original_allocation_code
            FROM allocation_with_units
        ),
        -- Cross join with KPI names to ensure all KPIs are shown
        kpi_names AS (
            SELECT '#Allocated Units Per Store' AS kpi_name
            UNION ALL SELECT '# Allocated Stores' AS kpi_name
            UNION ALL SELECT 'Avg Store WOS(OH+OO+IT) Post Allocation' AS kpi_name
            UNION ALL SELECT 'Avg SKU-Store Inventory (OH + OO + IT + Allocation)' AS kpi_name
            UNION ALL SELECT 'Avg Store Inventory (OH + OO + IT + Allocation)' AS kpi_name
            UNION ALL SELECT 'Store In-Stock% Post Allocation' AS kpi_name
            UNION ALL SELECT 'Target WOS Difference' AS kpi_name
            UNION ALL SELECT 'Total Demand' AS kpi_name
            UNION ALL SELECT 'Forward Looking ROS' AS kpi_name  
        ),
        -- Pivot the data to compare original vs scenario
        kpi_comparison AS (
            SELECT
                aac.original_allocation_code,
                kn.kpi_name,
                COALESCE(MAX(CASE WHEN kc.allocation_category = 'original' THEN 
                    CASE 
                        WHEN kn.kpi_name = '#Allocated Units Per Store' THEN kc.avg_allocated_qty_per_store
                        WHEN kn.kpi_name = '# Allocated Stores' THEN kc.total_stores
                        WHEN kn.kpi_name = 'Avg Store WOS(OH+OO+IT) Post Allocation' THEN kc.avg_fwos_post_alloc
                        WHEN kn.kpi_name = 'Avg SKU-Store Inventory (OH + OO + IT + Allocation)' THEN kc.avg_sku_store_inventory_per_store
                        WHEN kn.kpi_name = 'Avg Store Inventory (OH + OO + IT + Allocation)' THEN kc.avg_store_inv_post_alloc
                        WHEN kn.kpi_name = 'Store In-Stock% Post Allocation' THEN kc.in_stock_percentage
                        WHEN kn.kpi_name = 'Total Demand' THEN kc.total_demand
                        WHEN kn.kpi_name = 'Forward Looking ROS' THEN kc.forward_looking_ros
                        WHEN kn.kpi_name = 'Target WOS Difference' THEN kc.target_wos_diff
                    END
                END), 0) AS original_value,
                COALESCE(MAX(CASE WHEN kc.allocation_category = 'scenario' THEN 
                    CASE 
                        WHEN kn.kpi_name = '#Allocated Units Per Store' THEN kc.avg_allocated_qty_per_store
                        WHEN kn.kpi_name = '# Allocated Stores' THEN kc.total_stores
                        WHEN kn.kpi_name = 'Avg Store WOS(OH+OO+IT) Post Allocation' THEN kc.avg_fwos_post_alloc
                        WHEN kn.kpi_name = 'Avg SKU-Store Inventory (OH + OO + IT + Allocation)' THEN kc.avg_sku_store_inventory_per_store
                        WHEN kn.kpi_name = 'Avg Store Inventory (OH + OO + IT + Allocation)' THEN kc.avg_store_inv_post_alloc
                        WHEN kn.kpi_name = 'Store In-Stock% Post Allocation' THEN kc.in_stock_percentage
                        WHEN kn.kpi_name = 'Total Demand' THEN kc.total_demand
                        WHEN kn.kpi_name = 'Forward Looking ROS' THEN kc.forward_looking_ros
                        WHEN kn.kpi_name = 'Target WOS Difference' THEN kc.target_wos_diff
                    END
                END), 0) AS scenario_value
            FROM all_allocation_codes aac
            CROSS JOIN kpi_names kn
            LEFT JOIN kpi_calculations kc ON kc.original_allocation_code = aac.original_allocation_code
            GROUP BY aac.original_allocation_code, kn.kpi_name
        )
        -- Final output in requested format
        SELECT 
            kpi_name AS key,
            original_value::NUMERIC AS original,
            scenario_value::NUMERIC AS scenario,
            (scenario_value - original_value)::NUMERIC AS trend
        FROM kpi_comparison
        ORDER BY original_allocation_code, kpi_name
    $$;
    
    raise notice '%', _query_combine;
    perform global.sp_log(v_gen_random_uuid, 'inventory_smart.scenario_recommendation_kpi', 'Before returning function value', _query_combine, jsonb_build_object('allocation_code', allocation_code));		
    
    RETURN QUERY EXECUTE _query_combine;
    end
$function$
; 