--liquibase formatted sql
--changeset shaik.azmathulla@impactanalytics.co:sync_dc_review_recommendation_v3 runOnChange:true stripComments:false splitStatements:false context:VS_inv_smart labels:sync_dc_review_recommendation_v2
--comment: optimized the sync_dc_review_recommendation sp
--rollback: SELECT 1
DROP procedure IF EXISTS public.sync_dc_review_recommendation();
CREATE OR REPLACE PROCEDURE public.sync_dc_review_recommendation()
LANGUAGE 'plpgsql'
AS $procedure$
declare 
    _worker text;
    _log_code varchar := gen_random_uuid();
    _sp_name varchar := 'public.sync_dc_review_recommendation';
    _log_step varchar;
    _st TIMESTAMP := clock_timestamp();
begin
    
    CALL global.data_ingestion_logs(_log_code, _sp_name, 'start', null,  (clock_timestamp() - _st)::text, null);
    PERFORM set_config('local.log_code', _log_code, true);
    PERFORM set_config('local.sp_name', _sp_name, true);
    drop table if exists dc_excess_deficit_tag_temp;
    drop table if exists dc_review_recommendation_temp;
    BEGIN

        _log_step := 'truncate table';
        PERFORM set_config('local.log_step', _log_step, true);
        
        SELECT async_query INTO _worker FROM public.async_query('truncate table inventory_smart.dc_review_recommendation ;');
        PERFORM public.async_query_status(_worker, 'cleanup');
        CALL global.data_ingestion_logs(_log_code, _sp_name, _log_step, null, (clock_timestamp() - _st)::text, null);

        _log_step := 'delta calculation';
        PERFORM set_config('local.log_step', _log_step, true);
        
          create temp table dc_excess_deficit_tag_temp as 
          select product_code from inventory_smart.dc_excess_deficit_tag
          where upper(tag) <> 'AT LEVEL'
          group by 1 
          having count(distinct tag) = 2  order by product_code ;
          
        CALL global.data_ingestion_logs(_log_code, _sp_name, _log_step, null, (clock_timestamp() - _st)::text, null);

        _log_step := 'insert';
        PERFORM set_config('local.log_step', _log_step, true);
        

            INSERT INTO inventory_smart.dc_review_recommendation(article,product_code,source_dc,destination_dc,excess_units,deficit_units,ia_reco_transfer,source_dc_demand_projection,destination_dc_demand_projection,recommendation_flag)
            WITH base as (
              select * from inventory_smart.dc_excess_deficit_tag a
              where exists (select 1 from dc_excess_deficit_tag_temp b where a.product_code = b.product_code) 
            )   
            ,excess_cte as
            (
              select product_code, dc_code as source_dc, deficit_excess_units as excess_units,total_allocations as source_dc_demand_projection
              from base where upper(tag) = 'EXCESS'
            )   
            ,deficit_cte as (
              select product_code, dc_code as destination_dc, abs(deficit_excess_units) as deficit_units,total_allocations as destination_dc_demand_projection
              from base where upper(tag) = 'DEFICIT'
            )   
            ,min_transfer_consts as(
              SELECT 
                "hierarchy"->>'product_code'::varchar as product_code,
                "hierarchy"->>'article'::varchar as article,
                source_dc::int4 as source_dc, 
                destination_dc::int4 as destination_dc, 
                min_transfer_quantity
              from inventory_smart.dc_transfer_constraints dtc
            )   
            ,recommended as 
            (
                select *, 1 as  recommendation_flag,
                round(least(deficit_units,excess_units)) as ia_reco_transfer
                from excess_cte
                join deficit_cte using(product_code)
                left join min_transfer_consts using(product_code,source_dc,destination_dc)
                where least(deficit_units,excess_units) > coalesce(min_transfer_quantity,10)
            )
            ,final_base as 
            (select 
                a1.article,product_code, source_dc, destination_dc, coalesce(excess_units,0) as excess_units,
                coalesce(deficit_units,0) as deficit_units,coalesce(ia_reco_transfer,0) as ia_reco_transfer,
                ROUND(coalesce(source_dc_demand_projection,0)::numeric,2) as source_dc_demand_projection,   
                ROUND(coalesce(destination_dc_demand_projection,0)::numeric,2) as destination_dc_demand_projection,
                coalesce(recommendation_flag,0) as recommendation_flag
            from min_transfer_consts as a1
            left join recommended b1
            using(product_code,source_dc,destination_dc))
    
            select * from final_base 
            where not (product_code in (select distinct product_code from recommended) and recommendation_flag=0)
            on conflict do nothing ;

        CALL global.data_ingestion_logs(_log_code, _sp_name, _log_step, null, (clock_timestamp() - _st)::text, null);

        _log_step := 'update delta calculation';
        PERFORM set_config('local.log_step', _log_step, true);

        CREATE TEMP TABLE dc_review_recommendation_temp AS 
        SELECT rec.product_code, rec.source_dc,rec.destination_dc,
                CASE
                  WHEN ROUND(rec.ia_reco_transfer::NUMERIC / paf.inner_pack_units) * paf.inner_pack_units <= 
                       (dtda.oh - COALESCE(sdru.quantity, 0) - COALESCE(sda.quantity, 0))
                  THEN ROUND(rec.ia_reco_transfer::NUMERIC / paf.inner_pack_units) * paf.inner_pack_units
                  ELSE FLOOR(rec.ia_reco_transfer::NUMERIC / paf.inner_pack_units) * paf.inner_pack_units
                END AS adjusted_transfer_qty
        FROM (SELECT product_code, source_dc,destination_dc,ia_reco_transfer,article
                FROM inventory_smart.dc_review_recommendation where recommendation_flag = 1
                ) rec
        JOIN global.product_attributes_filter paf ON rec.product_code = paf.product_code
        LEFT JOIN inventory_smart.dc_to_dc_available_units dtda ON rec.article = dtda.article AND paf.size = dtda.size AND rec.source_dc = dtda.dc_code
        LEFT JOIN ( SELECT article, size, dc_code, SUM(quantity) AS quantity
                        FROM inventory_smart.sku_dc_reserved_units
                        WHERE type <> 'D'
                        GROUP BY article, size, dc_code
                     ) sdru ON rec.article = sdru.article AND paf.size = sdru.size AND rec.source_dc = sdru.dc_code
        LEFT JOIN (select article, size, dc_code, SUM(quantity) as quantity from inventory_smart.sku_dc_allocated_units GROUP BY article, size, dc_code) sda ON rec.article = sda.article AND paf.size = sda.size AND rec.source_dc = sda.dc_code ; 

        CREATE INDEX idx_dc_review_recommendation_temp on dc_review_recommendation_temp (product_code,source_dc,destination_dc) ;
            
        CALL global.data_ingestion_logs(_log_code, _sp_name, _log_step, null, (clock_timestamp() - _st)::text, null);
        
        _log_step := 'update';
        PERFORM set_config('local.log_step', _log_step, true);
    
        UPDATE inventory_smart.dc_review_recommendation AS dcrr
        SET ia_reco_transfer = ru.adjusted_transfer_qty
        FROM dc_review_recommendation_temp as ru
        where dcrr.product_code = ru.product_code
              AND dcrr.source_dc = ru.source_dc
              AND dcrr.destination_dc = ru.destination_dc ;
              
        CALL global.data_ingestion_logs(_log_code, _sp_name, _log_step, null, (clock_timestamp() - _st)::text, null);
        
    EXCEPTION
    
        WHEN OTHERS THEN
            -- Log the error if an exception occurs during any part of the procedure
            CALL global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            RAISE EXCEPTION 'Error occurred in the procedure: %', SQLERRM;
    END;
    
       CALL global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
   
 END  ;   
$procedure$;