--liquibase formatted sql
--changeset liquibase:finalize_product_view_summary runOnChange:true stripComments:false splitStatements:false context:MTP-64351 labels:MTP-64351
--comment: MTP-70658 po flow
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.po_finalize_product_view_summary(input refcursor, character varying, character varying);
CREATE OR REPLACE FUNCTION inventory_smart.po_finalize_product_view_summary(input refcursor, character varying, character varying, character varying, character varying)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
/* 
   * Function/Procedure name: inventory_smart.product_view_summary
   * Created by: Manohara Gulla
   * Created at: 29-Jan-2025
   * No of input parameter: 5
   * Parameter Description : $1 = Cursor
   *                         $2 = Allocation Code
  *                          $3 = Ignore allocation code
                             $4 = article filter
                             $5 = type
   * Purpose: 
   * This function is created to calculate Product View Allocation Summary which is displayed in the 
   * Finalize screen of Allocate flow
   * Calling Statement:
   *
      begin;
      select * from inventory_smart.finalize_product_view_summary
          ('my_cur',
           '6_155_PFS_20230519T071512',
           '',
          '',
         'allocated');
       FETCH ALL IN "my_cur";
      commit;
   *
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
    v_gen_random_uuid text  := gen_random_uuid()::varchar;
begin
    IF ($5 = 'allocated')
            THEN
                _final_inv_query := $$
		,current_available as (
                    SELECT dc_code::text, article, size, COALESCE(SUM(oh),0) oh
                    FROM (
                        SELECT article, size, dc_code FROM packs GROUP BY 1, 2, 3
                    ) a 
                    LEFT JOIN (
                    SELECT po_code::text as dc_code, article, size, oh  FROM inventory_smart.sku_po_available_units where  (article, po_code) in (SELECT article, dc_code FROM packs)
                    ) b
                    USING(dc_code, article, size)
                    GROUP BY 1, 2, 3
                    ) 
--                    select * from current_available;
                    ,other_allocations as (
                        SELECT dc_code, article, size, SUM(allocated_reserve_qty) as allocated_reserve_qty
                        FROM (
                            SELECT dc_code, article, size, COALESCE(quantity,0) as allocated_reserve_qty
                            FROM (
                                SELECT dc_code::text, article, size FROM packs
                                GROUP BY 1, 2, 3
                            ) am
                            JOIN inventory_smart.sku_po_allocated_units 
                            USING (dc_code, article, size)
                        ) a
                        GROUP BY 1, 2, 3
                    )
--                    select * from other_allocations;
        ,dc_size_level_metrics as (
        -- Combine available, reserve and allocated CTEs
            SELECT dc_code,
                   dc_code as dc_name,
                   size,
                   SUM(allocated_qty) as allocated_qty,
                   SUM(oh) as dc_available,
                   SUM(allocated_reserve_qty) as allocated_reserve_qty
            FROM (
                SELECT size,
                       dc_code,
                       SUM(allocated_qty) as allocated_qty
                FROM packs
                GROUP BY 1, 2
            ) a
            LEFT JOIN current_available USING (size, dc_code)
            LEFT JOIN other_allocations USING (size, dc_code)
            --LEFT JOIN "global".distribution_centres dd USING (dc_code)
            GROUP BY 1, 2, 3
        )
--        select * from dc_size_level_metrics;
        ,net_available as (
        -- Net avail. = dc_available - (current_allocated + allocated_reserve)
        	select dc_code, COALESCE(sum(dc_available),0) - COALESCE(sum(allocated_qty),0) - COALESCE(SUM(allocated_reserve_qty),0)   net_dc_available
        	from dc_size_level_metrics
        	group by dc_code
        )
--        select * from net_available;
        $$;
    ELSE
        _final_inv_query := $$
            ,dc_size_level_metrics as (
        		    SELECT dc_code,
        		           dc_code as dc_name,
                           size,
        		           SUM(allocated_qty) as allocated_qty,
        		           SUM(available_qty) as dc_available,
        		       	   COALESCE(SUM(available_qty), 0) - COALESCE(SUM(allocated_qty), 0)  as net_available
        		    FROM (
        		        SELECT
        		            article,
        		            dc_code,
                            size,
        		            SUM(allocated_qty) as allocated_qty,
        		            avg(available_qty) as available_qty
						FROM packs
						GROUP BY 1, 2, 3 
        		    ) a
					GROUP BY 1, 2, 3
        	)
           	,net_available as (
           	-- Net avail. = dc_available - (current_allocated)
		        	select dc_code, COALESCE(sum(dc_available),0) - COALESCE(sum(allocated_qty),0) net_dc_available
		        	from dc_size_level_metrics
		        	group by dc_code
        	)
			$$;
        END IF;
    _query_combine := format($$
        
		-- ############## PRODUCT VIEW SUMMARY ##############  
    
        WITH base_table as (  
        -- Get data for current allocation and form base table
            SELECT article,store store_code, pack_dc_allocation, carfs.allocated_total,carfs.retail_size_cd size from inventory_smart.create_allocation_result_flat_gurobi carfs
            WHERE allocation_code = '%1$s' 
        )
        ,flat_table_temp as (
        -- unnest base_table to get pack-dc combinations for article-store data
            SELECT article,
                   store_code,
                   js.key dc_code, 
                   foo.size retail_size_cd,
                   UNNEST((TRANSLATE((js.value::jsonb->>'packs_allocated')::text, '[]', '{}'))::text[]) size,
                   UNNEST((TRANSLATE((js.value::jsonb->>'packs_allocated_qty')::text, '[]', '{}'))::numeric[]) allocated_qty,
                   UNNEST((TRANSLATE((js.value::jsonb->>'packs_available_qty')::text, '[]', '{}'))::numeric[]) available_qty        
            FROM (
                SELECT * FROM base_table 
            ) foo , JSONB_EACH(pack_dc_allocation) js
        )
        ,flat_table as (
        	select 
        		article, 
        		store_code,
        		dc_code,
        		size,
        		allocated_qty,
        		available_qty
        	from 
        		flat_table_temp 
        	where retail_size_cd = size
        )
        ,packs AS  materialized (
        -- Get article-pack-size-dc evel data for allocated and avail. qty
            SELECT 
            	*
            from flat_table
        )
        %2$s
        ,article_count_cte as (
            --article count and store count
            SELECT COUNT(DISTINCT article) as art_cnt,
                COUNT(distinct (case when allocated_total > 0 then store_code end)) store_cnt   
            FROM
                base_table 
        ) 
        ,avg_stores_per_article_cte as (
        	-- Average Stores allocated per article
            SELECT coalesce(count(DISTINCT store_code) / NULLIF(count(DISTINCT article), 0),0) as store_avg
            FROM packs
            WHERE allocated_qty > 0
        )   
        ,sales_aggregate as (
        	-- AID cols to show in summary table
            select 
                round(coalesce(sum(lw_qty),0)) as lw_qty,
                round(coalesce(sum(lw_margin),0)) as lw_margin
                from (
                    select article,
                            store_code,
                            avg(aid.lw_units) as lw_qty,--avg to consider all sizes
                    		avg(aid.lw_margin) as lw_margin
                    from packs
                    left join inventory_smart.article_inventory_dashboard aid using(article, store_code)
                    group by 1, 2
                ) a
        ) 
        -- Get dc-size allocated quantity and cross join columns like net avail, aid columns, etc. Rest is handled in code
        -- allocated_size is then horizontally distributed with DC and size as subheaders in table
        SELECT dc_code,
               dc_name as dc,
               art_cnt,
               store_cnt,
               store_avg,
               size,
               allocated_qty,
               allocated_qty as allocated_size,
               net_dc_available,
               lw_qty,
               lw_margin
        FROM article_count_cte
        CROSS JOIN avg_stores_per_article_cte
        cross join dc_size_level_metrics
        cross join sales_aggregate
        join net_available using (dc_code)
        $$, $2, _final_inv_query);
        raise notice '%', _query_combine;
        OPEN $1 FOR execute _query_combine;  
        perform  global.sp_log(v_gen_random_uuid,'inventory_smart.finalize_product_view_summary', 'Before Return',_query_combine,jsonb_build_object('allocation_code', $2, 'ignore_allocation_code', $3, 'article_filter', $4 ,'type',$5));
        RETURN $1;
    end
$function$
;