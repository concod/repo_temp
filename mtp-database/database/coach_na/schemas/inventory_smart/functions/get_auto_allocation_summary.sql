--liquibase formatted sql
--changeset aiyush.prasad@impactanalytics.co:get_auto_allocation_summary runOnChange:true stripComments:false splitStatements:false context:MTP-97949 labels:MTP-97949
--comment: MTP-97949 - Add function to get auto allocation summary
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.get_auto_allocation_summary();

CREATE OR REPLACE FUNCTION inventory_smart.get_auto_allocation_summary()
RETURNS TABLE (
    completion_time TIMESTAMP WITH TIME ZONE,
    channel VARCHAR(255),
    status VARCHAR(50),
    style_color_id_count INTEGER
) LANGUAGE plpgsql
AS $function$
DECLARE
    v_gen_random_uuid text := gen_random_uuid()::varchar;
BEGIN
    RETURN QUERY
    with plan_master as (
        select
            plan_code,
            case
                when type = 2
                    and inventory_smart.plan_master.status = 1 then 'Success - Non Finalised'
                    when inventory_smart.plan_master.status = 3 then 'Success - Finalized'
                    else null
                end as status
            from
                inventory_smart.plan_master
            where
                cast (To_char (created_at at time zone 'America/New_York',
                'YYYY-MM-DD') as date) = Date(now() at TIME zone 'America/New_York')
                    and type = 2
                    and not is_deleted
        )
    , gurobi_table as (
        select carfg.article,carfg.allocation_code, pm.status
        from inventory_smart.create_allocation_result_flat_gurobi as carfg
        join plan_master pm on
            pm.plan_code = carfg.allocation_code
        where
            cast (
                To_char (
                    created_at at TIME zone 'America/New_York',
                    'YYYY-MM-DD'
                ) as date
            ) = Date(now() at TIME zone 'America/New_York')
        group by 1,2,3
    )
    , product_filters as (
        select
            b.article,
            b.l1_name
        from
            global.product_attributes_filter b
        group by 1,2
    )
    , failed_allocations_articles as (
        SELECT article
        FROM (
            SELECT unnest(article_list) AS article
            FROM inventory_smart.auto_allocation_input
        ) a
        WHERE NOT EXISTS (
            SELECT 1
            FROM gurobi_table g
            WHERE g.article = a.article
        )
        GROUP BY article
    )
    select (now() at TIME zone 'America/New_York')::timestamp with time zone as completion_time,
    paf.l1_name as Channel ,(base.status::varchar(50)) as status, (count(distinct article)::integer) as style_color_id_count
    from (
        select
            case when a.article is null then 'Failed' else a.status end::varchar(50) as status,
            coalesce(a.article, b.article) as article
        from gurobi_table a
        full outer join failed_allocations_articles b on a.article = b.article
    ) base
    join product_filters paf using(article)
    group by 1,2,3;
    perform  global.sp_log(v_gen_random_uuid, 'inventory_smart.get_auto_allocation_summary', 'Before returning function value', 'Function completed successfully', jsonb_build_object('completion_time', (now() at TIME zone 'America/New_York')::timestamp with time zone, 'status', 'Success'::varchar(50), 'choice_count', 0::integer));
    return;
END;
$function$;

