--liquibase formatted sql
--changeset liquibase:asn_finalize_product_view runOnChange:true stripComments:false splitStatements:false context:MTP-77373 labels:MTP-77373
--comment: MTP-77373 | article size level net dc available calculation | MTP-98056 removing active filter
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.asn_finalize_product_view(input refcursor, character varying, character varying, character varying, character varying, character varying);
CREATE OR REPLACE FUNCTION inventory_smart.asn_finalize_product_view(input refcursor, character varying, character varying, character varying, character varying, character varying)
RETURNS refcursor
LANGUAGE plpgsql
AS $function$
 /* 
  * Function/Procedure name: inventory_smart.asn_finalize_product_view
  * Created by: Manohara Gulla
  * Created at: 08-Jun-2025
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
    select * from inventory_smart.asn_finalize_product_view('my_cur','6_251_USA_20240712T060950','','','','allocated');
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
        _pm_date date;
        _query text;
	    v_gen_random_uuid text  := gen_random_uuid()::varchar;
        _alloc_code text;
        _active_filter text;
    begin
        _query :=  'select date(created_at) from inventory_smart.plan_master where plan_code = %L';
        if $4 = '' then 
			_alloc_code := $2;	  
		else
			_alloc_code := $4;	 
		end if; 
        _query := format(_query, _alloc_code);
        execute _query into _pm_date;
        raise notice 'pm_date: %', _pm_date;

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
                SELECT dc_code, article, size, SUM(oh) oh
                    FROM (
                        SELECT article, size, dc_code FROM packs GROUP BY 1, 2, 3
                    ) a 
                    LEFT JOIN (
                    SELECT asn_code::text as dc_code, pack_type_id, article, size, oh FROM inventory_smart.sku_asn_available_units where  (article, dc_code) in (SELECT article, dc_code FROM packs)
                    ) b
                    USING(dc_code, article, size)
                    GROUP BY 1, 2, 3
                )      
        ,other_allocations as (
                    SELECT dc_code, article, size, SUM(allocated_reserve_qty) as allocated_reserve_qty
                    FROM (
                        SELECT dc_code, article, size, COALESCE(quantity,0) as allocated_reserve_qty
                        FROM (
                            SELECT dc_code, article, size FROM packs
                            GROUP BY 1, 2, 3
                        ) am
                    JOIN (select dc_code::text, article, size, SUM(quantity) as quantity from inventory_smart.sku_asn_allocated_units( $$ || quote_literal('%1$s') || $$ ) GROUP BY dc_code, article, size)b
                        USING (dc_code, article, size)
                    ) a
                    GROUP BY 1, 2, 3
                )
        ,final_inv as materialized (
                    SELECT dc_code,
                           article,
                           foo.size,
                           allocated_qty,
                           COALESCE(SUM(oh),0) as dc_available,
                           COALESCE(SUM(allocated_reserve_qty),0) as allocated_reserve_qty
                    FROM (
                         SELECT dc_code,
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
        	group by dc_code,article,size
        )
        $$; 
        _final_inv_query := format(_final_inv_query,_alloc_code);
        _active_filter := $$AND active$$;
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
            _active_filter := '';
        END IF;
        _query_combine := format($$
            ------ PRODUCT VIEW -  PRODUCT TABLE DATA
             WITH base_table as materialized (
                SELECT article, channel, store store_code,pack_dc_allocation,inventory_source, demand_type, demand, allocated_total, min,max,oh,oo,it,lt_forecast,wos,carfs.retail_size_cd size,
                       oh_oo_intransit, (allocated_total + oh_oo_intransit) / nullif(ros, 0) AS current_wos
                FROM inventory_smart.create_allocation_result_flat_gurobi carfs
                LEFT JOIN global.store_attributes_filter saf ON store_code = store
                WHERE allocation_code = '%1$s' %3$s %2$s
                and carfs.created_at between $$ || quote_literal(_pm_date::timestamp) || $$ and $$ || quote_literal(_pm_date::timestamp + interval '1 day') || $$
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
        ,size_order as (
		-- Get size order for article-size combination
        	select
        		article,
        		ft.size,
        		ast.order
        	from (select distinct article, size from base_table)ft
        	join (select article, product_code, size from global.product_attributes_filter) paf
        		using (article, size)
        	join (select distinct product_code, size, x.order from inventory_smart.article_status_tag x) ast
        		on paf.product_code = ast.product_code and paf.size=ast.size
        	group by 1,2,3
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
                    %5$s
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
			fi.dc_code as dc,
			paf.l0_name,
			paf.l1_name ,
			paf.l2_name,
			paf.l3_id_name,
			paf.l4_id,
            paf.color_name,
            paf.brand,
            paf.style,
			sa.lw_qty,
			sa.lw_margin,
			slo.oh,
			slo.it,
			slo.oo,
            slo.wos,
			so.order as order
		from
			article_level_base_table alb
	        LEFT JOIN final_inv fi USING(article)
	        LEFT JOIN paf_details paf USING (article, size)
	        left join sales_aggregate sa using(article)
	        left join store_level_oh slo using(article)
	        left join net_available_count nac using(article, dc_code,size)
            left join size_order so using(article, size)
        $$, $2, _store_filter, _article_filter, _final_inv_query, _active_filter);
        raise notice '%', _query_combine;
        OPEN $1 FOR execute _query_combine;  
        perform  global.sp_log(v_gen_random_uuid,'inventory_smart.finalize_product_view', 'Before Return',_query_combine,jsonb_build_object('allocation_code', $2, 'store_code' ,$3,'ignore_allocation_code', $4, 'article_filter', $5 ,'type',$6));
        RETURN $1;
    END
$function$
;
