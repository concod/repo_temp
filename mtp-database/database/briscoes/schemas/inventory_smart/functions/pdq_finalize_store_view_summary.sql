
--liquibase formatted sql
--changeset liquibase:pdq_finalize_store_view_summary runOnChange:true stripComments:false splitStatements:false context:MTP-131298 labels:MTP-131298
--comment: PDQ version of finalize_store_view_summary for briscoes
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.pdq_finalize_store_view_summary(refcursor, varchar, varchar, varchar, varchar);
CREATE OR REPLACE FUNCTION inventory_smart.pdq_finalize_store_view_summary(input refcursor, character varying, character varying, character varying, character varying)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
/* 
 * Function/Procedure name: inventory_smart.pdq_finalize_store_view_summary
 * Created by: Karish Chaudhary
 * Created at: 11-Mar-2026
 * No of input parameter: 5
 * Parameter Description : 	$1 = Application name
 *                         	$2 = Allocation Code
 *                         	$3 = Ignore allocation code
							$4 = article filter
							$5 = type
 * Purpose: 
 * This function is created to calculate Store View Allocation Summary which is displayed in the 
 * Finalize screen of Allocate flow
 * Calling Statement:
    begin;
	    select * from inventory_smart.pdq_finalize_store_view_summary('my_cur','6_251_USA_20240712T060950','','','allocated');
		fetch all in "my_cur";
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
	v_gen_random_uuid text  := gen_random_uuid()::varchar;
    begin
        IF ($4 = '') IS FALSE
        THEN
            _article_filter := format($$AND article IN ('%s')$$, $4);
        END IF;

        IF ($5 = 'allocated')
            THEN
                _final_inv_query := $$
				,current_available as (
			-- dc-size level aggregation for available units for articles in packs CTE
			select dc_code, size, 
            greatest(coalesce(sum(oh),0),0) oh,
                greatest(coalesce(sum(it),0),0) it,
                greatest(coalesce(sum(oo),0),0) oo
                from (SELECT article, dc_code, size, avg(oh) oh, avg(it) it, avg(oo) oo
			FROM (
				SELECT article, size, dc_code FROM packs
			) a 
			LEFT JOIN (
			SELECT * FROM inventory_smart.sku_dc_available_units where  (article, dc_code) in (SELECT article, dc_code FROM packs)
            ) b
			USING(dc_code, article, size)
			GROUP BY 1, 2, 3
		)b  group by 1, 2 )
--		select * from current_available;
        ,reserve_allocation as (
        -- Get dc-size level aggregation for reserved metrics for articles in packs CTE
            select dc_code, size, greatest(sum(coalesce(user_reserve_qty,0)),0) user_reserve_qty from (SELECT article, dc_code, size, avg(COALESCE(quantity,0)) user_reserve_qty 
            FROM (
                SELECT dc_code, article, size FROM packs
            ) am
            LEFT JOIN (
            SELECT * FROM inventory_smart.sku_dc_reserved_units where  (article, dc_code) in (SELECT article, dc_code FROM packs)
            ) b
            USING (dc_code, article, size)
            GROUP BY 1, 2, 3
        )b group by 1, 2)   
--        select * from reserve_allocation;
        ,other_allocations as (
        -- Get dc-size level aggregation for today's allocation metrics for articles in packs CTE
             select dc_code, size, sum(allocated_reserve_qty) allocated_reserve_qty from (SELECT article, dc_code, size, SUM(allocated_reserve_qty) as allocated_reserve_qty
            FROM (
                SELECT dc_code, article, size,  greatest(coalesce(quantity,0),0) as allocated_reserve_qty
                FROM (
                    SELECT distinct dc_code, article, size FROM packs
                ) am
                JOIN inventory_smart.sku_dc_allocated_units 
                USING (dc_code, article, size)
            ) a
            GROUP BY 1, 2, 3
        )b group by 1, 2)
--        select * from other_allocations;
	            ,final_inv as (
	            select 
	            ca.dc_code,
	            size,
	            	greatest(coalesce (oh,0)-coalesce (allocated_reserve_qty,0)-coalesce (user_reserve_qty,0),0) available_qty 
				from current_available ca
				left join reserve_allocation using(dc_code, size)
				left join other_allocations using(dc_code, size)
				)
--        select * from final_inv;
        $$;
        ELSE
        _final_inv_query := $$
            ,final_inv as (
        		    SELECT 
        		    		dc_code,
        		    		size,
        		            greatest(sum(available_qty),0) as available_qty
						FROM (
							select 
								article,
        		            	dc_code,
                                size,
        		            	SUM(allocated_qty) as allocated_qty,
        		            	avg(available_qty) as available_qty
							from packs
							group by 1,2,3) a
						GROUP BY 1,2
        		    ) 
			$$;
        END IF;
        _query_combine := format($$
		 ------ store view -  summary  
		WITH base_table as materialized(
	            SELECT 
	            	carfs.article,carfs.allocated_total,  
	            	carfs.pack_dc_allocation, 
	            	store store_code, 
	            	saf.store_name, 
	            	carfs.store_grade, 
	            	carfs.retail_size_cd size 
	            from inventory_smart.create_allocation_result_flat_gurobi carfs
	            JOIN global.store_attributes_filter saf ON saf.store_code::text = carfs.store::text 
	            WHERE allocation_code = '%1$s' %3$s
		)
        ,flat_table_temp as (
        -- unnest base_table to get pack-dc combinations for article-store data
            SELECT article,
                   store_code,
                   js.key::int dc_code, 
                   foo.size retail_size_cd,
                   store_grade,
                   UNNEST((TRANSLATE((js.value::jsonb->>'packs_allocated')::text, '[]', '{}'))::text[]) size,
                   UNNEST((TRANSLATE((js.value::jsonb->>'packs_allocated_qty')::text, '[]', '{}'))::numeric[]) allocated_qty,
                   UNNEST((TRANSLATE((js.value::jsonb->>'packs_available_qty')::text, '[]', '{}'))::numeric[]) available_qty        
            FROM (
                SELECT * FROM base_table 
            ) foo , JSONB_EACH(pack_dc_allocation) js
        )   
--        select * from flat_table;
		,flat_table as (
        	select 
        		article, 
        		store_code,
        		dc_code,
        		size,
        		store_grade,
        		greatest(allocated_qty,0) allocated_qty,
        		greatest(available_qty,0) available_qty
        		from 
        		flat_table_temp 
        	where retail_size_cd = size
        )
--        select * from flat_table;
        ,packs AS  materialized (
		        select * from flat_table
    	    )
--            select * from packs;           
		%2$s
          ,dc_allocated as (
          		select
	          		dc_code,
	          		size,
	          		sum(allocated_qty) dc_allocated_qty
          		from packs 
          		group by dc_code, size
          )
--          select * from dc_allocated;
          ,store_grade_allocated as (	
          		select 
          			store_grade, 
          			sum(allocated_qty) store_grade_allocated, 
          			round(coalesce(SUM(allocated_qty) * 100.0 / (SELECT NULLIF(SUM(allocated_qty),0) FROM packs),0)::numeric,2) AS store_grade_allocated_perc
          		from packs
          		group by store_grade
          )
--          select * from store_grade_allocated;
        ,cnt_cte as (
            select
                COUNT(distinct article) as art_cnt,
                COUNT(distinct (case when allocated_total > 0 then store_code end)) store_cnt    
            from
                base_table
         )
--         select * from cnt_cte;
        ,per_store_sku_cnt AS (
            SELECT
                store_code,
                COUNT(DISTINCT CASE WHEN allocated_total > 0 THEN article END) AS sku_cnt_per_store
            FROM base_table
            GROUP BY store_code
        )
        ,sku_depth_per_store AS (
            SELECT
                ROUND(AVG(sku_cnt_per_store)::numeric, 1) AS sku_depth_per_store
            FROM per_store_sku_cnt
        )
         ,sales_aggregate as (
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
--        select * from sales_aggregate;
		,second_table as (
                SELECT  round(coalesce (count(DISTINCT store_code) / NULLIF(count(DISTINCT article), 0), 0),2) as store_avg,
                        round(coalesce (SUM(allocated_qty) / NULLIF(count(DISTINCT store_code), 0),0),2) as avg_units_per_store,
						coalesce (SUM(allocated_qty),0)  allocated_total  
                FROM packs
                WHERE allocated_qty > 0
        )
--        select * from second_table;
        select
        	store_grade,
        	dc_code,
			size,
        	dc_table.name dc_name,
        	store_grade_allocated,
        	dc_allocated_qty,
            art_cnt,
            store_cnt,
            sku_depth_per_store,
            (coalesce (available_qty,0)-dc_allocated_qty) as net_available,  
            lw_qty,
            lw_margin,
            store_grade_allocated_perc,
            store_avg,
            avg_units_per_store,
			allocated_total
        from final_inv
        join dc_allocated using(dc_code,size)
        join global.distribution_centres dc_table using (dc_code)
        cross join cnt_cte
        cross join sku_depth_per_store
        cross join sales_aggregate
        cross join store_grade_allocated
        cross join second_table
       $$, $2, _final_inv_query, _article_filter);
      raise notice '%', _query_combine;
	  OPEN $1 FOR execute _query_combine;  
      perform  global.sp_log(v_gen_random_uuid,'inventory_smart.pdq_finalize_store_view_summary', 'Before Return',_query_combine,jsonb_build_object('allocation_code', $2, 'ignore_allocation_code', $3, 'article_filter', $4 ,'type',$5));
	  RETURN $1;
    end
$function$
;
