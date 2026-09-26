--liquibase formatted sql
--changeset liquibase:asn_finalize_product_view_summary_v3 runOnChange:true stripComments:false splitStatements:false context:MTP-130441 labels:MTP-130441
--comment: MTP-77373 | MTP-130441 allocated_stores_per_style_color
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.asn_finalize_product_view_summary(input refcursor, character varying, character varying, character varying, character varying);
CREATE OR REPLACE FUNCTION inventory_smart.asn_finalize_product_view_summary(input refcursor, character varying, character varying, character varying, character varying)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
/* 
   * Function/Procedure name: inventory_smart.asn_product_view_summary
   * Created by: Manohara Gulla
   * Created at: 08-Jun-2025
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
    _pm_date date;
    _query text;
    v_gen_random_uuid text  := gen_random_uuid()::varchar;
    _alloc_code text;
begin
    _article_filter := '';
	IF ($4 = '') IS FALSE
        THEN
            _article_filter = format($$ AND article IN ('%s')$$, $4);
	END IF;
    _query :=  'select date(created_at) from inventory_smart.plan_master where plan_code = %L';
    if $3 = '' then 
        _alloc_code := $2;	 
    else
        _alloc_code := $3;
    end if; 
    _query := format(_query, _alloc_code);
    execute _query into _pm_date;
    raise notice 'pm_date: %', _pm_date;
    
    IF ($5 = 'allocated')
            THEN
                _final_inv_query := $$
		,current_available as (
			-- dc-size level aggregation for available units for articles in packs CTE
			select dc_code, size, sum(oh) oh from (SELECT article, dc_code, size, avg(oh) oh
			FROM (
				SELECT article, size, dc_code FROM packs
			) a 
			LEFT JOIN (
			SELECT asn_code::text as dc_code, pack_type_id, article, size, oh FROM inventory_smart.sku_asn_available_units where  (article, dc_code) in (SELECT article, dc_code FROM packs)
            ) b
			USING(dc_code, article, size)
			GROUP BY 1, 2, 3
		)b  group by 1, 2 )
--		select * from current_available;
        ,other_allocations as (
        -- Get dc-size level aggregation for today's allocation metrics for articles in packs CTE
             select dc_code, size, sum(allocated_reserve_qty) allocated_reserve_qty from (SELECT article, dc_code, size, SUM(allocated_reserve_qty) as allocated_reserve_qty
            FROM (
                SELECT dc_code, article, size, COALESCE(quantity,0) as allocated_reserve_qty
                FROM (
                    SELECT distinct dc_code, article, size FROM packs
                ) am
                JOIN (select dc_code::text, article, size, SUM(quantity) as quantity from inventory_smart.sku_asn_allocated_units( $$ || quote_literal('%1$s') || $$ ) GROUP BY dc_code, article, size)b
                USING (dc_code, article, size)
            ) a
            GROUP BY 1, 2, 3
        )b group by 1, 2)
--        select * from other_allocations;
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
            GROUP BY 1, 2, 3
        )
        ,net_available as (
        -- Net avail. = dc_available - (current_allocated + allocated_reserve)
        	select dc_code, COALESCE(sum(dc_available),0) - COALESCE(sum(allocated_qty),0) - COALESCE(SUM(allocated_reserve_qty),0)  net_dc_available
        	from dc_size_level_metrics
        	group by dc_code
        )
        $$;
        _final_inv_query := format(_final_inv_query,_alloc_code);
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
        -- Net avail. = dc_available - (current_allocated + allocated_reserve)
        	select dc_code, COALESCE(sum(dc_available),0) - COALESCE(sum(allocated_qty),0)  net_dc_available
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
            WHERE carfs.created_at between $$ || quote_literal(_pm_date::timestamp) || $$ and $$ || quote_literal(_pm_date::timestamp + interval '1 day') || $$ and allocation_code = '%1$s' %3$s
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
        ,size_order as (
		-- Get size order for article-size combination
        	select
        		ft.size,
        		ast.order
        	from (select distinct article, size from base_table)ft
        	join (select article, product_code, size from global.product_attributes_filter) paf
        		using (article, size)
        	join (select distinct product_code, size, x.order from inventory_smart.article_status_tag x) ast
        		on paf.product_code = ast.product_code and paf.size=ast.size
        	group by 1,2
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
                COUNT(distinct (case when allocated_total > 0 then store_code end)) store_cnt,
                count(distinct store_code) as all_stores    
            FROM
                base_table 
        )
        ,per_article_store_cnt AS (
            SELECT
                article,
                COUNT(DISTINCT CASE WHEN allocated_total > 0 THEN store_code END) AS store_cnt_per_article
            FROM base_table
            GROUP BY article
        )
        ,allocated_stores_per_style AS (
            SELECT
                ROUND(AVG(store_cnt_per_article)::numeric, 1) AS allocated_stores_per_style_color
            FROM per_article_store_cnt
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
               all_stores,
               store_avg,
               allocated_stores_per_style_color,
               size,
               allocated_qty,
               allocated_qty as allocated_size,
               net_dc_available,
               lw_qty,
               lw_margin
        FROM article_count_cte
        CROSS JOIN allocated_stores_per_style
        CROSS JOIN avg_stores_per_article_cte
        cross join dc_size_level_metrics
        cross join sales_aggregate
        join net_available using (dc_code)
        left join size_order so using (size)
        order by so.order
        $$, $2, _final_inv_query, _article_filter);
        raise notice '%', _query_combine;
        OPEN $1 FOR execute _query_combine;  
        perform  global.sp_log(v_gen_random_uuid,'inventory_smart.finalize_product_view_summary', 'Before Return',_query_combine,jsonb_build_object('allocation_code', $2, 'ignore_allocation_code', $3, 'article_filter', $4 ,'type',$5));
        RETURN $1;
    end
$function$
;
