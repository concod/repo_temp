--liquibase formatted sql
--changeset swapnil.bhange-5:sync_article_inventory_dashboard_v5 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:aid-6
--comment: removed security definer in sync_article_inventory_dashboard sp 
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_article_inventory_dashboard(IN _is_historic boolean);

DROP PROCEDURE IF EXISTS public.sync_article_inventory_dashboard();

CREATE OR REPLACE PROCEDURE public.sync_article_inventory_dashboard(IN _is_historic boolean DEFAULT false) 
LANGUAGE plpgsql 
AS $procedure$
declare _worker text;
_st TIMESTAMP := clock_timestamp();

begin if _is_historic
    then
select
    async_query into _worker
from public.async_query('DELETE FROM inventory_smart.article_inventory_dashboard WHERE TRUE;');

perform public.async_query_status(_worker, 'cleanup');

raise notice 'Step1: %',
(clock_timestamp() - _st);

end if;

perform public.parellel_insert(
    ' WITH rows AS (
        insert into inventory_smart.article_inventory_dashboard (
             article
            ,primary_sku
            ,product_description
            ,l0_code
            ,l0_name
            ,l1_name
            ,l3_name
            ,l4_name
            ,price_point
            ,oh
            ,it
            ,oo
            ,total_inv
            ,dc_oh
            ,lw_revenue
            ,promo_percentage
            ,excess
            ,normal
            ,shortfall
            ,stockout
            ,last_allocated
            ,std_actual_st_percentage
            ,lw_margin
            ,lw_qty
           )
           SELECT
            article
           ,primary_sku
           ,product_description
           ,l0_code
           ,l0_name
           ,l1_name
           ,l3_name
           ,l4_name
           ,price_point
           ,oh
           ,it
           ,oo
           ,total_inv
           ,dc_oh
           ,lw_revenue
           ,promo_percentage
           ,excess
           ,normal
           ,shortfall
           ,stockout
           ,last_allocated
           ,std_actual_st_percentage
           ,lw_margin
           ,lw_qty
           FROM public.article_inventory_dashboard {where} RETURNING 1
           )
        SELECT 
		  count(1) as cnt 
		FROM 
		  rows;',
    50,
    'public.article_inventory_dashboard',
    'l4_name',
    'inv_kpi_l4_idx'
);
raise notice 'Step2: %',
(clock_timestamp() - _st);

end;
$procedure$;


