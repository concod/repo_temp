--liquibase formatted sql
--changeset navya.modepalli@impactanalytics.co:sync_engagement_dashboard_v1 runOnChange:true stripComments:false splitStatements:false context:Ralph_Lauren_InventorySmart labels:MTP-04
--comment: sync_engagement_dashboard index update
--rollback: SELECT 1
DROP procedure IF EXISTS public.sync_engagement_dashboard();
CREATE OR REPLACE PROCEDURE public.sync_engagement_dashboard(IN _is_historic boolean DEFAULT true)
LANGUAGE plpgsql
AS $procedure$
declare
        _worker text;
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_engagement_dashboard';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
    begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
        if _is_historic then
            select async_query into _worker from public.async_query('delete from inventory_smart.engagement_dashboard where true;');
            perform public.async_query_status(_worker, 'cleanup');
            raise notice 'Step1: %', (clock_timestamp() - _st);
            
        end if;
           select async_query into _worker from public.async_query('drop table if exists public.carfg_temp;');
            perform public.async_query_status(_worker, 'cleanup');
           raise notice 'Step2: %', (clock_timestamp() - _st);
           SELECT async_query INTO _worker FROM public.async_query('create table if not exists public.carfg_temp as 
           SELECT
           article,
           store,
           allocation_code,
           allocated_total,
           retail_size_cd,
            auto_allocation_run_flag,
            is_edited,
           updated_at:: date as updated_at,
           status,
            case when min - oh_oo_intransit > 0 then  min - oh_oo_intransit else 0 end as min_short,
           coalesce(pack_dc_allocation_original::text,pack_dc_allocation::text)::json AS pack_dc_allocation_original
       FROM
           inventory_smart.create_allocation_result_flat_gurobi car
           WHERE created_at >= now() - interval ''3'' month AND created_at <= now()
            AND status = 2 AND EXISTS (
        SELECT 1
        FROM inventory_smart.plan_attributes pm
        WHERE pm.attribute_name = ''parent_allocation''
          AND pm.attribute_value IS NOT NULL
          AND pm.plan_code = car.allocation_code
    );' );
       PERFORM public.async_query_status(_worker, 'cleanup');
       raise notice 'Step3: %', (clock_timestamp() - _st);
       select async_query into _worker from public.async_query('create index if not exists carf_temp_idx on public.carfg_temp (updated_at, status);');
            perform public.async_query_status(_worker, 'cleanup');
        raise notice 'Step4: %', (clock_timestamp() - _st);
        perform public.parellel_insert('WITH rows AS (
          insert into inventory_smart.engagement_dashboard (
                brand,
                channel,
                updated_at,
                updated_by_username,
                num_allocations,
                num_style_colors,
                num_skus,
                sku_store,              
                absolute_edit_delta,
                num_auto_allocations,
                num_manual_allocations,
                num_edited_auto_allocations,
                num_edited_manual_allocations,
                original_allocated_quantity,
                final_allocated_quantity,
                original_auto_allocated_quantity,
                final_auto_allocated_quantity,
                original_manual_allocated_quantity,
                final_manual_allocated_quantity,
                min_allocated,
                wos_allocated_quantity
            )
            with carfg as(
with
flat_table AS (
    SELECT
        article,
        store,
        allocation_code,
        retail_size_cd,
        allocated_total,
        auto_allocation_run_flag,
        is_edited,
        min_short,
        js.key AS dc_code,
        UNNEST(ARRAY(
            SELECT json_array_elements_text(js.value->''packs_allocated'')::text
        )) AS pack_type_id,
        UNNEST(ARRAY(
            SELECT json_array_elements_text(js.value->''packs_allocated_qty'')::numeric
        )) AS allocated_total_orig,
        UNNEST(ARRAY(
            SELECT json_array_elements_text(js.value->''packs_available_qty'')::numeric
        )) AS available_qty
    FROM (
        SELECT
            article,
            store,
            allocation_code,
            allocated_total,
            retail_size_cd,
            auto_allocation_run_flag,
            is_edited,
            min_short,
            pack_dc_allocation_original AS pack_dc_allocation_original
        FROM
            public.carfg_temp {where}
--            and updated_at >= current_date - interval ''3'' month
            and status = 2
    ) foo,
    JSON_EACH(pack_dc_allocation_original) js
)
select distinct * from flat_table
where retail_size_cd = pack_type_id
),
saf as (select distinct store_code,channel from global.store_attributes_filter),
pm as (select distinct plan_code,updated_at,updated_by from inventory_smart.plan_master {where}
--updated_at >= now() - interval ''3'' month
and status = 3)
SELECT
    ''Ralph Lauren North America'' as brand,
    saf.channel,
    pm.updated_at::DATE,
    um.email updated_by_username,
    COUNT(DISTINCT allocation_code) AS num_allocations,
    COUNT(DISTINCT article) AS num_style_colors,
    COUNT(DISTINCT CONCAT(article, retail_size_cd)) AS num_skus,
    COUNT(DISTINCT CONCAT(article, retail_size_cd, store)) AS sku_store,  
    SUM(ABS(COALESCE(allocated_total_orig, 0) - COALESCE(allocated_total, 0)))::INT8 AS absolute_edit_delta,
    COUNT(
        DISTINCT CASE
            WHEN auto_allocation_run_flag IS NOT NULL THEN allocation_code
        END
    ) AS num_auto_allocations,
    COUNT(
        DISTINCT CASE
            WHEN auto_allocation_run_flag IS NULL THEN allocation_code
        END
    ) AS num_manual_allocations,
    COUNT(
        DISTINCT CASE
            WHEN auto_allocation_run_flag IS NOT NULL
                 AND is_edited = TRUE THEN allocation_code
        END
    ) AS num_edited_auto_allocations,
    COUNT(
        DISTINCT CASE
            WHEN auto_allocation_run_flag IS NULL
                 AND is_edited = TRUE THEN allocation_code
        END
    ) AS num_edited_manual_allocations,
    SUM(COALESCE(allocated_total_orig, 0))::INT8 AS original_allocated_quantity,
    SUM(allocated_total)::INT8 AS final_allocated_quantity,
    COALESCE(
        SUM(
            CASE
                WHEN auto_allocation_run_flag IS NOT NULL THEN COALESCE(allocated_total_orig, 0)
            END
        )::INT8, 0
    ) AS original_auto_allocated_quantity,
    COALESCE(
        SUM(
            CASE
                WHEN auto_allocation_run_flag IS NOT NULL THEN allocated_total
            END
        )::INT8, 0
    ) AS final_auto_allocated_quantity,
    COALESCE(
        SUM(
            CASE
                WHEN auto_allocation_run_flag IS NULL THEN COALESCE(allocated_total_orig, 0)
            END
        )::INT8, 0
    ) AS original_manual_allocated_quantity,
    COALESCE(
        SUM(
            CASE
                WHEN auto_allocation_run_flag IS NULL THEN allocated_total
            END
        )::INT8, 0
    ) AS final_manual_allocated_quantity,
    SUM(
        CASE
            WHEN allocated_total >= min_short THEN min_short
            ELSE allocated_total
        END
    )::INT8 AS min_allocated,
    SUM(
        allocated_total - CASE
            WHEN allocated_total >= min_short THEN min_short
            ELSE allocated_total
        END
    )::INT8 AS wos_allocated_quantity
from carfg
join  saf on saf.store_code = carfg.store
join  pm on plan_code = allocation_code
join global.user_master um on um.user_code = pm.updated_by
where email <> ''ia_system@impactanalytics.co''
group by 1,2,3,4
on conflict(channel,updated_at,updated_by_username) do nothing RETURNING 1
        )
        SELECT
          count(1) as cnt
        FROM
          rows;', 10, 'public.carfg_temp', 'updated_at::date', null , 1);
        raise notice 'Step5: %', (clock_timestamp() - _st);
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
    end
$procedure$
;