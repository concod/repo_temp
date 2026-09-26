--liquibase formatted sql
--changeset liquibase:vamsi.balaga@impactanalytics.co:fn_update_fetch_time_estimate_table runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for price_markdown.fn_update_fetch_time_estimate_table


drop function if exists price_markdown.fn_update_fetch_time_estimate_table;
CREATE OR REPLACE FUNCTION price_markdown.fn_update_fetch_time_estimate_table(
)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
    begin
    drop table if exists price_markdown.step4_fetch_time_estimate;
    create table if not exists price_markdown.step4_fetch_time_estimate as
    select
        product_recommendation_level,
        store_recommendation_level,
        sku,
        store,
        pcd,
        PERCENTILE_CONT(0.5) within group (
            order by time_estimate_sec
        ) as time_estimate_sec
    from price_markdown.step4_fetch_time_estimate_collection irte
    group by
        product_recommendation_level, store_recommendation_level, sku, store, pcd;
    end;
$function$
;
