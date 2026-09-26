--liquibase formatted sql
--changeset swapnil.bhange-4:sync_alerts_product_store_level_v4 runOnChange:true stripComments:false splitStatements:false context:ASync_Procedures labels:0004
--comment: added new column for sync_alerts_product_store_level
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_alerts_product_store_level();
DROP PROCEDURE IF EXISTS public.sync_alerts_product_store_level(IN _is_historic boolean);
CREATE OR REPLACE PROCEDURE public.sync_alerts_product_store_level(IN _is_historic boolean DEFAULT false)
 LANGUAGE plpgsql
AS $procedure$
declare _worker text;
_st TIMESTAMP := clock_timestamp();
begin if _is_historic
    then
select
    async_query into _worker
from public.async_query('DELETE FROM inventory_smart.alerts_product_store_level WHERE TRUE;');
perform public.async_query_status(_worker, 'cleanup');
raise notice 'Step1: %',
(clock_timestamp() - _st);
end if;
perform public.parellel_insert(
    ' WITH rows AS (
        insert into inventory_smart.alerts_product_store_level (
            primary_sku,
            store_code,
            l0_code,
            l0_name,
            l1_name,
            l3_name,
            l4_name,
            product_description,
            article,
            set_week,
            store_attribute,
            store_group_description,
            store_name,
            state,
            psme_rule_code,
            rule_code_store_code,
            psme_exception_start_date,
            psme_exception_end_date,
            psme_created_at,
            psme_updated_at,
            psme_created_by,
            psme_updated_by,
            product_store_mapping_exceptions
           )
            SELECT 
			primary_sku,
            store_code,
            l0_code,
            l0_name,
            l1_name,
            l3_name,
            l4_name,
            product_description,
            article,
            set_week,
            store_attribute,
            store_group_description,
            store_name,
            state,
            psme_rule_code,
            rule_code_store_code,
            psme_exception_start_date,
            psme_exception_end_date,
            psme_created_at,
            psme_updated_at,
            psme_created_by,
            psme_updated_by,
            product_store_mapping_exceptions
            from public.alerts_product_store_level
            {where} RETURNING 1
)
        SELECT 
		  count(1) as cnt 
		FROM 
		  rows;',
    50,
    'public.alerts_product_store_level',
    'article',
    'ex_article_idx',
    50
);
raise notice 'Step2: %',
(clock_timestamp() - _st);
end;
$procedure$
;
