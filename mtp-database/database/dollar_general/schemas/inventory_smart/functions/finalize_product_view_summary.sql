--liquibase formatted sql
--changeset Manohara:finalize_product_view_summary_v4 runOnChange:true stripComments:false splitStatements:false context:MTP-134698 labels:MTP-134698
--comment: MTP-134698 Add allocated_stylecolor_stores KPI | MTP-82613 Add article filter for summary | MTP-130441 allocated_stores_per_style_color
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.finalize_product_view_summary(refcursor, varchar, varchar, varchar, varchar);
CREATE OR REPLACE FUNCTION inventory_smart.finalize_product_view_summary(input refcursor, character varying, character varying, character varying, character varying)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
  /* 
   * Function/Procedure name: inventory_smart.product_view_summary
   * Created by: Manohara Gulla
   * Created at: 9-Jun-2024
   * No of input parameter: 5
   * Parameter Description : $1 = Cursor
   *                         $2 = Allocation Code
  *                          $3 = Ignore allocation code
                             $4 = article filter
                             $5 = type
   * Purpose: 
   * This function is created to calculate Store View Allocation Summary which is displayed in the 
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
                    ,current_allocation as (
                SELECT dc_code,  SUM(oh) oh, SUM(it) it, SUM(oo) oo
                FROM (
                    SELECT article, pack_type_id, dc_code FROM packs GROUP BY 1, 2, 3
                ) a 
                LEFT JOIN (
                SELECT * FROM inventory_smart.sku_dc_available_units where  (article, dc_code) in (SELECT distinct article, dc_code FROM packs)
                ) b
                USING(dc_code, pack_type_id, article)
                GROUP BY 1
            )
    --         select * from current_allocation ;        
            ,reserve_allocation as (
                SELECT dc_code,  SUM(COALESCE(quantity,0)) user_reserve_qty 
                FROM (
                    SELECT dc_code, article FROM packs
                    GROUP BY 1, 2
                ) am
                LEFT JOIN (
                    SELECT * FROM inventory_smart.sku_dc_reserved_units where (article, dc_code) in (SELECT distinct article, dc_code FROM packs)
                ) b
                USING (dc_code, article)
                GROUP BY 1
            )
    --        select * from reserve_allocation ;       
            ,other_allocations as (
                SELECT dc_code, SUM(allocated_reserve_qty) as allocated_reserve_qty
                FROM (
                    SELECT dc_code, article, pack_type_id, COALESCE(quantity,0) as allocated_reserve_qty
                    FROM (
                        SELECT dc_code, article, pack_type_id FROM packs
                        GROUP BY 1, 2, 3
                    ) am
                    join (select * from inventory_smart.sku_dc_allocated_units( $$ || quote_literal('%1$s') || $$ ))b 
                    USING (dc_code, article, pack_type_id)
                ) a
                GROUP BY 1
            )
    --        select * from other_allocations ;
            ,fourth_table as (
                SELECT dc_code,
                    name as dc_name,
                    SUM(allocated_qty) as allocated_qty,
                    SUM(oh) as dc_available,
                    SUM(allocated_reserve_qty) as allocated_reserve_qty,
                    SUM(user_reserve_qty) as user_reserve_qty,
                    COALESCE(SUM(oh), 0) - COALESCE(SUM(allocated_reserve_qty), 0) - COALESCE(SUM(allocated_qty), 0) as net_available
                FROM (
                    SELECT dc_code,
                        SUM(allocated_qty) as allocated_qty
                    FROM packs
                    GROUP BY 1
                ) a
                LEFT JOIN current_allocation USING (dc_code)
                LEFT JOIN reserve_allocation USING (dc_code)
                LEFT JOIN other_allocations USING (dc_code)
                LEFT JOIN "global".distribution_centres dd USING (dc_code)
                GROUP BY 1, 2
            )
    --         select * from fourth_table ; 
            $$;
            _final_inv_query := format(_final_inv_query,_alloc_code);
        ELSE
            _final_inv_query := $$
        		,fourth_table as (
        		    SELECT dc_code,
        		           name as dc_name,
        		           SUM(allocated_qty) as allocated_qty,
        		           SUM(available_qty) as dc_available,
        		       	   COALESCE(SUM(available_qty), 0) - COALESCE(SUM(allocated_qty), 0)  as net_available
        		    FROM (
        		        SELECT
        		            article,
        		            dc_code,
        		            SUM(allocated_qty) as allocated_qty,
        		            sum(available_qty) as available_qty
						FROM (
							select 
								article,
        		            	dc_code,
        		            	pack_type_id,
        		            	SUM(allocated_qty) as allocated_qty,
        		            	avg(available_qty) as available_qty
							from packs
							group by 1,2,3) a
						GROUP BY 1, 2
        		    ) a
        		    LEFT JOIN global.distribution_centres USING (dc_code)
					GROUP BY 1, 2
        		)
			$$;
        END IF;
        _query_combine := format($$
        ----PRODUCT VIEW  summary
        --we no need to convert it to US timezone because we are only filtering for one allocation at a time, we can pick single date from plan_master
        WITH base_table as (  
            SELECT article, store store_code, pack_dc_allocation from inventory_smart.create_allocation_result_flat_gurobi carfs
            WHERE carfs.created_at between $$ || quote_literal(_pm_date::timestamp) || $$ and $$ || quote_literal(_pm_date::timestamp + interval '1 day') || $$ and allocation_code = '%1$s' %3$s
        )
        ,flat_table as (
            SELECT article,
                   store_code,
                   js.key::int dc_code, 
                   UNNEST((TRANSLATE((js.value::jsonb->>'packs_allocated')::text, '[]', '{}'))::text[]) pack_type_id,
                   UNNEST((TRANSLATE((js.value::jsonb->>'packs_allocated_qty')::text, '[]', '{}'))::numeric[]) allocated_qty,
                   UNNEST((TRANSLATE((js.value::jsonb->>'packs_available_qty')::text, '[]', '{}'))::numeric[]) available_qty        
            FROM (
                SELECT * FROM base_table 
            ) foo , JSONB_EACH(pack_dc_allocation) js
        )
--        select * from flat_table;      
        ,packs AS (
            SELECT article,
                   dc_code,
                   store_code,
                   pack_type_id,
                   available_qty * units_in_pack::double precision as available_qty,
                   allocated_qty * units_in_pack::double precision AS allocated_qty
            FROM inventory_smart.dc_pack_configuration dpc
            JOIN flat_table USING (article, pack_type_id)
        )
--        select * from packs;
		%2$s
        ,first_table as (
            --article count and store count
            SELECT 
                   COUNT(DISTINCT pb.store_code) as store_cnt,
                   array_agg(distinct l0_name) l0_name,
                   array_agg(distinct l4_name) l4_name
             FROM
				packs pb
			join global.product_attributes_filter paf on
				pb.article = paf.product_code
			where
				allocated_qty > 0
				)
        ,per_article_store_cnt AS (
            SELECT
                article,
                COUNT(DISTINCT store_code) AS store_cnt_per_article
            FROM packs
            WHERE allocated_qty > 0
            GROUP BY article
        )
        ,allocated_stylecolor_stores AS (
            SELECT
                COUNT(DISTINCT CASE WHEN allocated_qty > 0 THEN (article, store_code) END) AS allocated_stylecolor_store_cnt
            FROM packs
        )
--        select * from first_table;      
        ,second_table as (
                    SELECT coalesce(count(DISTINCT store_code) / NULLIF(count(DISTINCT article), 0),0) as store_avg
                    FROM packs
                    WHERE allocated_qty > 0
                ) 
--          select * from second_table; 
         ,fifth_table as (
            --article count and store count
            SELECT 
                   COUNT(DISTINCT store_code) as all_stores,
                   SUM(allocated_qty) as allocated_size,
                   COUNT(DISTINCT article) as art_cnt
            FROM packs
        )      
        ,store_band_table as (
           select count(distinct coalesce(psa_name,'2')) as store_band_cnt
           from (select UNNEST(l0_name) AS l0_name, UNNEST(l4_name) AS l4_name FROM first_table group by 1,2) ft
		   left join global.product_store_attributes_filter psaf using (l0_name,l4_name) where store_code in (SELECT 
                   DISTINCT store_code
            FROM packs)
        )
        SELECT dc_code,
               dc_name as dc,
               art_cnt,
               store_cnt,
               store_band_cnt,
               all_stores,
               store_avg,
               allocated_stylecolor_store_cnt,
               allocated_size,
               allocated_qty,
               net_available as net_dc_available
        FROM   first_table
        CROSS JOIN allocated_stylecolor_stores
        CROSS JOIN second_table
        CROSS JOIN fourth_table 
        cross join fifth_table
        cross join store_band_table
        $$, $2,_final_inv_query, _article_filter);
        raise notice '%', _query_combine;
        OPEN $1 FOR execute _query_combine;  
        RETURN $1;
    end
$function$
;