--liquibase formatted sql
--changeset liquibase:finalize_product_store runOnChange:true stripComments:false splitStatements:false context:MTP-64351 labels:MTP-64351
--comment: MTP-70658 po flow
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.po_finalize_product_store(refcursor, varchar, varchar, varchar, varchar, varchar);
CREATE OR REPLACE FUNCTION inventory_smart.po_finalize_product_store(input refcursor, character varying, character varying, character varying, character varying, character varying)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
 /* 
  * Function/Procedure name: inventory_smart.finalize_product_store
  * Created by: Manohara Gulla
  * Created at: 30-Jan-2025
  * No of input parameter: 6
  * Parameter Description : $1 = Application name
  *                         $2 = Allocation Code
  *                             $3 = Store code
  *                             $4 = Article code/SKU code
  *                             $5 = Ignore allocation code (not used anymore)
								$6 = type
  * Purpose: 
  * This function is created to calculate Store View Allocation Summary which is displayed in the 
  * Finalize screen of Allocate flow
  * Calling Statement:
     

 
  *
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
    _priority_allocation text;
	vl_textQuery text;
	start_time timestamp;
	end_time timestamp;
	v_gen_random_uuid text  := gen_random_uuid()::varchar;
    begin
        _store_filter := '';
        _article_filter := '';
        _priority_allocation := '';
        

        if ($3 = '') IS FALSE
            then
                _store_filter := format($$AND store = '%s'$$, $3);
            end if;
        if ($4 = '') IS FALSE
            then
                _article_filter := format($$AND carfs.article = '%s'$$, $4);
        end if;
		IF ($6 = 'allocated')
            THEN
                _final_inv_query := $$
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
	,net_availble_count as (
        	select dc_code, size, (COALESCE(avg(dc_available_packs),0) - COALESCE(sum(packs_allocated_qty),0) - COALESCE(avg(allocated_reserve_qty),0))  as  dc_available
        	from final_inv
        	left join other_allocations using(dc_code, size)
        	group by 1,2
        )
--		select * from net_availble_count;
		$$;
	ELSE
        _final_inv_query := $$
			,net_availble_count as (
					select dc_code, size, (COALESCE(avg(dc_available_packs),0) - COALESCE(sum(packs_allocated_qty),0))  as  dc_available
					from final_inv
					group by 1,2
				)
				$$;
	 END IF;
	
        _query_combine := format($$
            ------ PRODUCT-STORE LEVEL TABLE DATA
with base_table as materialized (
		select
				carfs.article,
				carfs.delivery_dt ,
				carfs.ticket_type,
				carfs.allocated_total,
				carfs.oh,
				carfs.oo,
				carfs.it,
				carfs.wos,
				carfs.pack_dc_allocation,
				carfs.min,
				carfs.max,
				store store_code,
				store_grade,
				updated_oh_oo_it,
				demand,
				demand_type,
				saf.store_name,
				carfs.inventory_source,
				carfs.retail_size_cd as size,
				allocation_strategy
			from
				inventory_smart.create_allocation_result_flat_gurobi carfs
			join global.store_attributes_filter saf on
				saf.store_code = carfs.store
			where
				allocation_code = '%1$s' %2$s %4$s
		)
		,flat_table_temp as (
        -- unnest base_table to get pack-dc combinations for article-store data
            SELECT 
					article,
					store_code,
					js.key dc_code, 
					foo.size retail_size_cd,
					UNNEST((TRANSLATE((js.value::jsonb->>'packs_allocated')::text, '[]', '{}'))::text[]) size,
					UNNEST((TRANSLATE((js.value::jsonb->>'packs_allocated_qty')::text, '[]', '{}'))::numeric[]) packs_allocated_qty,
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
        		size packs_allocated,
        		packs_allocated_qty,
        		packs_allocated_qty total_allocated_qty,
        		available_qty,
        		available_qty available_qty_packs
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
	,final_inv as (select 
						  dc_code,
						  store_code, 
						  size,
						  packs_allocated,
						  sum(available_qty_packs) as dc_available_packs ,
						  sum(available_qty) as available_qty,
						  sum(total_allocated_qty) AS total_allocated_qty,
						  sum(packs_allocated_qty) packs_allocated_qty
					from packs p	
					group by 1,2,3,4
					)
	%3$s
     ,base_table_min_wos as  (
			select
				p.*, 
				greatest(0,MIN - (updated_oh_oo_it)) as min_short,
				case 
					when allocation_strategy = 'mins_only' then 0
					when allocation_strategy = 'forecast_only' then allocated_total	
					when allocation_strategy = 'min_forecast' then greatest(0, allocated_total - greatest(0, MIN - (updated_oh_oo_it)))					
				end as wos_allocation,
				case 
					when allocation_strategy = 'mins_only' then allocated_total
					when allocation_strategy = 'forecast_only' then 0
					when allocation_strategy = 'min_forecast' then least(allocated_total,greatest(0,MIN - (updated_oh_oo_it)))					
				end as min_allocation
			from
				base_table p
			)
    ,store_level_base_table as (
		SELECT store_code,
			   store_name,
			   store_grade,
			   sum(demand) as aggregated_demand,
			   SUM(oh) as oh,
			   SUM(oo) as oo,
			   SUM(it) as it,
			   round(sum(min)) as min_store,
			   round(sum(max)) as max_store,
			   SUM(allocated_total) as allocated_quantity,
			   COALESCE(SUM(min_allocation), 0) as min_allocation,
			   COALESCE(SUM(wos_allocation), 0) as wos_allocation,
			COUNT( DISTINCT( CASE WHEN allocated_total > 0 THEN article END)) as style_color_cnt
		FROM (
			SELECT article,
				   store_code,
				   store_name,
				   store_grade,
				   sum(demand) demand,
				   COALESCE(sum(MIN), 0) MIN,
				   COALESCE(sum(MAX), 0) MAX,
				   COALESCE(SUM(min_allocation), 0) as min_allocation,
				   COALESCE(SUM(wos_allocation), 0) as wos_allocation,
				   COALESCE(sum(oh), 0) oh,
				   COALESCE(sum(oo), 0) oo,
				   COALESCE(sum(it), 0) it,
				   COALESCE(SUM(allocated_total), 0) allocated_total
			FROM base_table_min_wos bt
			GROUP BY 1, 2, 3,4
		) as st
		GROUP BY 1, 2,3)
    ,sales_aggregate as (
    select 
                store_code,
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
	,store_level_misc as(select  delivery_dt, demand_type, store_code,inventory_source,ticket_type,
    						CASE 
								WHEN inventory_source='dc' THEN 'B'
								WHEN inventory_source='po' THEN 'L'
								WHEN inventory_source='ns' THEN 'S'
								ELSE '' 
			   				END AS po_type 
						from base_table 
						group by 1,2,3,4,5
	)
	SELECT  slb.*,
            fi.dc_code, 
            fi.size,
            fi.packs_allocated,
            fi.total_allocated_qty,
            nac.dc_available,
            oh+it+oo as oh_it_oo,
			fi.packs_allocated_qty,
            fi.dc_code as dc,
            sa.lw_qty,
            sa.lw_margin,
			delivery_dt,
			ticket_type,
            demand_type,
            po_type,
            'E' as pack_type,
            0 as bulk_dc_available
    FROM store_level_base_table slb
    LEFT JOIN final_inv fi USING(store_code)
    left join sales_aggregate sa using(store_code)
	left join store_level_misc using(store_code)
	left join net_availble_count nac using(size, dc_code)
	$$, $2, _article_filter,_final_inv_query, _store_filter);
    raise notice '%', _query_combine;
    OPEN $1 FOR execute _query_combine;  
	 perform  global.sp_log(v_gen_random_uuid,'inventory_smart.finalize_product_store', 'Before Return',_query_combine,jsonb_build_object('allocation_code', $2,'store_code' , $3, 'Article code/SKU code', $4, 'ignore_allocation_code', $5,'type',$6));
     RETURN $1;
    end
$function$
;