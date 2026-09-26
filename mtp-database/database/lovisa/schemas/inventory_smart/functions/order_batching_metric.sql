--liquibase formatted sql
--changeset liquibase:lovisa_order_batching_metric_base_column_name_fix runOnChange:true stripComments:false splitStatements:false context:MTP-76813 labels:MTP-76813
--comment: Updated timezone to Australia/Melbourne with corrected timezone handling pattern - apply AT TIME ZONE directly to timestamp columns, added materialized to CTEs
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.order_batching_metric_simplified(input, jsonb, jsonb, jsonb);
DROP FUNCTION IF EXISTS inventory_smart.order_batching_metric(input, jsonb, jsonb, jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.order_batching_metric(input refcursor, jsonb, jsonb, jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
 /* 
  * Function/Procedure name: inventory_smart.order_batching_metric_simplified
  * Created by: Mithun Rangaswamy
  * Created at: 2025-09-09
  * Purpose: Simplified version focusing on specific KPIs for Lovisa
  * 
  * KPIs returned:
  * - Allocations (count of allocation codes)
  * - # Allocated Refs (count of distinct l4_name/product_code)
  * - # Allocated Units (sum of allocated_total)
  * - DC Net Available Inventory (calculated from inv_avai - allocated_total)
  * - Reserve Quantity (from dc_pack_reserve_quantity table)
  * 
  * Key Requirements:
  * - 7 days lookback for OB allocation
  * - Only DC allocation flow (inventory_source = 'dc')
  * - Order priority can be 1,2,3 (integer)
  * - #refs is product_code (l4_name count distinct)
  * - Use dc_pack_reserve_quantity_derived_table for reserve (currently empty)
  */
declare
    _query_combine text;
    _query_pa      text:='';
    _query_sa      text:='';
    _query_cus     text:='';
    v_gen_random_uuid text  := gen_random_uuid()::varchar;
begin
    -- Build filter queries
    _query_pa  := inventory_smart.form_main_table_filters('product_attributes_filter', $2);
    _query_sa  := inventory_smart.form_main_table_filters('store_attributes_filter', $3);
    _query_cus := inventory_smart.form_main_table_filters('', $4);

    _query_combine := format($$
        WITH
        product_filters AS materialized (
            SELECT product_code, article, l4_name FROM global.product_attributes_filter %1$s
        ),
        store_filters AS materialized(
            SELECT store_code FROM global.store_attributes_filter %2$s
        ),
        plan_master AS materialized (
            SELECT 
                plan_code, 
                plan_code as allocation_name, 
                created_at, 
                CASE WHEN type in (0, 4, 5) THEN 'Manual' ELSE 'Auto' end as plan_type
            FROM 
                inventory_smart.plan_master 
            WHERE 
                status IN (2) 
                AND is_deleted = false 
                AND (
                    type IN (4, 5) 
                    OR (
                        type IN (0, 2) 
                        AND updated_at AT TIME ZONE 'Australia/Melbourne' >= (CURRENT_DATE AT TIME ZONE 'Australia/Melbourne')
                        AND updated_at AT TIME ZONE 'Australia/Melbourne' < (CURRENT_DATE AT TIME ZONE 'Australia/Melbourne' + INTERVAL '1 day')
                    )
                ) 
                AND 
                created_at AT TIME ZONE 'Australia/Melbourne' >= (CURRENT_DATE AT TIME ZONE 'Australia/Melbourne' - INTERVAL '7 days')
                AND created_at AT TIME ZONE 'Australia/Melbourne' <  (CURRENT_DATE AT TIME ZONE 'Australia/Melbourne' + INTERVAL '1 day')
        ),
        filter_allocations_pre as materialized (
            SELECT
                *
            FROM (
                SELECT 
                    carfg.allocation_code,
                    carfg.article,
                    carfg.retail_size_cd,
                    carfg.store,
                    carfg.allocated_total,
                    carfg.inventory_source,
                    carfg.inv_avai,
                    carfg.created_at,
                    carfg.order_priority,
                    plm.plan_type as allocation_type,
                    plm.allocation_name
                FROM inventory_smart.create_allocation_result_flat_gurobi AS carfg
                INNER JOIN plan_master plm ON plm.plan_code = carfg.allocation_code
                WHERE 
                    exists (select 1 from product_filters paf where paf.article=carfg.article)
                    AND carfg.created_at AT TIME ZONE 'Australia/Melbourne' >= (CURRENT_DATE AT TIME ZONE 'Australia/Melbourne' - INTERVAL '7 days')
                    AND carfg.created_at AT TIME ZONE 'Australia/Melbourne' <  (CURRENT_DATE AT TIME ZONE 'Australia/Melbourne' + INTERVAL '1 day')
            ) a  %3$s
        ),
        filter_allocations as materialized (
            select a.* 
            from filter_allocations_pre a
            where exists (select 1 from store_filters b where a.store=b.store_code)
        ),
        article_level_pre as materialized (
            select * from
            (select 
                article,
                retail_size_cd,
                created_at,
                allocated_total,
                inv_avai,
                dense_rank() over(partition by article order by created_at desc) as rank_alloc
            from
               (
                 select 
                    allocation_code,
                    article,
                    retail_size_cd,
                    created_at,
                    sum(allocated_total) as allocated_total,
                    avg(inv_avai) as inv_avai
                    from filter_allocations 
                group by 1,2,3,4
                ) x
                ) y
               where rank_alloc=1
        ),
        article_level as materialized (
            select 
                article,
                inv_avai - allocated_total as dc_net_available_inventory 
            from 
                (
                  select 
                    article,
                    SUM(inv_avai) as inv_avai, 
                    SUM(allocated_total) as allocated_total 
                  from 
                    article_level_pre    
                  group by 
                    1
                ) y
        ),
        reserved_units AS materialized(
            SELECT 
                article, 
                COALESCE(sum(reserve_quantity), 0) AS reserve_quantity
            FROM 
                inventory_smart.dc_pack_reserve_quantity_derived_table a
            WHERE
                exists (SELECT 1 FROM article_level b where b.article=a.article)
            GROUP BY
                article
        ),
        product_details as materialized(
            SELECT product_code, article, l4_name FROM global.product_attributes_filter %1$s
            AND article in (select article from article_level)
        ),
        final_pre as materialized (
            select 
                article,
                (SELECT COUNT(DISTINCT allocation_code) FROM filter_allocations_pre) as allocation_count,
                sum(allocated_total) as allocated_qty
            from (
                SELECT 
                    a.article,
                    a.allocation_code,
                    SUM(a.allocated_total) AS allocated_total
                FROM 
                    filter_allocations a 
                GROUP BY 1,2
            ) x
            group by 1
        ),
        final as materialized (
            SELECT 
                aa.article,
                aa.allocation_count,
                aa.allocated_qty as allocated_qty,
                al.dc_net_available_inventory - coalesce(ru.reserve_quantity,0) as dc_available,
                coalesce(ru.reserve_quantity,0) as reserve_quantity,
                pd.l4_name
            FROM
                final_pre AS aa
            left join article_level al on al.article = aa.article
            LEFT JOIN
                reserved_units AS ru ON aa.article = ru.article
            LEFT JOIN
                product_details pd ON pd.article = aa.article
        )
        
        SELECT
            TO_CHAR(COALESCE(AVG(allocation_count),0)::int,'FM999,999,999') AS "Allocations",
            TO_CHAR(COUNT(DISTINCT l4_name),'FM999,999,999') AS "# Allocated Refs",
            TO_CHAR(COALESCE(SUM(allocated_qty), 0),'FM999,999,999') AS "# Allocated Units",
            TO_CHAR(GREATEST(SUM(dc_available), 0),'FM999,999,999') AS "DC Net Available Inventory",
            TO_CHAR(COALESCE(SUM(reserve_quantity), 0),'FM999,999,999') AS "Reserve Quantity"
        FROM final z
        $$, _query_pa, _query_sa, _query_cus);
        
        raise notice '%', _query_combine;
        OPEN $1 FOR execute _query_combine; 
        perform  global.sp_log(v_gen_random_uuid, 'inventory_smart.order_batching_metric_simplified', 'Before returning function value',_query_combine,jsonb_build_object('product filters str',$2,'store filters str',$3,'custom filter str',$4)) ;        

        RETURN $1;
    end
$function$
;