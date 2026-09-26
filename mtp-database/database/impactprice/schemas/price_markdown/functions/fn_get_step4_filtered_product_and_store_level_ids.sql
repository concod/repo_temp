--liquibase formatted sql
--changeset sidharth.harish@impactanalytics.co:fn_get_step4_filtered_product_and_store_level_ids-3 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: filtering logic change for approval status filter

DROP FUNCTION if exists price_markdown.fn_get_step4_filtered_product_and_store_level_ids;
CREATE OR REPLACE FUNCTION price_markdown.fn_get_step4_filtered_product_and_store_level_ids(
    in_refcursor refcursor,
    in_strategy_id integer,
    in_pcd_ids integer[],
    in_pcd_metrics_filter jsonb DEFAULT NULL::jsonb,
    in_approval_filter text[] default null::text[],
    in_filters jsonb DEFAULT NULL::jsonb,
    in_copy_data boolean DEFAULT false
)
 RETURNS table(
    product_level_id int,
    store_level_id int
 )
 LANGUAGE plpgsql
AS $function$
    begin
        return query (
            with pcd_mapping_cte as (
                select
                    array_agg(tsp.pcd_id) as pcd_id,
                    array_agg(next_pcd.pcd_id)  as next_pcd_id,
                    array_agg(previous_pcd.pcd_id) as previous_pcd_id
                from price_markdown.tb_strategy_pcd_new tsp
                left  join (
                    select pcd_id,pcd_start_date from price_markdown.tb_strategy_pcd_new where strategy_id = in_strategy_id
                ) next_pcd
                on tsp.pcd_end_date = next_pcd.pcd_start_date - interval '1 day'
                left join (
                    select pcd_id, pcd_end_date from price_markdown.tb_strategy_pcd_new where strategy_id =in_strategy_id

                ) previous_pcd
                on tsp.pcd_start_date = previous_pcd.pcd_end_date + interval '1 day'
                where tsp.strategy_id = in_strategy_id
                and tsp.pcd_id = any(in_pcd_ids)
            )
            select
                s.product_level_id,
                s.store_level_id
            from
                price_markdown.fn_get_step4data_default_load_with_copy(
                    in_refcursor,
                    in_strategy_id,
                    44,
                    (
                        select pcd_id || next_pcd_id || previous_pcd_id
                        from  pcd_mapping_cte
                    ),
                    0,
                    0,
                    1,
                    1000000000,
                    1,
                    0,
                    in_pcd_metrics_filter,
                    in_approval_filter,
                    in_filters,
                    null,
                    null,
                    null,
                    in_copy_data
                ) s
        );
    end;
$function$
;
