--liquibase formatted sql
--changeset swapnil.bhange-10:sync_create_alerts_product_store_level_v10 runOnChange:true stripComments:false splitStatements:false context:ASync_Procedures labels:0010
--comment: added truncate part in SP for alerts_product_store_level_v10
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_create_alerts_product_store_level();
CREATE OR REPLACE PROCEDURE public.sync_create_alerts_product_store_level(IN _is_historic boolean DEFAULT false)
 LANGUAGE plpgsql
AS $procedure$
declare _worker text;
_st TIMESTAMP := clock_timestamp();
begin if _is_historic
    then
select
    async_query into _worker
from public.async_query('Truncate inventory_smart.alerts_product_store_level;');
perform public.async_query_status(_worker, 'cleanup');
raise notice 'Step1: %',
(clock_timestamp() - _st);
end if;
perform public.parellel_insert(
    ' WITH rows AS (
INSERT INTO inventory_smart.alerts_product_store_level (
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
            DISTINCT
            rpmpsr.rcl_dimension ->>''primary_sku'' as primary_sku,
            rpmpse.store_code, 
            paf.l0_code, 
            paf.l0_name,
            paf.l1_name,
            paf.l3_name,
            paf.l4_name,
            paf.product_description,
            rpmpsr.rcl_dimension ->>''article'' as article,
            paf.set_date as set_week,
            saf.store_attribute,
            psaf.store_group_description,
            saf.store_name,
            saf.state,
            rpmpse.rule_code as psme_rule_code,
            CONCAT(rule_code,''_'',rpmpse.store_code) as rule_code_store_code,
            lower(rpmpse.validity) as psme_exception_start_date,
            upper(rpmpse.validity) as psme_exception_end_date,
            rpmpse.created_at as psme_created_at,
            rpmpse.updated_at as psme_updated_at,
            rpmpse.created_by as psme_created_by,
            rpmpse.updated_by as psme_updated_by,
            1 as product_store_mapping_exceptions
            from "global".rcl_product_mapping_product_store_exceptions rpmpse
            join "global".rcl_product_mapping_product_store_rule rpmpsr USING(rule_code)
            join "global".store_attributes_filter saf USING(store_code)
            join "global".product_store_attributes_filter psaf on psaf.l0_code = rpmpsr.rcl_dimension ->>''l0_code'' and psaf.store_code = rpmpse.store_code 
            join "global".plan_info pi2 on pi2.l0_code = rpmpsr.rcl_dimension ->>''l0_code''
            join "global".product_attributes_filter paf on paf.article = rpmpsr.rcl_dimension ->> ''article''
            {where} AND UPPER(validity) between CURRENT_DATE and CURRENT_DATE + 14
            and CURRENT_DATE between pi2.plan_start_date and pi2.plan_end_date 
            RETURNING 1
)
        SELECT 
		  count(1) as cnt 
		FROM 
		  rows;',
    50,
    'global.rcl_product_mapping_product_store_exceptions',
    'rule_code',
    NULL,
    50
);
raise notice 'Step2: %',
(clock_timestamp() - _st);
end;
$procedure$
;