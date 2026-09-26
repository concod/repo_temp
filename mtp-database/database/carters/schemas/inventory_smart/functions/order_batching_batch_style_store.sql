--liquibase formatted sql
--changeset liquibase:order_batching_batch_style_store runOnChange:true stripComments:false splitStatements:false
--comment: Create order batching batch data at style-store level
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.order_batching_batch_style_store(input, jsonb, jsonb, jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.order_batching_batch_style_store(input refcursor, jsonb, jsonb, jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
 /*
  * Function/Procedure name: inventory_smart.order_batching_batch_style_store
  * Created by: Mithun R
  * Created at: 2025-02-04
  * No of input parameter: 4
  * Parameter Description : $1 = cursor
  *                        $2 = product filters str
  *                        $3 = store filters str
  *                        $4 = custom filter str
  */
declare
    _query_combine text;
    _query_pa      text:='';
    _query_sa      text:='';
    _query_cus     text:='';
    begin
    _query_pa  := inventory_smart.form_main_table_filters('product_attributes_filter', $2);
    _query_sa  := inventory_smart.form_main_table_filters('store_attributes_filter', $3);
    _query_cus := inventory_smart.form_main_table_filters('', $4);
        _query_combine = '
           CREATE TEMP TABLE product_filters on commit drop AS (
                SELECT
                    style,
                    article,
                    l0_name,
                    l2_id,
                    l3_id,
                    l4_id
                FROM
                global.product_attributes_filter ' || _query_pa || '
                GROUP BY 1, 2, 3, 4, 5, 6
            );

            CREATE TEMP table store_filters on commit drop AS (
                SELECT store_code, store_capacity FROM
                global.store_attributes_filter  ' || _query_sa || '
            );

            CREATE TEMP TABLE plan_master on commit drop AS (
                SELECT
                    plan_code,
                    plan_code as allocation_name,
                    created_at,
                    type as plan_type
                FROM
                    inventory_smart.plan_master
                    where status in (2)
                    and type in (0, 2, 4, 5, 12)
                    AND is_deleted = false
            );

            CREATE TEMP TABLE filter_allocations on commit drop as (
                select * from (
                    select
                        carfg.store,
                        carfg.store_name,
                        carfg.store_grade,
                        carfg.allocated_total,
                        carfg.min,
                        carfg.allocation_code,
                        carfg.article,
                        carfg.delivery_dt,
                        carfg.order_priority,
                        carfg.created_at,
                        carfg.created_by,
                        paf.style,
                        CASE
                          WHEN plan_type in (0, 4, 5) THEN ''Manual''
                          ELSE ''Auto''
                        END
                        AS allocation_type,
                        plm.allocation_name
                    from inventory_smart.create_allocation_result_flat_gurobi AS carfg
                    INNER JOIN store_filters saf ON saf.store_code = carfg.store
                    INNER JOIN product_filters paf ON paf.article = carfg.article
                    inner join plan_master plm on plm.plan_code = carfg.allocation_code
                    WHERE EXISTS(SELECT 1 FROM store_filters saf WHERE saf.store_code = carfg.store)
                    AND plm.created_at >= (Date(now() AT TIME ZONE ''America/New_York'' - interval ''30 day'')::timestamp)
                    AND plm.created_at <= (date(now() AT TIME ZONE ''America/New_York'' + interval ''1 day'')::timestamp)
                    and allocation_code is not null
                ) a ' || _query_cus || '
            );

            CREATE TEMP TABLE capacity on commit drop as (
                select
                    sci.store_code,
                    coalesce(saf.store_capacity,0) as store_capacity,
                    case when coalesce(saf.store_capacity,0)>0 then (
                        sci.total_inv/saf.store_capacity
                    ) else 0 end as store_to_perc_cap
                from inventory_smart.store_current_inventory sci
                left join store_filters saf using(store_code)
            );';

        execute _query_combine;

        _query_combine := 'select
            a.store,
            a.store_name,
            a.store_grade,
            a.style,
            a.article,
            SUM(a.min) as min,
            SUM(a.allocated_total) as allocated_total,
            AVG(c.store_capacity) as store_capacity,
            AVG(c.store_to_perc_cap) as store_to_perc_cap,
            a.delivery_dt,
            a.allocation_code,
            json_build_object(''label'', a.order_priority::text, ''value'', a.order_priority::text) order_priority,
            a.created_at,
            um.user_name created_by,
            a.allocation_type
        from
            filter_allocations a
        left join capacity c on a.store=c.store_code
        LEFT JOIN global.user_master um ON um.user_code = a.created_by
        group by
            a.store,
            a.store_name,
            a.store_grade,
            a.style,
            a.article,
            a.delivery_dt,
            a.allocation_code,
            a.order_priority,
            a.created_at,
            um.user_name,
            a.allocation_type
        order by
            a.store,
            a.style;';

        raise notice '%', _query_combine;
        OPEN $1 FOR execute _query_combine;
        RETURN $1;
    end
$function$;