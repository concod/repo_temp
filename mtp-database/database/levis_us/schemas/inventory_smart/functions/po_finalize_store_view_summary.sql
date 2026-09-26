--liquibase formatted sql
--changeset liquibase:po_finalize_store_view_summary_v4 using function and partition in carfs alloc code fixes runOnChange:true stripComments:false splitStatements:false context:MTP-98324 labels:MTP-98324
--comment: MTP-98324 using function and partition in carfs alloc code fixes
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.po_finalize_store_view_summary(refcursor, varchar, varchar, varchar, varchar);
CREATE OR REPLACE FUNCTION inventory_smart.po_finalize_store_view_summary(input refcursor, character varying, character varying, character varying, character varying)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
/* 
 * Function/Procedure name: inventory_smart.po_finalize_store_view_summary
 * Created by: Manohara Gulla
 * Created at: 30-July-2024
 * No of input parameter: 5
 * Parameter Description : $1 = Application name
 *                         $2 = Allocation Code
 *                         $3 = Ignore allocation code
 *						   $4 = article filter
 *						   $5 = type
 * Purpose: 
 * This function is created to calculate Store View Allocation Summary which is displayed in the 
 * Finalize screen of Allocate flow
 * Calling Statement:
    begin;
    select * from inventory_smart.po_finalize_store_view_summary
        ('my_cur',
        '6_155_PFS_20230519T071512',
        '',
        '',
        '');
    FETCH ALL IN "my_cur";
    commit;

 * if any modification done in same function/procedure please record the changes in below format
 *
 * Updated_by       Updated_on      Purpose
 * ----------       -----------     --------
 *
 */
    declare
        _query_combine text;
        _article_filter text;
        _final_inv_query text;
        _alloc_code text;
        _query text;
        _pm_date date;
	v_gen_random_uuid text  := gen_random_uuid()::varchar;
    begin
        _query :=  'select date(created_at) from inventory_smart.plan_master where plan_code = %L';
        if $3 = '' then
            _alloc_code := $2;
        else
            _alloc_code := $3;
        end if;
        _query := format(_query, _alloc_code);
        execute _query into _pm_date;
        raise notice 'pm_date: %', _pm_date;

        IF ($4 = '') IS FALSE
        THEN
            _article_filter = format($$AND article IN ('%s')$$, $4);
        END IF;

        IF ($5 = 'allocated')
            THEN
                _final_inv_query := $$
                    ,current_available as (
                        SELECT
                            pack_type,
                            dc_code,
                            COALESCE(SUM(oh), 0) AS oh
                        FROM (
                            SELECT article, size, pack_type_id, dc_code, pack_type FROM packs GROUP BY 1,2,3,4,5
                        ) a
                        LEFT JOIN (
                            SELECT po_code::text AS dc_code, pack_type_id, article, size, oh
                            FROM inventory_smart.sku_po_available_units
                            WHERE (article, po_code) IN (SELECT article, dc_code FROM packs)
                        ) b
                        USING (dc_code, pack_type_id, article, size)
                        GROUP BY 1,2
                    )
                --           select * from current_available;               
                    ,other_allocations_dummy as (
                        SELECT
                            dc_code,
                            pack_type,
                            COALESCE(SUM(allocated_reserve_qty), 0) AS allocated_reserve_qty
                        FROM (
                            SELECT dc_code, article, pack_type_id, size, pack_type, COALESCE(quantity, 0) AS allocated_reserve_qty
                            FROM (
                                SELECT dc_code::text AS dc_code, article, pack_type_id, size, pack_type
                                FROM packs
                                GROUP BY 1,2,3,4,5
                            ) am
                            JOIN (SELECT * FROM inventory_smart.sku_po_allocated_units( $$ || quote_literal('ALLOC_CODE_PLACEHOLDER') || $$ )) b
                            USING (dc_code, article, size, pack_type_id)
                        ) a
                        GROUP BY 1,2
                    )
                --               select * from other_allocations;
                    ,other_allocations as (
                        SELECT * FROM other_allocations_dummy
                        UNION ALL
                        SELECT
                            NULL::text AS dc_code,
                            'packs'    AS pack_type,
                            0          AS allocated_reserve_qty
                        WHERE NOT EXISTS (SELECT * FROM other_allocations_dummy)
                    )
                --           select * from other_allocations;
                    ,final_inv as materialized (
                        SELECT
                            pack_type,
                            dc_code,
                            COALESCE(oh, 0) - COALESCE(allocated_reserve_qty, 0) AS available_qty
                        FROM current_available
                        LEFT JOIN other_allocations USING (dc_code, pack_type)
                    )
        $$;
    ELSE
        _final_inv_query := $$
            ,final_inv as materialized (
                SELECT 
                    pack_type,
                    dc_code,
                    SUM(available_qty) AS available_qty
                FROM (
                    SELECT 
                        article,
                        dc_code,
                        pack_type_id,
                        pack_type,
                        size,
                        SUM(allocated_qty)  AS allocated_qty,
                        AVG(available_qty)  AS available_qty
                    FROM packs
                    GROUP BY 1,2,3,4,5
                ) a
            GROUP BY 1,2
            ) 
            $$;
    END IF;
        -- Replace the placeholder with actual allocation code
        _final_inv_query := replace(_final_inv_query, 'ALLOC_CODE_PLACEHOLDER', _alloc_code);

        _query_combine := format($$
            ------ PO -  store  view - summary  
            WITH base_table as materialized(
                SELECT carfs.article,carfs.allocated_total,  carfs.pack_dc_allocation, store store_code, saf.store_name, carfs.store_grade, carfs.store_cluster, carfs.retail_size_cd size 
                FROM inventory_smart.create_allocation_result_flat_gurobi carfs
                JOIN global.store_attributes_filter saf ON saf.store_code::text = carfs.store::text 
                WHERE allocation_code = '%1$s'
                AND carfs.created_at BETWEEN $$ || quote_literal(_pm_date::timestamp) || $$ AND $$ || quote_literal(_pm_date::timestamp + interval '1 day') || $$
		)
        ,flat_table as (
            SELECT 
                article,
				store_code,
				js.key dc_code, 
				store_grade,
                store_cluster,
                size,
				UNNEST((TRANSLATE((js.value::jsonb->>'packs_allocated')::text, '[]', '{}'))::text[]) pack_type_id,
				UNNEST((TRANSLATE((js.value::jsonb->>'packs_allocated_qty')::text, '[]', '{}'))::numeric[]) allocated_qty,
				UNNEST((TRANSLATE((js.value::jsonb->>'packs_available_qty')::text, '[]', '{}'))::numeric[]) available_qty 
			FROM (SELECT * FROM base_table) foo , JSONB_EACH(pack_dc_allocation) js
		)       
--        select * from flat_table;
        ,packs AS  materialized (
            SELECT 
                article,
                dc_code,
                store_code,
                store_cluster,
                pack_type_id,
                size,
                pack_type,
		        allocated_qty * units_in_pack::double precision AS allocated_qty,
                available_qty * units_in_pack::double precision AS available_qty,
                store_grade
            FROM inventory_smart.dc_pack_configuration dpc  
            JOIN flat_table USING (pack_type_id, article, size)
        )
--            select * from packs;          
        %2$s
        ,dc_allocated as (
            SELECT pack_type as pack_type_allocated, sum(allocated_qty) dc_allocated_qty
            FROM packs 
            GROUP BY pack_type 
        )
--          select * from dc_allocated;
        ,store_grade_allocated as (	
            SELECT 
                store_grade, 
                sum(allocated_qty) store_grade_allocated, 
          		round(coalesce(SUM(allocated_qty) / (SELECT NULLIF(SUM(allocated_qty),0) FROM packs),0)::numeric,2) AS store_grade_allocated_perc
                FROM packs
                GROUP BY store_grade
        )
--          select * from store_grade_allocated;
        ,store_cluster_allocated as(
				select store_cluster, 
          			   sum(allocated_qty) store_cluster_allocated, 
          			   round(coalesce(SUM(allocated_qty) / (SELECT NULLIF(SUM(allocated_qty),0) FROM packs),0)::numeric,2) AS store_cluster_allocated_perc
          		from packs
          		group by store_cluster

         )
--          select * from store_grade_allocated;
        ,cnt_cte as (
            SELECT
                COUNT(distinct article) as art_cnt,
                COUNT(distinct (case when allocated_total > 0 then store_code end)) store_cnt    
            FROM
                base_table
        )
--         select * from cnt_cte;
        ,sales_aggregate as (
            SELECT 
                round(coalesce(sum(lw_qty),0)) as lw_qty,
                round(coalesce(sum(lw_margin),0)) as lw_margin
            FROM (
                SELECT 
                    article,
                    store_code,
                    avg(aid.lw_units) as lw_qty,--avg to consider all sizes
                    avg(aid.lw_margin) as lw_margin
                FROM packs
                LEFT JOIN inventory_smart.article_inventory_dashboard aid USING(article, store_code)
                GROUP BY 1, 2
            ) a
        )     
--        select * from sales_aggregate;
		,second_table as (
            SELECT  
                coalesce (count(DISTINCT store_code) / NULLIF(count(DISTINCT article), 0), 0) as store_avg,
                coalesce (SUM(allocated_qty) / NULLIF(count(DISTINCT store_code), 0),0) as avg_units_per_store
            FROM packs
            WHERE allocated_qty > 0
        )
--        select * from second_table;
        ,constraints_aggregate AS (
            WITH map_po_to_dc AS (
                SELECT DISTINCT
                p.dc_code         AS dc_code_full,
                p.article,
                p.size,
                spu.dc_code       AS dc_code_num
                FROM packs p
                JOIN inventory_smart.sku_po_available_units spu
                ON spu.po_code = p.dc_code
                AND spu.article = p.article
                AND spu.size    = p.size
            ),
            aic_roll AS (
                SELECT
                m.dc_code_full,
                m.article,
                ROUND(COALESCE(MAX(aic.vir_reservation_remaining), 0)) AS vir_reservation_remaining,
                ROUND(COALESCE(MAX(aic.iob_reservation_remaining), 0)) AS iob_reservation_remaining
                FROM map_po_to_dc m
                JOIN inventory_smart.article_inventory_constraint aic
                ON aic.dc_code = m.dc_code_num
                AND aic.article = m.article
                GROUP BY m.dc_code_full, m.article
            )
            SELECT
                dc_code_full AS dc_code,
                SUM(vir_reservation_remaining) AS vir_reservation_remaining,
                SUM(iob_reservation_remaining) AS iob_reservation_remaining
            FROM aic_roll
            GROUP BY dc_code_full
        )
        select
            art_cnt,
            store_cnt,
            ca.dc_code as dc,
            (coalesce (available_qty,0)-dc_allocated_qty) as net_available,  
            lw_qty,
            lw_margin,
            store_grade,
            store_grade_allocated,
            store_grade_allocated_perc,
            (SELECT array_agg(store_cluster ORDER BY store_cluster) FROM store_cluster_allocated) as store_clusters,
            (SELECT array_agg(store_cluster_allocated ORDER BY store_cluster) FROM store_cluster_allocated) as store_cluster_allocated,
            (SELECT array_agg(store_cluster_allocated_perc ORDER BY store_cluster) FROM store_cluster_allocated) as store_cluster_allocated_perc,
            pack_type_allocated,
            dc_allocated_qty,
            store_avg,
            avg_units_per_store,
            ca.vir_reservation_remaining,
            ca.iob_reservation_remaining as iob
        from final_inv fi
        cross join cnt_cte
        cross join sales_aggregate
        cross join store_grade_allocated
        left join dc_allocated da on fi.pack_type = da.pack_type_allocated
        left join constraints_aggregate ca on fi.dc_code = ca.dc_code
        cross join second_table
       $$, $2, _final_inv_query);
      raise notice '%', _query_combine;
	  OPEN $1 FOR execute _query_combine;  
      perform  global.sp_log(v_gen_random_uuid, 'inventory_smart.po_finalize_store_view_summary', 'Before returning function value',_query_combine,jsonb_build_object('allocation_code',$2,'Ignore allocation codes',$3,'article filter',$4,'type',$5)) ;		
	  RETURN $1;
    end
$function$
;
