--liquibase formatted sql
--changeset liquibase:order_batching_summary_store_lululemon runOnChange:true stripComments:false splitStatements:false context:MTP-115251 labels:MTP-115251
--comment: Order batching summary store function for lululemon
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.order_batching_summary_store(input refcursor, jsonb, jsonb, jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.order_batching_summary_store(input refcursor, jsonb, jsonb, jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
 /* 
  * Function/Procedure name: inventory_smart.order_batching_summary_store
  * Created by: Shekharkrishna Nirnakar
  * Created at: 2025-01-XX
  * No of input parameter: 4
  * Parameter Description : $1 = cursor
  *                        $2 = product filters str
  *                        $3 = store filters str
  *                        $4 = other filters str
  */
declare
    _query_combine text;
    _query_pa      text:='';
    _query_sa      text:='';
    _query_cus     text:='';
    v_gen_random_uuid text  := gen_random_uuid()::varchar;
    _timezone text;
    begin
    -- Fetch timezone from tenant configuration
    SELECT attribute_value::json->'value'->>'time_zone' INTO _timezone
    FROM global.tenant_attribute_master
    WHERE name = 'tenant_time_config'
    LIMIT 1;
    
    -- Default to 'America/New_York' if timezone is not found
    IF _timezone IS NULL OR _timezone = '' THEN
        _timezone := 'America/New_York';
    END IF;
    _query_pa  := inventory_smart.form_main_table_filters('product_attributes_filter', $2);
    _query_sa  := inventory_smart.form_main_table_filters('store_attributes_filter', $3);
    _query_cus := inventory_smart.form_main_table_filters('', $4);
    _query_combine := format($$
        WITH
        product_filters AS (
            SELECT DISTINCT article FROM
            global.product_attributes_filter %1$s
        )
        ,store_filters AS materialized (
            SELECT DISTINCT store_code FROM
            global.store_attributes_filter %2$s                
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
                    AND updated_at >= CURRENT_DATE AT TIME ZONE %4$L
                    AND updated_at < (CURRENT_DATE + INTERVAL '1 day') AT TIME ZONE %4$L
                )
            ) 
            AND 
                created_at >= (CURRENT_DATE - INTERVAL '14 days') AT TIME ZONE %4$L
                AND 
                created_at <  (CURRENT_DATE + INTERVAL '1 day') AT TIME ZONE %4$L
            ), 
            filter_allocations_pre as materialized (
              select 
                * 
              from 
                (
                  select 
                    carfg.allocation_code,
                    carfg.article,
                    carfg.retail_size_cd,
                    carfg.store,
                    carfg.store_name,
                    carfg.allocated_total ,
                    carfg.inv_avai,
                    carfg.created_at,
                    CASE WHEN inventory_source = 'dc' THEN 'B' WHEN inventory_source = 'po' THEN 'L' WHEN inventory_source = 'ns' THEN 'S' ELSE '' END AS po_type, 
                    plan_type AS allocation_type, 
                    carfg.delivery_dt::timestamptz,
                    plm.allocation_name 
                  from 
                    inventory_smart.create_allocation_result_flat_gurobi AS carfg 
                    INNER JOIN plan_master plm ON plm.plan_code = carfg.allocation_code
                   where 
                   exists (select 1 from product_filters b where carfg.article=b.article)
                   and 
                    carfg.created_at >= (CURRENT_DATE - INTERVAL '14 days') AT TIME ZONE %4$L
                    AND 
                    carfg.created_at <  (CURRENT_DATE + INTERVAL '1 day') AT TIME ZONE %4$L
                ) a %3$s
            )
            ,filter_allocations as materialized (
            select *
            from filter_allocations_pre a
            where exists (select 1 from store_filters c where a.store=c.store_code) 
            )  
            , article_level_pre as (
            select * from
            (select 
                article,
                retail_size_cd,
                created_at,
                po_type,
                allocated_total,
                inv_avai,
                dense_rank() over(partition by article, po_type order by created_at desc) as rank_alloc
            from
               (
                 select 
                    allocation_code,
                    article,
                    retail_size_cd,
                    created_at,
                    po_type,
                    sum(allocated_total) as allocated_total,
                    avg(inv_avai) as inv_avai
                    from filter_allocations 
                group by 1,2,3,4,5
                ) x
                ) y
               where rank_alloc = 1
            )
            ,
            reserved_units AS materialized (
              SELECT 
                article, 
                SUM(COALESCE(quantity,0)) AS reserve_quantity 
              FROM 
                inventory_smart.dc_reserve_quantity a
              WHERE 
                exists  (select 1 from filter_allocations b where b.article = a.article) 
              GROUP BY 
                article
            )
                      , 
            article_level as materialized (
              select 
                article, 
                c.reserve_quantity,
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
                left join reserved_units c using(article)
            ) 
            , 
            filter_allocations_2 AS materialized (
              select 
                allocation_code, 
                store, 
                store_name, 
                article, 
                sum(allocated_total) allocated_total 
              from 
                filter_allocations a 
              group by 
                1, 
                2, 
                3, 
                4
            ),
            store_level AS materialized (
              select 
                a.store, 
                a.store_name, 
                SUM(coalesce(a.allocated_total, 0)) AS allocated_total, 
                COUNT(DISTINCT a.article) AS style_count, 
                COUNT(DISTINCT a.allocation_code) AS allocation_count, 
                SUM(b.dc_net_available_inventory) - AVG(coalesce(b.reserve_quantity,0)) as dc_net_available_inventory
              FROM 
                filter_allocations_2 a 
                left join article_level b using(article)
              group by 
                1, 
                2
            ) 
            SELECT 
              a.store,
              a.store_name, 
              a.allocated_total, 
              a.style_count, 
              a.allocation_count, 
              a.dc_net_available_inventory
            FROM 
              store_level a
            ORDER BY a.store_name
    $$, _query_pa, _query_sa, _query_cus, _timezone);
    
    raise notice '%', _query_combine; 
    OPEN $1 FOR execute _query_combine;  
    perform global.sp_log(v_gen_random_uuid, 'inventory_smart.order_batching_summary_store', 'Before returning function value',_query_combine,jsonb_build_object('product filters str',$2,'store filters str',$3,'other filters str',$4));     
    RETURN $1;
    end
$function$
;

