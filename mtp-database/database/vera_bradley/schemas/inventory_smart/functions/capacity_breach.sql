--liquibase formatted sql
--changeset ajun.ravi@impactanalytics.co runOnChange:true stripComments:false splitStatements:false context:MTP-21951 labels:MTP-21951
--comment: Excluded_non-breached_stores_from_the_list
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.capacity_breach(character varying, character varying, character varying);
CREATE OR REPLACE FUNCTION inventory_smart.capacity_breach(character varying, character varying, character varying)
 RETURNS TABLE(l0_name character varying, l1_name character varying, l2_name character varying, article character varying, channel character varying, size character varying, store_code character varying, store_name character varying, loose_units_allocated integer, pack_units_allocated integer, packs_allocated character varying, packs_allocated_qty json, "order" smallint, unit_capacity integer, net_available_capacity integer, net_capacity integer, oh_it_oo integer, current_allocation_for_store integer, dept_store_allocated_units_other integer, net_available integer, week_to_date_sales bigint, last_day_sales bigint, sales_1_ago bigint, sales_2_ago bigint, sales_3_ago bigint, sales_4_ago bigint, lw_qty bigint, lw_revenue real, sales_revenue_1_ago real, sales_revenue_2_ago real, sales_revenue_3_ago real, sales_revenue_4_ago real, week_to_date_sales_revenue real, last_day_sales_revenue real, grade character varying, district character varying, state character varying, climate character varying, style_description character varying, lw_margin numeric, price numeric, promo numeric, parent_article character varying, pack_description character varying, color character varying)
 LANGUAGE plpgsql
AS $function$
   /* 
    * Function/Procedure name: inventory_smart.capacity_breach
    * Created by: Renugopal S
    * Created at: 01-01-2023
    * No of input parameter: 2
    * Parameter Description : 
    *                         1 = Allocation Code
    * 						  2 = Article List
    * 						  3 = PO or default
   
    * Purpose: 
    * This function is created to calculate capacity breach after allocation at a store department(l1) level
    * Finalize screen of Allocate flow - 3rd tab
    * Calling Statement:
   	 select * from inventory_smart.capacity_breach_2
   	     ('6_250_FactoryLineRetail_20230626T101741', '', '');
    *
    *
    * if any modification done in same function/procedure please record the changes in below format
    *
    * Updated_by       Updated_on      Purpose
    * ----------       -----------     --------
    *
    */
