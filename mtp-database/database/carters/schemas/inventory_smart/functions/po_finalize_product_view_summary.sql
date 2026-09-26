--liquibase formatted sql
--changeset liquibase:po_finalize_product_view_summary_v4 runOnChange:true stripComments:false splitStatements:false context:MTP-137158 labels:MTP-137158
--comment: MTP-137158 Add allocated_stylecolor_stores CTE
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.po_finalize_product_view_summary(refcursor, varchar, varchar, varchar, varchar, varchar);
CREATE OR REPLACE FUNCTION inventory_smart.po_finalize_product_view_summary(input refcursor, character varying, character varying, character varying, character varying)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
/* 
   * Function/Procedure name: inventory_smart.po_finalize_product_view_summary
   * Created by: Manohara  G
   * Created at: 29-July-2024
   * No of input parameter: 5
   * Parameter Description : $1 = refcursor 
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
      select * from inventory_smart.po_finalize_product_view_summary
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
    _pm_date date;
    _query text;
    _alloc_code text;
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

    _article_filter := '';
    IF ($4 = '') IS FALSE
    THEN
        _article_filter = format($$AND article IN ('%s')$$, $4);
    END IF;
    IF ($5 = 'allocated')
        THEN
            _final_inv_query := $$
                ,current_available as (
                SELECT dc_code::text, size, COALESCE(SUM(oh),0) oh
                FROM (
                    SELECT article, size, pack_type_id, dc_code FROM packs GROUP BY 1, 2, 3, 4
                ) a 
                LEFT JOIN (
                SELECT po_code::text as dc_code, pack_type_id, article, size, oh  FROM inventory_smart.sku_po_available_units where  (article, po_code) in (SELECT article, dc_code FROM packs)
                ) b
                USING(dc_code, pack_type_id, article, size)
                GROUP BY 1, 2
            )     
            ,other_allocations as (
                SELECT dc_code, size, SUM(allocated_reserve_qty) as allocated_reserve_qty
                FROM (
                    SELECT dc_code, article, pack_type_id, size, COALESCE(quantity,0) as allocated_reserve_qty
                    FROM (
                        SELECT dc_code::text, article, pack_type_id, size FROM packs
                        GROUP BY 1, 2, 3, 4
                    ) am
                    JOIN (select * from inventory_smart.sku_po_allocated_units( $$ || quote_literal('%1$s') || $$ )
                          where allocation_code not in ($$ || quote_literal('%1$s') || $$))b
                    USING (dc_code, article, size, pack_type_id)
                ) a
                GROUP BY 1, 2
            )
            ,fourth_table as (
                SELECT a.dc_code,
                    a.dc_code as dc_name,
                    size,
                    COALESCE(SUM(allocated_qty),0) as allocated_qty,
                    COALESCE(SUM(oh),0) as dc_available,
                    COALESCE(SUM(allocated_reserve_qty),0) as allocated_reserve_qty
                FROM (
                    SELECT size,
                        dc_code::text,
                        SUM(allocated_qty) as allocated_qty
                    FROM packs
                    GROUP BY 1, 2
                ) a
                LEFT JOIN current_available USING (size, dc_code)
                LEFT JOIN other_allocations USING (size, dc_code)
                GROUP BY 1, 2, 3
            )
            ,net_availble_count as materialized (
                select dc_code, COALESCE(sum(dc_available),0) - COALESCE(sum(allocated_qty),0) - COALESCE(SUM(allocated_reserve_qty),0)  net_dc_available
                from fourth_table
                group by dc_code
            )
            $$;
        _final_inv_query := format(_final_inv_query,_alloc_code);
    ELSE
        _final_inv_query := $$
                ,fourth_table as (
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
        		            sum(available_qty) as available_qty
						FROM (
							select 
								article,
        		            	dc_code,
        		            	pack_type_id,
                                size,
        		            	SUM(allocated_qty) as allocated_qty,
        		            	avg(available_qty) as available_qty
							from packs
							group by 1,2,3,4) a
						GROUP BY 1, 2, 3 
        		    ) a
					GROUP BY 1, 2, 3
        		)
                ,net_availble_count as materialized (
        	select dc_code, COALESCE(sum(dc_available),0) - COALESCE(sum(allocated_qty),0) net_dc_available
        	from fourth_table
        	group by dc_code
        )
			$$;
        END IF;
    _query_combine := format($$
        ----PO- PRODUCT VIEW  - summary
        WITH base_table as (  
            SELECT article,store store_code, pack_dc_allocation, carfs.allocated_total,carfs.retail_size_cd size from inventory_smart.create_allocation_result_flat_gurobi carfs
            WHERE allocation_code = '%1$s'  %2$s
            and carfs.created_at between $$ || quote_literal(_pm_date::timestamp) || $$ and $$ || quote_literal(_pm_date::timestamp + interval '1 day') || $$ 
        )
        ,flat_table as (
            SELECT article,
                   store_code,
                   js.key dc_code, 
                   size,
                   UNNEST((TRANSLATE((js.value::jsonb->>'packs_allocated')::text, '[]', '{}'))::text[]) pack_type_id,
                   UNNEST((TRANSLATE((js.value::jsonb->>'packs_allocated_qty')::text, '[]', '{}'))::numeric[]) allocated_qty,
                   UNNEST((TRANSLATE((js.value::jsonb->>'packs_available_qty')::text, '[]', '{}'))::numeric[]) available_qty        
            FROM (
                SELECT * FROM base_table 
            ) foo , JSONB_EACH(pack_dc_allocation) js
        )
        ,packs AS  materialized (
            SELECT article,
                   dc_code,
                   store_code,
                   pack_type_id,
                   size,
                   pack_type,
                   allocated_qty * units_in_pack::double precision AS allocated_qty,
                   available_qty * units_in_pack::double precision as available_qty
            FROM inventory_smart.dc_pack_configuration dpc
            JOIN flat_table USING (article, pack_type_id,size)
        )
        %3$s
        ,first_table as (
            --article count and store count
            SELECT COUNT(DISTINCT article) as art_cnt,
                COUNT(distinct (case when allocated_total > 0 then store_code end)) store_cnt   
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
        ,allocated_stylecolor_stores AS (
            SELECT
                COUNT(DISTINCT CASE WHEN allocated_total > 0 THEN (article, store_code) END) AS allocated_stylecolor_store_cnt
            FROM base_table
        )
        ,second_table as (
            SELECT coalesce(count(DISTINCT store_code) / NULLIF(count(DISTINCT article), 0),0) as store_avg
            FROM packs
            WHERE allocated_qty > 0
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
        SELECT ft.dc_code,
               dc_name as dc,
               art_cnt,
               store_cnt,
               store_avg,
               allocated_stores_per_style_color,
               allocated_stylecolor_store_cnt,
               size,
               allocated_qty,
               allocated_qty as allocated_size,
               net_dc_available,
               lw_qty,
               lw_margin
        FROM first_table
        CROSS JOIN allocated_stores_per_style
        CROSS JOIN allocated_stylecolor_stores
        CROSS JOIN second_table
        cross join fourth_table ft
        cross join sales_aggregate
        join net_availble_count nac on ft.dc_code = nac.dc_code
        $$, $2, _article_filter, _final_inv_query);
        raise notice '%', _query_combine;
        OPEN $1 FOR execute _query_combine;  
		perform  global.sp_log(v_gen_random_uuid, 'inventory_smart.po_finalize_product_view_summary', 'Before returning function value',_query_combine,jsonb_build_object('allocation_code',$2,'_store_code',$3,'Ignore allocation codes',$4,'article filter',$5)) ;		

        RETURN $1;
    end
$function$
;