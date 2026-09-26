--liquibase formatted sql
--changeset kamuju.mahaveer:po_finalize_product_store_size changes runOnChange:true stripComments:false splitStatements:false context:MTP-124224
--comment: MTP-124224 | PO Allocation finalize SPs
--rollback: SELECT  1

DROP FUNCTION IF EXISTS inventory_smart.po_finalize_product_store_size_view(refcursor, varchar, varchar, varchar, varchar, varchar, varchar);

CREATE OR REPLACE FUNCTION inventory_smart.po_finalize_product_store_size_view(input refcursor, character varying, character varying, character varying, character varying, character varying, character varying)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
 /* 
  * Function/Procedure name: inventory_smart.po_finalize_product_store_size
  * No of input parameter: 7
  * Parameter Description : $1 = Application name
  *                         $2 = Allocation Code
  *                             $3 = Store code
  *                             $4 = Article code/SKU code
  *                             $5 = Ignore allocation code
								$6 = type
								$7 = pack_type_id(null by default)
  * Purpose: 
  * This function is created to calculate Store View Allocation Summary which is displayed in the 
  * Finalize screen of Allocate flow
  * Calling Statement:
     
     begin;
     select * from inventory_smart.po_finalize_product_store_size
         ('my_cur',
          '3_aignet_test_allocation_1',
         '',
        '20339848');
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
    _store_filter1 text;
    _store_filter2 text;
    _article_filter text;
    _final_inv_query text;
    _priority_allocation text;
	vl_textQuery text;
	start_time timestamp;
	end_time timestamp;
	v_gen_random_uuid text  := gen_random_uuid()::varchar;
	_pm_date date;
	_query text;
    _alloc_code text;
    begin
        _query :=  'select date(created_at) from inventory_smart.plan_master where plan_code = %L';
        if $5 = '' then 
           _alloc_code := $2;
        else
            _alloc_code := $5;
        end if; 
        _query := format(_query, _alloc_code);
        execute _query into _pm_date;
        raise notice 'pm_date: %', _pm_date;

        _store_filter1 := '';
        _article_filter := '';
        _store_filter2 := '';
        _priority_allocation := '';
        

        if ($3 = '') IS FALSE
            then
                _store_filter1 := format($$WHERE store_code = '%s'$$, $3);
                _store_filter2 := format($$WHERE a.store_code = '%s'$$, $3);
            end if;
        if ($4 = '') IS FALSE
            then
                _article_filter := format($$AND carfs.article = '%s'$$, $4);
        end if;
		IF ($6 = 'allocated')
            THEN
                _final_inv_query := $$
				,current_avail as materialized (
						SELECT  po_code::text as dc_code, article, size, pack_type_id, oh, oh_packs
						FROM inventory_smart.sku_po_available_units 
						where article is not null
				)
				,current_available as (
                    SELECT dc_code, pack_type_id, size, avg(oh_packs) oh
                    FROM (
                        SELECT article, size, pack_type_id, dc_code FROM packs GROUP BY 1, 2, 3, 4
                    ) a 
                    LEFT JOIN  current_avail b
                    USING(dc_code, pack_type_id, article, size)
                    GROUP BY 1, 2, 3)  
				,other_allocations as (
            SELECT dc_code, pack_type_id, size, avg(allocated_reserve_qty) as allocated_reserve_qty
            FROM (
                SELECT dc_code, article, pack_type_id, size, 
				case when pack_type = 'packs' 
					then COALESCE(quantity,0)/ COALESCE(units_in_pack,1)
					else COALESCE(quantity,0)/ COALESCE(packs_rounding_factor,1) 
					end as allocated_reserve_qty
                FROM (
                    SELECT dc_code, article, pack_type_id, size, pack_type, units_in_pack, packs_rounding_factor FROM packs
                    GROUP BY 1, 2, 3, 4, 5, 6, 7
                ) am
                JOIN (select * from inventory_smart.sku_po_allocated_units( $$ || quote_literal('%1$s') || $$ ))b
                USING (dc_code, article, size, pack_type_id)
            ) a
            GROUP BY 1, 2 , 3
        )
		,net_availble_count_pre as materialized (
			select 
				dc_code,
				pack_type_id, 
				size,
				(COALESCE(sum(packs_allocated_qty),0) + COALESCE(avg(allocated_reserve_qty),0)) as total_allocated,
				(COALESCE(avg(allocated_reserve_qty),0)) as total_reserved
			from final_inv
			left join other_allocations using(dc_code, pack_type_id, size)
			group by dc_code, pack_type_id, size
		)
		,net_availble_count as (
			select 
				dc_code,
				pack_type_id, 
				size,
				(COALESCE(avg(ca.oh),0) - COALESCE(avg(nacp.total_allocated),0)) as dc_available,
				(COALESCE(avg(ca.oh),0) - COALESCE(avg(nacp.total_reserved),0)) as bulk_dc_available
			from net_availble_count_pre nacp
			left join current_available ca using(dc_code, pack_type_id, size)
			group by dc_code, pack_type_id, size
		)
		$$;
		_final_inv_query := format(_final_inv_query,_alloc_code);
	ELSE
        _final_inv_query := $$
			,net_availble_count as (
					select dc_code, pack_type_id, size, (COALESCE(avg(dc_available_packs),0) - COALESCE(sum(packs_allocated_qty),0))  as  dc_available, COALESCE(avg(dc_available_packs),0)  as  bulk_dc_available
					from final_inv
					group by dc_code, pack_type_id, size
				)
				$$;
	 END IF;
	
        _query_combine := format($$
            ------ PRODUCT VIEW - STORE LEVEL - TABLE DATA
		with base_table as materialized (SELECT carfs.article,carfs.store_start_date::date, 			
							carfs.store_end_date::date,carfs.allocated_total,carfs.oh,carfs.oo,carfs.it,carfs.aps,carfs.ros,carfs.shipping_date,
							  carfs.wos, carfs.pack_dc_allocation, carfs.min, carfs.max,store store_code, updated_oh_oo_it, demand, demand_type, saf.store_name, saf.climate,saf.s2_name as country, carfs.store_grade, carfs.inventory_source, carfs.retail_size_cd as size, allocation_strategy
		FROM inventory_smart.create_allocation_result_flat_gurobi carfs
		join global.store_attributes_filter saf on saf.store_code = carfs.store
		WHERE carfs.created_at between $$ || quote_literal(_pm_date::timestamp) || $$ and $$ || quote_literal(_pm_date::timestamp + interval '1 day') || $$ and allocation_code = '%1$s' %2$s
		)
		,flat_table as (SELECT article,
			   store_code,
			   js.key::text as dc_code, 
			   size,
			   js.value,
			   UNNEST((TRANSLATE((js.value::jsonb->>'packs_allocated')::text, '[]', '{}'))::text[]) pack_type_id,
			   UNNEST((TRANSLATE((js.value::jsonb->>'packs_allocated_qty')::text, '[]', '{}'))::numeric[]) packs_allocated_qty,
			   UNNEST((TRANSLATE((js.value::jsonb->>'packs_available_qty')::text, '[]', '{}'))::numeric[]) available_qty,
			   UNNEST((TRANSLATE((js.value::jsonb->>'pack_rounding_factor')::text, '[]', '{}'))::numeric[]) packs_rounding_factor 
		FROM (
			SELECT * FROM base_table 
		) foo , JSONB_EACH(pack_dc_allocation) js group by 1,2,3,4,5,6,7,8,9)
	,packs as materialized(SELECT article,
			   dc_code::text as dc_code,
			   store_code,
			   pack_type_id,
			   size,
			   pack_type,
			   units_in_pack,
			   coalesce(packs_rounding_factor,1) as packs_rounding_factor,
			   available_qty as available_qty_packs,
			   packs_allocated_qty,
			   case 
				when dpc.pack_type = 'packs' then packs_allocated_qty * dpc.units_in_pack::double precision
				else packs_allocated_qty * coalesce(packs_rounding_factor,1)::double precision
			  end as total_allocated_qty,      
			  case 
				when dpc.pack_type = 'packs' then available_qty * dpc.units_in_pack::double precision
				else available_qty * coalesce(packs_rounding_factor,1)::double precision
			  end as available_qty
		FROM inventory_smart.dc_pack_configuration dpc
		JOIN flat_table USING (article, pack_type_id,size))
--		select * from packs;
	,final_inv as (select 
						  dc_code::text as dc_code,
						  store_code, 
						  pack_type_id,
						  size, 
						  pack_type,
						  packs_rounding_factor,
						  avg(available_qty_packs) as dc_available_packs ,
						  sum(available_qty) as available_qty,
						  sum(total_allocated_qty) AS total_allocated_qty,
						  avg(packs_allocated_qty) packs_allocated_qty
					from packs p	
					group by 1,2,3,4,5,6
					)
--					select * from final_inv;
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
				country,
				size,
			   sum(demand) as aggregated_demand,
			   SUM(oh) as oh,
			   SUM(oo) as oo,
			   SUM(it) as it,
				round(COALESCE(sum(aps), 0)::numeric, 0)::int as aps,
			   round(sum(min)) as min_store,
			   round(sum(max)) as max_store,
			   SUM(allocated_total) as allocated_quantity,
			   SUM(allocated_total) + SUM(oh) + sum(oo) + sum(it) as total_allocated_qty_oh_oo_it,
			   COALESCE(SUM(min_allocation), 0) as min_allocation,
			   COALESCE(SUM(wos_allocation), 0) as wos_allocation,
			COUNT( DISTINCT( CASE WHEN allocated_total > 0 THEN article END)) as style_color_cnt
		FROM (
			SELECT article,
				   store_code,
				   store_name,
				   store_grade,
					country,
					size,
				   sum(demand) demand,
				   COALESCE(sum(MIN), 0) MIN,
				   COALESCE(sum(MAX), 0) MAX,
				   COALESCE(SUM(min_allocation), 0) as min_allocation,
				   COALESCE(SUM(wos_allocation), 0) as wos_allocation,
				   COALESCE(sum(oh), 0) oh,
				   COALESCE(sum(oo), 0) oo,
				   COALESCE(sum(it), 0) it,
					COALESCE(sum(aps), 0) as aps,
				   COALESCE(SUM(allocated_total), 0) allocated_total
			FROM base_table_min_wos bt
			GROUP BY 1, 2, 3, 4, 5, 6
		) as st
		GROUP BY 1, 2, 3, 4, 5)
    ,sales_aggregate as (
    select 
                store_code,
            round(coalesce(sum(lw_qty),0)) as lw_qty,
            round(coalesce(sum(wtd_sales_units),0)) as wtd_sales_units
            from (
            select article,
                    store_code,
                    avg(aid.lw_sales_units) as lw_qty,--avg to consider all sizes
                    avg(aid.wtd_sales_units) as wtd_sales_units
            from packs
            left join inventory_smart.article_inventory_dashboard aid using(article, store_code)
            group by 1, 2
        ) a
        group by 1
    )

    ,sales_aggregate_size as (

            select article,
                    store_code,
                    size,
                    round(coalesce(avg(aids.lw_sales_units),0)) as lw_qty_size,
                    round(coalesce(avg(aids.wtd_sales_units),0)) as wtd_sales_units_size
            from packs
            left join inventory_smart.article_inventory_dashboard_size aids using(article, store_code, size)
            group by 1, 2, 3
    )

	,lms_attr_value as (
			select article,
                    store_code,
					lms_attribute_value as lms
			from packs
            left join inventory_smart.lms_attributes using(article, store_code)
			group by 1,2,3
	)
	,store_level_ros as (
		SELECT store_code,
			   store_name,
			   store_grade,
				country,
				round(avg(actual_ros)::numeric,0)::int as actual_ros,
				round(avg(ros)::numeric,0)::int as ros
		FROM (
			SELECT article,
				   store_code,
				   store_name,
				   store_grade,
					country,
					round(avg(
						CASE WHEN wos IS NOT NULL AND wos != 0
						THEN allocated_total::float / wos
						ELSE 0
						END 
					)::numeric,2) as actual_ros,
					round(avg(ros)::numeric,2) as ros
			FROM base_table_min_wos bt
			GROUP BY 1, 2, 3, 4, 5
		) as st
		GROUP BY 1, 2, 3, 4
	)
	,store_level_misc as(select  store_start_date,store_end_date, demand_type, store_code,inventory_source,shipping_date, climate
						from base_table 
						group by 1,2,3,4,5,6,7
	)
	,size_order as (
		-- Get size order for article-size combination
        	select
        		article,
        		ft.size,
        		ast.order
        	from (select distinct article, size, oh from base_table)ft
        	join (select article, product_code, size from global.product_attributes_filter) paf
        		using (article, size)
        	join (select distinct product_code, size, x.order from inventory_smart.article_status_tag x) ast
        		on paf.product_code = ast.product_code
        	group by 1,2,3
        ) 
	,store_dc_metrics as (
		select 
			slb.store_code,
			count(distinct fi.dc_code) as dc_count
		from store_level_base_table slb
		left join final_inv fi using(store_code)
		group by slb.store_code
	)
	SELECT  slb.*,
            fi.dc_code, 
            fi.pack_type_id as packs_allocated,  
            fi.total_allocated_qty,
			--fi.packs_rounding_factor,
            nac.dc_available,
			nac.bulk_dc_available,
            fi.pack_type,
			fi.packs_allocated_qty,
            fi.dc_code as dc,
			sa.wtd_sales_units,
			sa.lw_qty,
			sas.wtd_sales_units_size,
			sas.lw_qty_size,
			store_start_date,
			store_end_date,
			lm.lms,
			slm.shipping_date,
			slm.climate,
			slr.actual_ros,
			slr.ros,
			so.order as order,
            demand_type
    FROM store_level_base_table slb
    LEFT JOIN final_inv fi USING(store_code, size)
    left join sales_aggregate sa using(store_code)
    left join sales_aggregate_size sas using(store_code, size)
	left join store_level_misc slm using(store_code)
	left join net_availble_count nac using(dc_code, pack_type_id, size)
	left join lms_attr_value lm using (store_code)
	left join store_level_ros slr using(store_code)
	left join size_order so using (size)
	left join store_dc_metrics sdm using(store_code)
	%4$s
	order by sdm.dc_count desc, slb.store_code, so.order
	$$, $2, _article_filter,_final_inv_query, _store_filter1);
    raise notice '%', _query_combine;
    OPEN $1 FOR execute _query_combine; 
    RETURN $1;
    end
$function$
;