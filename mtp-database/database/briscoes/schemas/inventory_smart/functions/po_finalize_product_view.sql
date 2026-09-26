--liquibase formatted sql
--changeset liquibase:finalize_product_view runOnChange:true stripComments:false splitStatements:false context:MTP-64351 labels:MTP-64351
--comment: MTP-70658 po flow | article size level net dc available calculation
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.po_finalize_product_view(refcursor, varchar, varchar, varchar, varchar, varchar);
CREATE OR REPLACE FUNCTION inventory_smart.po_finalize_product_view(input refcursor, character varying, character varying, character varying, character varying, character varying)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
 /* 
  * Function/Procedure name: inventory_smart.finalize_product_view
  * Created by: Manohara Gulla
  * Created at: 29-Jan-2025
  * 
  * Parameter Description : $1 = Application name
  *                         $2 = Allocation Code
  *                             $3 = Store code
  *                             $4 = Ignore allocation codes
                                $5 = article filter
                                $6 = type
  * Purpose: 
  * This function is created to calculate Product view data which is displayed in the 
  * Finalize screen of Allocate flow
  * Calling Statement:
     begin;
    select * from inventory_smart.finalize_product_view('my_cur','6_251_USA_20240712T060950','','','','allocated');
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
        _store_filter text;
        _article_filter text;
        _final_inv_query text;
	v_gen_random_uuid text  := gen_random_uuid()::varchar;
    begin
	    _article_filter := '';
        _store_filter := '';
        if ($3 = '') IS FALSE
            then
                _store_filter := format($$AND store_code = '%s'$$, $3);
            end if;
        IF ($5 = '') IS FALSE
        THEN
            _article_filter = format($$AND article IN ('%s')$$, $5);
        END IF;
        IF ($6 = 'allocated')
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
                    ,final_inv as materialized (
                                SELECT dc_code,
                                    article,
                                    foo.size,
                                    allocated_qty,
                                    COALESCE(SUM(oh),0) as dc_available,
                                    COALESCE(SUM(allocated_reserve_qty),0) as allocated_reserve_qty
                                FROM (
                                    SELECT dc_code::text,
                                            article,
                                            size,
                                            SUM(allocated_qty) as allocated_qty
                                    FROM packs
                                    GROUP BY 1, 2, 3
                                ) foo
                                LEFT JOIN current_available USING (dc_code, article, size)
                                LEFT JOIN other_allocations USING (dc_code, article, size)
                                GROUP BY 1, 2, 3, 4
                            )
                    ,net_available_count as (
                        select article, dc_code, size, COALESCE(sum(dc_available),0) - COALESCE(sum(allocated_qty),0) - COALESCE(SUM(allocated_reserve_qty),0)  net_available,
                            COALESCE(sum(dc_available),0) - COALESCE(sum(allocated_reserve_qty),0) as net_available_before_allocation
                        from final_inv
                        group by dc_code, article,size
                    )
--         select * from net_availble_count;
        $$;
    ELSE
        _final_inv_query := $$
            ,final_inv as (
        		    SELECT a.*,
        				   dc_code as dc_name,
        		       	   COALESCE(dc_available, 0) - COALESCE(allocated_qty, 0)  as net_available,
        		       	   0 as allocated_reserve_qty
        		    FROM (
        		        SELECT
        		            article,
        		            dc_code,
                            size,
        		            SUM(allocated_qty) as allocated_qty,
        		            sum(available_qty) as dc_available
						FROM (
							select 
								article,
        		            	dc_code,
                                size,
        		            	SUM(allocated_qty) as allocated_qty,
        		            	avg(available_qty) as available_qty
							from packs
							group by 1,2,3) a
						GROUP BY 1, 2, 3
        		    ) a
        		)
                ,net_available_count as (
        	select article, dc_code, size, COALESCE(sum(dc_available),0) - COALESCE(sum(allocated_qty),0) net_available,
            COALESCE(sum(dc_available),0)  as net_available_before_allocation
        	from final_inv
        	group by article,dc_code,size
        )
			$$;
        END IF;
        _query_combine := format($$
            ------ PRODUCT VIEW -  PRODUCT TABLE DATA
             WITH base_table as materialized (
                SELECT article, channel, store store_code,pack_dc_allocation,inventory_source, demand_type, demand, allocated_total, min,max,oh,oo,it,lt_forecast,wos,carfs.retail_size_cd size,
                       oh_oo_intransit, (allocated_total + oh_oo_intransit) / nullif(ros, 0) AS current_wos
                FROM inventory_smart.create_allocation_result_flat_gurobi carfs
                LEFT JOIN global.store_attributes_filter saf ON store_code = store
                WHERE allocation_code = '%1$s' %3$s %2$s
        )
        ,flat_table_temp as (
        -- unnest base_table to get pack-dc combinations for article-store data
            SELECT article,
                   store_code,
                   js.key dc_code, 
                   foo.size retail_size_cd,
                   channel,
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
        		channel,
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
         %4$s
        ,store_level_oh as (
                SELECT article, sum(oh) as oh, sum(oo) as oo, sum(it) as it, round(avg(wos)::numeric,2) as wos 
                FROM base_table
                group by article
             )
        ,sales_aggregate as (
        select 
             article,
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
			group by 1
        )
        ,article_level_base_table as  (
            select article, 
            	   inventory_source, 
            	   demand_type, 
            	   sum(demand) as demand,
            	   COUNT( DISTINCT(CASE WHEN allocated_total > 0 then store_code end)) as store, 
            	   COUNT( distinct store_code ) as all_stores,-- stores can have 0 alloc
                   sum(MIN) as MIN,
                   sum(MAX) as MAX
                   from base_table bt
                GROUP BY 1, 2, 3)
        ,paf_details as (
        	select
				*
			from
				global.product_attributes_filter paf
			where
				article in (
				select
					distinct article
				from
					base_table)
				and active
        )
        select
			alb.*,
			fi.dc_code,
			fi.size,
			fi.allocated_qty as allocated_quantity_size,
			fi.dc_available,
			fi.allocated_reserve_qty,
			nac.net_available,
			nac.net_available_before_allocation,
			fi.dc_code dc,
			paf.l0_name,
			paf.l1_name ,
			paf.l2_name,
			paf.l3_name,
			paf.l4_name,
			paf.l5_name,
			sa.lw_qty,
			sa.lw_margin,
			slo.oh,
			slo.it,
			slo.oo,
            slo.wos,
			1 as order
		from
			article_level_base_table alb
	        LEFT JOIN final_inv fi USING(article) 
	        LEFT JOIN paf_details paf USING (article, size)
	        left join sales_aggregate sa using(article)
	        left join store_level_oh slo using(article)
	        left join net_available_count nac using(article, dc_code,size)
        $$, $2, _store_filter, _article_filter, _final_inv_query);
        raise notice '%', _query_combine;
        OPEN $1 FOR execute _query_combine;  
        perform  global.sp_log(v_gen_random_uuid,'inventory_smart.finalize_product_view', 'Before Return',_query_combine,jsonb_build_object('allocation_code', $2, 'store_code' ,$3,'ignore_allocation_code', $4, 'article_filter', $5 ,'type',$6));
        RETURN $1;
    END
$function$
;