declare
	_query_combine text:= '';
	_article_filter text := '';
	_final_inv_query text := '';
   
	begin
        	IF ($2 = '') IS FALSE
 	THEN
    	_article_filter = format($$AND article IN ('%s')$$, $2);
 	END IF;
        
	CASE $3
	        WHEN 'PO'
        THEN
			_final_inv_query := $$
                ,current_allocation as (
                    SELECT a.article, a.dc_code, a.size, a.pack_type_id, SUM(oh) oh, SUM(oh_eaches) oh_eaches, SUM(oh_packs) oh_packs
                    FROM (
                	    SELECT article, dc_code, channel, size, pack_type_id FROM packs_base
                        GROUP BY 1, 2, 3, 4, 5
                    ) a 
                    LEFT JOIN inventory_smart.sku_po_available_units po --for specific PO
                    ON a.article = po.article AND a.channel = po.channel AND a.dc_code = po.po_code AND a.size = po.size AND a.pack_type_id = po.pack_type_id
                    GROUP BY 1, 2, 3, 4
                )
                ,other_allocations as (
                    SELECT article, dc_code, size, pack_type_id, SUM(quantity) allocated_reserve_qty, SUM(eaches_allocated) eaches_allocated, SUM(packs_allocated) packs_allocated
                    FROM (
                	    SELECT article, dc_code, channel, size, pack_type_id FROM packs_base
                        GROUP BY 1, 2, 3, 4, 5
                    ) a 
                    JOIN inventory_smart.sku_po_allocated_units USING (dc_code, article, size, pack_type_id, channel)
                    GROUP BY 1, 2, 3, 4
                )
                ,final_inv as (
                    SELECT 
                    	   article,
                    	   l1_name,
                    	   dc_code::text,
                           dc_code::text dc,
                           size,
                           AVG(allocated_qty) allocated_qty,
                           COALESCE(SUM(oh), 0) - COALESCE(SUM(allocated_reserve_qty), 0) - COALESCE(AVG(allocated_qty), 0) as net_available
                    FROM (
                         SELECT 
                               article,
                    	       l1_name,
                         	   dc_code,
                               size,
                               SUM(allocated_qty) as allocated_qty
                        FROM packs_detail
                        GROUP BY 1, 2, 3, 4
                    ) foo
                    LEFT JOIN current_allocation USING (dc_code, size, article)
                    LEFT JOIN other_allocations USING (dc_code, size, article)
                   -- LEFT JOIN global.distribution_centres dcs using(dc_code) 
                    GROUP BY 1, 2, 3, 4, 5
                )

            $$;
		ELSE
			_final_inv_query := $$
                ,current_allocation as (
                    SELECT article, dc_code, size, pack_type_id, SUM(oh) oh, SUM(oh_eaches) oh_eaches, SUM(oh_packs) oh_packs
                    FROM (
                	    SELECT article, dc_code::int dc_code, channel, size, pack_type_id FROM packs_base
                        GROUP BY 1, 2, 3, 4, 5
                    ) a 
				    JOIN inventory_smart.sku_dc_available_units USING(article, channel, dc_code, size, pack_type_id)
                    GROUP BY 1, 2, 3, 4
                )
                ,reserve_allocation as (
                    SELECT article, dc_code, size, size pack_type_id, SUM(COALESCE(quantity,0)) user_reserve_qty 
                    FROM (
                        SELECT dc_code::int dc_code, article, size, channel FROM packs_base
                        GROUP BY 1, 2, 3, 4
                    ) am
                    LEFT JOIN inventory_smart.sku_dc_reserved_units sdru 
                    USING (dc_code, article, size, channel)
                    GROUP BY 1, 2, 3, 4
                )
                ,other_allocations as (
                    SELECT article, dc_code, size, pack_type_id, SUM(quantity) allocated_reserve_qty, SUM(eaches_allocated) eaches_allocated, SUM(packs_allocated) packs_allocated
                    FROM (
                	    SELECT article, dc_code::int dc_code, channel, size, pack_type_id FROM packs_base
                        GROUP BY 1, 2, 3, 4, 5
                    ) a 
				    JOIN inventory_smart.sku_dc_allocated_units USING(article, channel, dc_code, size, pack_type_id)
                    GROUP BY 1, 2, 3, 4
                )
                ,final_inv as (
                    select
                    	   article,
                    	   l1_name,
                    	   dc_code::text dc_code,
                           dcs.name dc,
                           size,
                           AVG(allocated_qty) allocated_qty, 
                           COALESCE(SUM(oh), 0) - COALESCE(SUM(allocated_reserve_qty), 0) - COALESCE(AVG(allocated_qty), 0) - COALESCE(SUM(user_reserve_qty), 0) as net_available
                    FROM (
                         SELECT 
                         		article,
                         		l1_name,
                         		dc_code::int dc_code,
                               size,
                               SUM(allocated_qty) as allocated_qty
                        FROM packs_detail
                        GROUP BY 1, 2, 3, 4
                    ) foo
                    LEFT JOIN current_allocation USING (article, dc_code, size)
                    LEFT JOIN reserve_allocation USING (article, dc_code, size)
                    LEFT JOIN other_allocations USING (article, dc_code, size)
                    LEFT JOIN global.distribution_centres dcs using(dc_code) 
                    GROUP BY 1, 2, 3, 4, 5
                )
                --select * from final_inv;
            $$;

           
		-- no case for view past since we only have today's capacity
        END CASE;
        raise notice '%', _final_inv_query;
   			
		_query_combine := format($$
				  
		   WITH base_table AS (
		        SELECT carfs.*, channel, store store_code, retail_size_cd size
		        FROM inventory_smart.create_allocation_result_flat_gurobi carfs
		        LEFT JOIN global.store_attributes_filter saf ON store_code = store
		        WHERE 
		       		allocation_code = '%1$s' %2$s
		    )
		  --  select * from base_table;
		    ,flat_table as (
		        SELECT article,
		               store_code,
		               store_name,
		               js.key dc_code, 
		               channel,
		               UNNEST((TRANSLATE((js.value::jsonb->>'packs_allocated')::text, '[]', '{}'))::text[]) pack_type_id,
		               UNNEST((TRANSLATE((js.value::jsonb->>'packs_allocated_qty')::text, '[]', '{}'))::numeric[]) allocated_qty,
		           	   UNNEST((TRANSLATE((js.value::jsonb->>'packs_available_qty')::text, '[]', '{}'))::numeric[]) available_qty        
		        FROM (
		            SELECT article, store_code, store_name, channel, pack_dc_allocation FROM base_table 
		            GROUP BY 1, 2, 3, 4, 5
		        ) foo , JSONB_EACH(pack_dc_allocation) js
		    )  
		   -- select * from flat_table 
		,
		packs as (
		select
			dpc.article,
			ft.dc_code,
			ft.store_code,
			ft.store_name,
			dpc.pack_type_id,
			parent_article pack_description,
			dpc.size,
			ft.channel,
			allocated_qty as packs_allocated_qty,
			ft.allocated_qty * dpc.units_in_pack::double precision as allocated_qty
		from
			inventory_smart.dc_pack_configuration dpc
		join flat_table ft
				using (article,
			pack_type_id)
		  )
		  --select * from packs
		  
		    ,packs_base as (
		  	SELECT ft.article,
		      ft.dc_code,
		      ft.store_code,
		      ft.store_name,
		      ft.pack_type_id,
		      ft.pack_type_id as size,
		      ft.pack_type_id as pack_description,
		      ft.allocated_qty,
		      ft.channel,
		      ft.allocated_qty as packs_allocated_qty,
		      'E' as type
		     FROM flat_table ft
		    WHERE NOT (ft.pack_type_id IN ( SELECT packs.pack_type_id
		             FROM packs))
		  UNION
		   SELECT packs.article,
		      packs.dc_code,
		      packs.store_code,
		      packs.store_name,
		      packs.pack_type_id,
		      packs.size,
		      packs.pack_description,
		      packs.allocated_qty,
		      packs.channel,
		      packs.packs_allocated_qty,
		      'S' as type
		     FROM packs
		  )
		--select * from packs_base;
		,
		packs_detail as (
        select
            article,
            paf.product_code,
            paf.l0_name,
            paf.l1_name,
            paf.l2_name,
            dc_code,
            store_code,
            store_name,
            size,
            channel,
            paf.style_description,
            color,
            SUM(allocated_qty) allocated_qty,
            JSON_OBJECT_AGG(pack_type_id, packs_allocated_qty) filter (
            where type = 'S') packs_allocated_qty,
            SUM(case when type = 'E' then allocated_qty end) as loose_units_allocated,
            SUM(case when type = 'S' then allocated_qty end) as pack_units_allocated,
            STRING_AGG(distinct case when type = 'S' then pack_description end, ',') as packs_allocated
        from
            packs_base
        join "global".product_attributes_filter paf
                using(article,
            size)
        group by
            1,
            2,
            3,
            4,
            5,
            6,
            7,
            8,
            9, 10, 11, 12
            )
		--select * from packs_detail;
		    %3$s
		,other_allocations_to_store_dept as (
  		select
  			store_code,
  			l1_name,
  			channel,
  			max(quantity) as dept_store_allocated_units_other
			--its already summed
  			from
  				packs_detail am
  			join inventory_smart.sku_store_allocated_units
  					using (l1_name, store_code, channel)
  			group by
  				1,
  				2,
  				3
  		)
  	   --select * from other_allocations_to_store_dept;
  		
	   ,store_dept_inv as (
			select
				am.store_code,
				am.l1_name,
				am.channel,
				coalesce(oh, 0) + coalesce(it, 0)  + coalesce(oo, 0) as oh_it_oo
			from
				packs_detail am
			left join inventory_smart.sku_store_inventory sa
					using (store_code, l1_name, channel)
			group by
				1,
				2,
				3,
				4
		)
   		--select * from store_dept_inv;
		,store_article_level_allocations as (
             SELECT 
             	article,
             	l1_name,
             	store_code,
             	--current allocation recommendation
                SUM(allocated_total) as allocated_quantity_store,
                --Net DC Available 
                sum(net_available) as net_available,
                coalesce(sum(aid.week_to_date_sales), 0) as week_to_date_sales,
				coalesce(sum(aid.last_day_sales), 0) as last_day_sales,
				coalesce(sum(aid.sales_1_ago), 0) as sales_1_ago,
				coalesce(sum(aid.sales_2_ago), 0) as sales_2_ago,
				coalesce(sum(aid.sales_3_ago), 0) as sales_3_ago,
				coalesce(sum(aid.sales_4_ago), 0) as sales_4_ago,
				coalesce(sum(aid.lw_qty), 0) as lw_qty,
				coalesce(sum(aid.lw_revenue), 0) as lw_revenue,
				round(coalesce(sum(lw_margin), 0)::decimal,2) as lw_margin,
                round(coalesce((sum(lw_revenue) / nullif( sum(lw_qty), 0 )),0)::decimal,2) as price,
                round(coalesce(avg(promo_percentage),0)::decimal,2) as promo,
				coalesce(sum(sales_revenue_1_ago), 0) as sales_revenue_1_ago,
				coalesce(sum(sales_revenue_2_ago), 0) as sales_revenue_2_ago,
				coalesce(sum(sales_revenue_3_ago), 0) as sales_revenue_3_ago,
				coalesce(sum(sales_revenue_4_ago), 0) as sales_revenue_4_ago,
				coalesce(sum(week_to_date_sales_revenue), 0) as week_to_date_sales_revenue,
				coalesce(sum(last_day_sales_revenue), 0) as last_day_sales_revenue
            FROM base_table bt
            left join final_inv using(article, size)
            left join inventory_smart.article_inventory_dashboard aid using(article, store_code)
            GROUP BY 1, 2, 3
        )
	    --select * from store_article_level_allocations;
        -- store - l1_name level capacity calculation
		,
		capacity_calculation as (
		select 
				sal.store_code, 
				sal.l1_name,
				round(suc.unit_capacity) unit_capacity,
			    coalesce (sdi.oh_it_oo, 0) oh_it_oo,
			    coalesce (oas.dept_store_allocated_units_other, 0) dept_store_allocated_units_other,
				round(suc.unit_capacity) - coalesce (sdi.oh_it_oo, 0)
					- coalesce (sal.allocated_quantity_store, 0) - coalesce (oas.dept_store_allocated_units_other, 0) as net_capacity
		from 
				(
			select
				store_code,
				l1_name,
				sum(allocated_quantity_store) allocated_quantity_store
			from
				store_article_level_allocations
			group by
				1,
				2)
				sal
				left join store_dept_inv sdi using(store_code, l1_name)
				left join other_allocations_to_store_dept oas using(l1_name, store_code)
		left join inventory_smart.store_unit_capacity suc  
				on
			product_hierarchy = sal.l1_name
			and sal.store_code = suc.store_code
		
			)
       -- select * from capacity_calculation;
		,store_info as (
			select store_code, article, grade, district, state, climate from 
			global.store_attributes_filter saf 
			inner join inventory_smart.article_store_grade asg 
			using(store_code)
	    )
	    --select * from store_info;

	  --article - size - store level allocations including packs
	  ,article_size_store_cte as ( 
	  	select 
	  		pd.l0_name,
	  		pd.l1_name,
	  		pd.l2_name,
	  		pd.article,
	  		pd.channel,
	  		pd.size::varchar,
	  		pd.store_code,
	  		pd.store_name,
	  		--pd.dc_code,     
	  		pd.loose_units_allocated::integer,
	  		pd.pack_units_allocated::integer,
	  		pd.packs_allocated::varchar,
	  		pd.packs_allocated_qty::json,
			ast.order,
	  		cc.unit_capacity::integer,
	  		cc.net_capacity::integer as net_available_capacity,
			cc.net_capacity::integer,
	  		cc.oh_it_oo::integer,
	  		sal.allocated_quantity_store::integer as current_allocation_for_store,
	  		cc.dept_store_allocated_units_other::integer,
	  		sal.net_available::integer,
	  		coalesce(sal.week_to_date_sales, 0) as week_to_date_sales,
			coalesce(sal.last_day_sales, 0) as last_day_sales,
			coalesce(sal.sales_1_ago, 0) as sales_1_ago,
			coalesce(sal.sales_2_ago, 0) as sales_2_ago,
			coalesce(sal.sales_3_ago, 0) as sales_3_ago,
			coalesce(sal.sales_4_ago, 0) as sales_4_ago,
			coalesce(sal.lw_qty, 0) as lw_qty,
			coalesce(sal.lw_revenue, 0) as lw_revenue,
			coalesce(sal.sales_revenue_1_ago, 0) as sales_revenue_1_ago,
			coalesce(sal.sales_revenue_2_ago, 0) as sales_revenue_2_ago,
			coalesce(sal.sales_revenue_3_ago, 0) as sales_revenue_3_ago,
			coalesce(sal.sales_revenue_4_ago, 0) as sales_revenue_4_ago,
			coalesce(sal.week_to_date_sales_revenue, 0) as week_to_date_sales_revenue,
			coalesce(sal.last_day_sales_revenue, 0) as last_day_sales_revenue,
			saf.grade,
			saf.district,
			saf.state,
			saf.climate,
			pd.style_description,
			sal.lw_margin,
			sal.price,
			sal.promo,
			dpc.parent_article, dpc.pack_description,
			pd.color
	  	from 
	  		packs_detail pd
		LEFT JOIN inventory_smart.article_status_tag ast USING (product_code, channel)
	  	left join capacity_calculation cc using(l1_name, store_code)
	  	left join store_article_level_allocations sal using(article, store_code)
	    left join store_info saf using (store_code, article)
	    left join inventory_smart.dc_pack_configuration  dpc on dpc.article = pd.article
		where cc.net_capacity < 0
	    order by ast.order
	  )
		select assc.* from article_size_store_cte assc;

	  $$, $1, _article_filter, _final_inv_query);

   			raise notice '%', _query_combine;
             --  OPEN $1 FOR execute _query_combine;  
              --raise notice 'aha';
   		RETURN QUERY execute _query_combine;	

           end
   $function$
;
