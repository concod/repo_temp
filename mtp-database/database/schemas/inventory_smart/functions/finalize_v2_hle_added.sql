--liquibase formatted sql
--changeset liquibase:finalize_v1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: MTP-120008 bugfix for net dc avaialble
--rollback: SELECT 1

DROP FUNCTION IF EXISTS  inventory_smart.finalize_v2_hle_added(refcursor, varchar, varchar, varchar, varchar, varchar, varchar, varchar, varchar, jsonb, jsonb, jsonb, jsonb, bool, jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.finalize_v2_hle_added(input refcursor, character varying, character varying, character varying, character varying, character varying, character varying, character varying, varchar, jsonb, jsonb, jsonb, jsonb, boolean, jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
/* 
  * Function/Procedure name: inventory_smart.finalize
  * Created by: Mahaveer Kamuju
  * Created at: 01-DEC-2025
  * No of input parameter: 15
  * Parameter Description : $1 = Application name
  *                         $2 = Allocation Code
  *                             $3 = Store code
  *                             $4 = article filter
                                $5 = Ignore allocation codes
                                $6 = type
                                $7 = plan type based on source of allocation (dc,asn,ns,po)
                                $8 = finalize view 
                                $9 = pack config for the client (packs, eaches, both)
                                $10 = JSON for client specifc product attributes
                                $11 = JSON for client specifc store attributes
                                $12 = JSON for client specifc additional attributes
                                $13 = JSON for VIEW specifc aggregations
								$14 = Size order required
								$15 = JSON for client specifc Gurobi attributes
  * Purpose: 
  * This function is created to calculate Store View Allocation Summary which is displayed in the 
  * Finalize screen of Allocate flow
  * Calling Statement:
     begin;
     select * from inventory_smart.finalize
         ('my_cur',
          '6_155_PFS_20230519T071512',
         '',
         '',
        '',
       'allocated',
       'dc',
       'product_view',
       'packs',
       '{}'::JSONB,
       '{}'::JSONB,
       '{}'::JSONB,
       '{
            "fv_select_str": " dc_code, dc,  size",
            "fv_group_by_str": " dc_code, dc, size"
		}'::JSONB,
       false,
       '{}'::JSONB);
      FETCH ALL IN "my_cur";
     commit;

	based on view please update the view specific aggregations in the function call based on the specified JSON below
	"product_summary": {
                "fv_select_str": " dc_code, dc,  size",
                "fv_group_by_str": " dc_code, dc, size"
				}
	"product_view": {
                "fv_select_str": " article, dc_code, dc, size",
                "fv_group_by_str": " article, dc_code, dc, size"
				}
	"product_store_view": {
                "fv_select_str": " dc_code, store_code, store_grade, dc, pack_type_id as packs_allocated, pack_type",
                "fv_group_by_str": " dc_code, store_code, store_grade, dc, pack_type_id, pack_type"
				}
	"store_summary": {
                "fv_select_str": " store_grade, dc_code, dc",
                "fv_group_by_str": " store_grade, dc_code, dc"
				}
	"store_view": {
                "fv_select_str": " store_code, store_grade, dc_code, dc",
                "fv_group_by_str": " store_code, store_grade, dc_code, dc"
				}
  * if any modification done in same function/procedure please record the changes in below format
  *
  * Updated_by       Updated_on      Purpose
  * ----------       -----------     --------
  * Mahaveer Kamuju   11-DEC-2025    MTP-120008 bugfix for net dc avaialble
  */

DECLARE
    _store_filter text;
    _article_filter text;
    _active_filter text;
	_pm_date date;
    _alloc_code text;
    _allocated_units_function TEXT;
    _available_units_function TEXT;
	_size_order_query TEXT;
	_size_order_join TEXT;
	_paf_join_condition TEXT;
	_paf_select_str TEXT;
	_paf_group_by_str TEXT;
	_paf_final_select_str TEXT;
	_paf_final_group_by_str TEXT;
	_saf_join_condition TEXT;
	_saf_select_str TEXT;
	_saf_group_by_str TEXT;
	_saf_final_select_str TEXT;
	_saf_final_group_by_str TEXT;
	_hle_allocated_select_cols TEXT;
	_hle_allocated_outer_group_by TEXT;
	dc_pack_inv_final_query TEXT;
	net_inv_count_final_query TEXT;
	_hle_enabled BOOLEAN := false;
    _query text;
    _reserve_allocation_cte TEXT;
    _final_inv_query TEXT;
    _query_combine TEXT;
	v_gen_random_uuid text  := gen_random_uuid()::varchar;
	_finalize_view TEXT:= $8;
    param_pack_config_type TEXT:= $9;
    param_product_attr JSONB:= $10;
    param_store_attr JSONB:= $11;
    param_additional_metrics JSONB:= $12;
    param_finalize_view_attr JSONB:= $13;
	_size_order_req BOOLEAN := $14;
    param_gurobi_attr JSONB:= $15;
	
BEGIN
    -- Determine source functions based on source_type parameter
    CASE $7
        WHEN 'ns' THEN 
            _allocated_units_function := 'inventory_smart.sku_ns_allocated_units';
            _available_units_function := 'inventory_smart.sku_ns_available_units';
        WHEN 'dc' THEN 
            _allocated_units_function := 'inventory_smart.sku_dc_allocated_units';
            _available_units_function := 'inventory_smart.sku_dc_available_units';
        WHEN 'po' THEN 
            _allocated_units_function := 'inventory_smart.sku_po_allocated_units';
            _available_units_function := 'inventory_smart.sku_po_available_units';
        WHEN 'asn' THEN 
            _allocated_units_function := 'inventory_smart.sku_asn_allocated_units';
            _available_units_function := 'inventory_smart.sku_asn_available_units';

        ELSE RAISE EXCEPTION 'Invalid source_type: %. Must be one of: ns, dc, po, asn', $7;
    END CASE;	

	_query :=  'select date(created_at) from inventory_smart.plan_master where plan_code = %L';
        if $5 = '' then 
            _alloc_code := $2;	 
        else
            _alloc_code := $5;
        end if; 
        _query := format(_query, _alloc_code);
        execute _query into _pm_date;
        raise notice 'pm_date: %', _pm_date;

        if ($3 = '') IS FALSE
            then
                _store_filter := format($$ AND  carfs.store in ('%s')$$, $3);
            end if;
        if ($4 = '') IS FALSE
            then
                _article_filter := format($$ AND carfs.article in ('%s')$$, $4);
        end if;
        raise notice 'all variables created';
    -- Reserve allocation CTE (built separately to keep formatting simple)
	CASE 
		WHEN _finalize_view = 'product_summary' AND _size_order_req then
			_size_order_query:= format($fmt$
					,size_order_cte as materialized 
					(
					SELECT 
						elem ->> 'size'  AS size,
						max(elem ->> 'order') AS pack_size_order
					FROM inventory_smart.ph_master pm
					CROSS JOIN LATERAL jsonb_array_elements(to_jsonb(pm.product_code_size_map)) AS j(elem)
					where article in (select distinct article from dc_pack_config )
					group by 1)
				$fmt$,
				_article_filter);
			_size_order_join:= ' join size_order_cte USING(size)';
		WHEN _finalize_view in ('product_view','product_store_view') AND _size_order_req then
			_size_order_query:= format($fmt$
					,size_order_cte as materialized
					(
					SELECT 	
						article,
						elem ->> 'size'  AS size,
						max(elem ->> 'order') AS pack_size_order
					FROM inventory_smart.ph_master pm
					CROSS JOIN LATERAL jsonb_array_elements(to_jsonb(pm.product_code_size_map)) AS j(elem)
					where article in (select distinct article from dc_pack_config )
					group by 1,2 )
				$fmt$,
				_article_filter) 
			;
			_size_order_join:= ' join size_order_cte USING(article,size)';
		ELSE 
			_size_order_query:= ''
			;
			_size_order_join:= '';
	END CASE;

	-- HLE enable logic
	CASE
		WHEN _finalize_view IN ('product_view', 'store_view') THEN
			_hle_enabled := true; --If needed drive this from client specific BE config
		ELSE
			_hle_enabled := false;
	END CASE;

	-- HLE enabled columns logic
	IF _hle_enabled = true THEN
		IF _finalize_view = 'store_view' THEN
			_hle_allocated_select_cols := 'dc_code, store_code';
			_hle_allocated_outer_group_by := 'dc_code, store_code';
		ELSE
			_hle_allocated_select_cols := 'dc_code, article';
			_hle_allocated_outer_group_by := 'dc_code, article';
		END IF;
		dc_pack_inv_final_query := format($fmt$
		,hle_allocated as materialized (
			SELECT 
				%1$s,
				round(COALESCE(SUM(CASE WHEN pack_type = 'packs' THEN avg_packs_allocated_qty ELSE 0 END), 0)) as adl_packs_allocated,
				round(COALESCE(SUM(CASE WHEN pack_type = 'eaches' THEN avg_packs_allocated_qty ELSE 0 END), 0)) as adl_eaches_allocated
			FROM (
				SELECT 
					dc_code, dc, article, store_code,
					pack_type_id,
					pack_type,
					AVG(packs_allocated_qty) as avg_packs_allocated_qty
				FROM dc_pack_inv_base
				GROUP BY dc_code, dc, article, store_code, pack_type_id, pack_type
			) avg_by_store
			GROUP BY %2$s
		)
		,dc_pack_inv as materialized(
			select dc_code, dc, article, store_code, pack_type_id, pack_type,size, units_in_pack,
				dc_available_packs , available_qty, total_allocated_qty, packs_allocated_qty,pack_rounding_factor,
				sum(total_allocated_qty) over (
					PARTITION BY p.article
				) as article_allocated_qty,
				sum(total_allocated_qty) over (
					PARTITION BY p.store_code
				) as store_allocated_qty
				,ha.adl_packs_allocated, ha.adl_eaches_allocated
			from dc_pack_inv_base p		
			left join hle_allocated ha using (%1$s)
		)
		$fmt$,
		_hle_allocated_select_cols,
		_hle_allocated_outer_group_by);
		
		net_inv_count_final_query := format($fmt$
		,hle_net_available_base as materialized (
			SELECT 
				dc_code,
				pack_type_id,
				article,
				pack_type,
				round(COALESCE(SUM(dc_available) / NULLIF(SUM(units_in_pack), 0), 0)) as avg_packs_available,
				round(COALESCE(SUM(bulk_dc_available) / NULLIF(SUM(units_in_pack), 0), 0)) as avg_packs_available_before_allocation
			FROM net_inv_count_base
			GROUP BY dc_code, pack_type_id, article, pack_type
		)
		,hle_net_available as materialized (
			SELECT 
				article,
				dc_code,
				round(COALESCE(SUM(CASE WHEN pack_type = 'packs' THEN avg_packs_available ELSE 0 END), 0)) as adl_packs_net_available, 
				round(COALESCE(SUM(CASE WHEN pack_type = 'packs' THEN avg_packs_available_before_allocation ELSE 0 END), 0)) as adl_packs_net_available_before_allocation,
				round(COALESCE(SUM(CASE WHEN pack_type = 'eaches' THEN avg_packs_available ELSE 0 END), 0)) as adl_eaches_net_available,
				round(COALESCE(SUM(CASE WHEN pack_type = 'eaches' THEN avg_packs_available_before_allocation ELSE 0 END), 0)) as adl_eaches_net_available_before_allocation
			FROM hle_net_available_base
			GROUP BY article, dc_code
		)
		,net_inv_count as materialized (
			select nicb.*, COALESCE(hna.adl_packs_net_available, 0) as adl_packs_net_available, COALESCE(hna.adl_packs_net_available_before_allocation, 0) as adl_packs_net_available_before_allocation, COALESCE(hna.adl_eaches_net_available, 0) as adl_eaches_net_available, COALESCE(hna.adl_eaches_net_available_before_allocation, 0) as adl_eaches_net_available_before_allocation
			from net_inv_count_base nicb
			left join hle_net_available hna using (article, dc_code)
		)
		$fmt$);
	ELSE 
		dc_pack_inv_final_query := format($fmt$
		,dc_pack_inv as materialized(
			select dc_code, dc, article, store_code, pack_type_id, pack_type,size, units_in_pack,
				dc_available_packs , available_qty, total_allocated_qty, packs_allocated_qty,pack_rounding_factor,
				sum(total_allocated_qty) over (
					PARTITION BY p.article
				) as article_allocated_qty,
				sum(total_allocated_qty) over (
					PARTITION BY p.store_code
				) as store_allocated_qty
				,0 as adl_packs_allocated, 0 as adl_eaches_allocated
			from dc_pack_inv_base p		
		)
		$fmt$);
		_hle_allocated_select_cols := '';
		_hle_allocated_outer_group_by := '';

		net_inv_count_final_query := format($fmt$
		,net_inv_count as materialized (
			select nicb.*, 0 as adl_packs_net_available, 0 as adl_packs_net_available_before_allocation, 0 as adl_eaches_net_available, 0 as adl_eaches_net_available_before_allocation
			from net_inv_count_base nicb
		)
		$fmt$);
	END IF;

	CASE 
		WHEN _finalize_view = 'product_view' then
			_paf_join_condition:= ' left join product_attributes paf using(article) ';
			_paf_select_str:= param_product_attr->>'paf_select_str';
			_paf_group_by_str:= param_product_attr->>'paf_group_by_str';
			_paf_final_select_str:= param_product_attr->>'paf_final_select_str';
			_paf_final_group_by_str:= param_product_attr->>'paf_final_group_by_str';
			_saf_join_condition:= '';
			_saf_select_str:= '';
			_saf_group_by_str:= '';
			_saf_final_select_str:= '';
			_saf_final_group_by_str:= '';
		WHEN _finalize_view in ('store_view','product_store_view') then
			_paf_join_condition:= '';
			_paf_select_str:= '';
			_paf_group_by_str:= '';
			_paf_final_select_str:= '';
			_paf_final_group_by_str:= '';
			_saf_join_condition:= 'left join store_attributes saf using(store_code)';
			_saf_select_str:= param_store_attr->>'saf_select_str';
			_saf_group_by_str:= param_store_attr->>'saf_group_by_str';
			_saf_final_select_str:= param_store_attr->>'saf_final_select_str';
			_saf_final_group_by_str:= param_store_attr->>'saf_final_group_by_str';
		ELSE 
			_paf_join_condition:= '';
			_saf_join_condition:= '';
	END CASE;

    IF $7 = 'dc' THEN
        _reserve_allocation_cte := $res$
        ,reserve_allocation as materialized(
            SELECT dc_code, pack_type_id, size, avg(COALESCE(quantity,0)) user_reserve_qty 
            FROM (
                SELECT dc_code, article, size, pack_type_id FROM dc_pack_config
                GROUP BY 1, 2, 3, 4
            ) am
            LEFT JOIN (
                SELECT * FROM inventory_smart.sku_dc_reserved_units 
                WHERE (article, dc_code) in (SELECT article, dc_code FROM dc_pack_config)
            ) b
            USING (dc_code, article, size, pack_type_id)
            JOIN inventory_smart.dc_pack_configuration dpc USING(article, pack_type_id, size)
            GROUP BY 1, 2, 3
        )$res$;
    ELSE
        _reserve_allocation_cte := $res$
        ,reserve_allocation as materialized(    
            SELECT dc_code, pack_type_id, size, 0 as user_reserve_qty FROM dc_pack_config
            GROUP BY 1, 2, 3
        )$res$;
    END IF;
        raise notice 'reserve CTE created';
    -- Build _final_inv_query using format with tagged dollar-quotes ($fmt$)
    IF $6 = 'allocated' THEN
        _final_inv_query := format($fmt$
        current_available as materialized (
            SELECT dc_code, pack_type_id, "size" ,coalesce(sum(oh),0) as oh
            FROM (SELECT article, size, pack_type_id, dc_code FROM dc_pack_config GROUP BY 1, 2, 3, 4) a 
            LEFT JOIN (SELECT * FROM %1$s ) b
            USING(dc_code, pack_type_id, article, size)
            GROUP BY 1, 2, 3
        )%2$s
        ,other_allocations as materialized (
            select dc_code, pack_type_id, "size", sum(allocated_reserve_qty) allocated_reserve_qty from (
                SELECT allocation_code, dc_code, pack_type_id, "size", sum(allocated_reserve_qty) as allocated_reserve_qty
                FROM (
                    SELECT b.allocation_code, am.dc_code, am.article, am.pack_type_id, am.size, 
                    b.quantity as allocated_reserve_qty
                    FROM (
                        SELECT dc_code, article, pack_type_id, size, pack_type FROM dc_pack_config
                        GROUP BY 1, 2, 3, 4, 5
                    ) am
                    JOIN (select * from %3$s('%4$s') where allocation_code not in ('%4$s'))b
                    --USING (dc_code, article, size, pack_type_id)
                    on am.dc_code = b.dc_code and am.article = b.article and am.size = b.size and
                    (am.pack_type_id = b.pack_type_id or am.size = b.pack_type_id)
                ) a
                GROUP BY 1, 2, 3, 4
            ) c
            group by 1, 2, 3
        )
        ,net_inv_count_base as materialized (
            select dc_code,pack_type_id, "size",units_in_pack,article,pack_type,
				(COALESCE(avg(oh),0) - COALESCE(sum(total_allocated_qty),0) - COALESCE(avg(allocated_reserve_qty),0) - COALESCE(avg(user_reserve_qty),0))  as  dc_available, 
            	(COALESCE(avg(oh),0)  - COALESCE(avg(allocated_reserve_qty),0) - COALESCE(avg(user_reserve_qty),0))  as  bulk_dc_available,
            	COALESCE(avg(allocated_reserve_qty),0) as allocated_reserve_qty, 
				COALESCE(avg(user_reserve_qty),0) as user_reserve_qty
            from dc_pack_inv
            left join current_available using(dc_code, pack_type_id, "size")
            left join reserve_allocation using(dc_code, pack_type_id, "size")
            left join other_allocations using(dc_code, pack_type_id, "size")
            group by dc_code, pack_type_id, "size",units_in_pack,article,pack_type
        )$fmt$,
        _available_units_function,
        _reserve_allocation_cte,
        _allocated_units_function,
        _alloc_code);
		_active_filter := $fmt$ AND active $fmt$;
    ELSE
        _final_inv_query := $fmt$
        net_inv_count_base as materialized (
            select dc_code, pack_type_id, "size",units_in_pack,article,pack_type, 
                (COALESCE(avg(available_qty),0) - COALESCE(sum(total_allocated_qty),0)) as dc_available,
				COALESCE(avg(available_qty),0) as bulk_dc_available,
				0 as allocated_reserve_qty, 
				0 as user_reserve_qty
            from dc_pack_inv
            group by dc_code, pack_type_id, "size", units_in_pack,article,pack_type
        )$fmt$;
		_active_filter := '';
    END IF;
        raise notice 'Final INV CTE created';
    
--    RAISE NOTICE '%', _final_inv_query;

    _query_combine := format($fmt$
        with base_table as materialized (
        	SELECT article, store as store_code, retail_size_cd as size, store_grade, delivery_dt, allocated_total, oh, oo, it, wos, 
        			pack_dc_allocation, min, max,  updated_oh_oo_it, demand, demand_type, inventory_source,
        			greatest(0,MIN - (updated_oh_oo_it)) as min_short, greatest(0, allocated_total - greatest(0, MIN - (updated_oh_oo_it))) as wos_allocation,
    				least(allocated_total,greatest(0,MIN - (updated_oh_oo_it))) as min_allocation
        	FROM inventory_smart.create_allocation_result_flat_gurobi carfs
        	-- WHERE created_at between '2025-09-16 00:00:00' and '2025-09-17 00:00:00' and allocation_code = '6_251_CAN_20250916T052630' 
			WHERE carfs.created_at between '%19$s'  and '%20$s'  and  allocation_code = '%18$s' %17$s %16$s
        )
        ,flat_table as materialized(
        	SELECT article,store_code,
        		   js.key::int dc_code, 
        		   UNNEST((TRANSLATE((js.value::jsonb->>'packs_allocated')::text, '[]', '{}'))::text[]) pack_type_id,
        		   UNNEST((TRANSLATE((js.value::jsonb->>'packs_allocated_qty')::text, '[]', '{}'))::numeric[]) packs_allocated_qty,
        		   UNNEST((TRANSLATE((js.value::jsonb->>'packs_available_qty')::text, '[]', '{}'))::numeric[]) available_qty,
        		   UNNEST((TRANSLATE((js.value::jsonb->>'pack_rounding_factor')::text, '[]', '{}'))::numeric[]) pack_rounding_factor
        	FROM (
        		SELECT * FROM base_table 
        		) foo , JSONB_EACH(pack_dc_allocation) js group by 1,2,3,4,5,6,7)
        		
        ,dc_pack_config as materialized (
        	SELECT dpc.article, ft.dc_code, coalesce(dcs.name, dc_code::text) as dc, ft.store_code, dpc.pack_type_id, dpc.size, dpc.pack_type, dpc.units_in_pack,
        	   ft.available_qty as available_qty_packs,
        	   ft.packs_allocated_qty,
        	   ft.available_qty * dpc.units_in_pack::double precision AS  available_qty,
        	   ft.packs_allocated_qty * dpc.units_in_pack::double precision AS total_allocated_qty,
        	   coalesce(ft.pack_rounding_factor,1) as pack_rounding_factor
        FROM inventory_smart.dc_pack_configuration dpc
        JOIN flat_table as ft on  dpc.article = ft.article and (dpc.pack_type_id = ft.pack_type_id or dpc.size = ft.pack_type_id)
        LEFT JOIN global.distribution_centres dcs using(dc_code)
        --case when %21$s = 'packs' then dpc.pack_type_id = ft.pack_type_id
        --	 when %21$s = 'eaches' then dpc.size = ft.pack_type_id
        --else 
--        	case when dpc.pack_type = 'packs' 
--        		 then dpc.pack_type_id = ft.pack_type_id
--        	else dpc.size = ft.pack_type_id
        --	end
        --end 
        )
       ,dc_pack_inv_base as materialized(
        	select dc_code, dc, article, store_code, pack_type_id, pack_type,size, units_in_pack,pack_rounding_factor,
--        	ARRAY_AGG(size) as size,
        	  avg(available_qty_packs) as dc_available_packs ,
        	  sum(available_qty) as available_qty,
        	  sum(total_allocated_qty) AS total_allocated_qty,
        	  avg(packs_allocated_qty) packs_allocated_qty
        from dc_pack_config p	
        group by 1,2,3,4,5,6,7,8,9
        )
		%27$s
		,%1$s
        ,store_level_base_table as materialized(
    		SELECT article,
    			   store_code,
    			   demand_type,
    			   delivery_dt,
    			   inventory_source,
				   store_grade,
				   max(repeat_factor_article_store) as repeat_factor_article_store,
    			   sum(demand) aggregated_demand,
    			   COALESCE(sum(MIN), 0) min_store,
    			   COALESCE(sum(MAX), 0) max_store,
    			   COALESCE(avg(wos), 0) wos_store,
    			   COALESCE(SUM(min_allocation), 0) as min_allocation,
    			   COALESCE(SUM(wos_allocation), 0) as wos_allocation,
    			   COALESCE(sum(oh), 0) oh,
    			   COALESCE(sum(oo), 0) oo,
    			   COALESCE(sum(it), 0) it,
    			   COALESCE(sum(oh), 0) + COALESCE(sum(oo), 0) + COALESCE(sum(it), 0) as oh_oo_it_total,
    			   COALESCE(SUM(allocated_total), 0) allocated_quantity,
				   COALESCE(CASE WHEN SUM(allocated_total) > 0 then 1 else 0 end ,0) as allocated_count
    		FROM base_table bt
    		left join (
    		select article,store_code, count(1) as repeat_factor_article_store 
    		from dc_pack_inv group by 1,2 
    		) b
    		using(article,store_code)
    		GROUP BY 1, 2, 3, 4, 5, 6
    	)
        ,sales_aggregate as materialized(
			select 
				article,
				store_code
				 %10$s  --format and replace it with config
            from (select distinct article, store_code from dc_pack_config ) a
            left join inventory_smart.article_inventory_dashboard aid using(article, store_code)
            group by article, store_code %11$s
        )
    	, product_attributes as materialized (
    	select article %2$s
    	from "global".product_attributes_filter paf
		where (article,size) in (select distinct article,size from dc_pack_config ) %22$s
    	group by article %3$s
    	)
    	, store_attributes as materialized (
    	select store_code %6$s
    	from global.store_attributes_filter
		where store_code in (select distinct store_code from dc_pack_config )
    	group by store_code %7$s
    	)
		%23$s
		%28$s
    	SELECT  
				%14$s
				%4$s
				%8$s
				%12$s
				,round(max(nac.units_in_pack)) as units_in_pack,
				max(demand_type) as demand_type,
				max(delivery_dt) as delivery_date,
				max(inventory_source) as inventory_source,
	   			round(sum(aggregated_demand/repeat_factor_article_store)::numeric,2) demand,
    			round(sum(min_store/ repeat_factor_article_store )) as "min",
    			round(sum(max_store/ repeat_factor_article_store )) as "max",
    			round(avg(wos_store)) as wos,
    			round(COALESCE(SUM(min_allocation/ repeat_factor_article_store ) , 0)) as min_allocation,
    			round(COALESCE(SUM(wos_allocation/ repeat_factor_article_store ) , 0)) as wos_allocation,
    			round(COALESCE(sum(oh/ repeat_factor_article_store ), 0)) oh,
    			round(COALESCE(sum(oo/ repeat_factor_article_store ) , 0)) oo,
    			round(COALESCE(sum(it/ repeat_factor_article_store ) , 0)) it,
    			round(COALESCE(sum(oh_oo_it_total/ repeat_factor_article_store ),0)) oh_oo_it,
    			round((select count(distinct case when dpi1.store_allocated_qty  > 0 then dpi1.store_code end ) from dc_pack_inv dpi1)) as allocated_stores,
    			round((select count(distinct case when dpi1.article_allocated_qty  > 0 then dpi1.article end ) from dc_pack_inv dpi1)) as no_style_color,
    			coalesce((select count(distinct case when dpi1.store_allocated_qty  > 0 then dpi1.store_code end ) from dc_pack_inv dpi1)/ greatest((select count(distinct case when dpi1.article_allocated_qty  > 0 then dpi1.article end ) from dc_pack_inv dpi1),1),0) as allocated_stores_per_style_color,
    			coalesce((select count(distinct case when dpi1.article_allocated_qty  > 0 then dpi1.article end ) from dc_pack_inv dpi1)/greatest((select count(distinct case when dpi1.store_allocated_qty  > 0 then dpi1.store_code end ) from dc_pack_inv dpi1),1),0) as store_avg,
				round((select count(distinct store_code) from store_level_base_table where allocated_count = 1)) as store_cnt_overall,
				round((select count(distinct article) from store_level_base_table where allocated_count = 1)) as article_cnt_overall,
   				round(COALESCE((SUM(dc_available / NULLIF(coalesce(nac.units_in_pack,1) * pack_rounding_factor, 1)))/count(distinct (dc_code,pack_type_id, "size",store_code)), 0)) AS dc_available_packs,
  				round(COALESCE(SUM(dc_available)/count(distinct (dc_code,pack_type_id, "size",store_code)), 0)) AS net_dc_available,				
  				round(COALESCE(SUM(total_allocated_qty), 0)) AS total_allocated_qty,
  				round(COALESCE(SUM(packs_allocated_qty), 0)) AS packs_allocated_qty,
				round(coalesce(COUNT( DISTINCT case when article_allocated_qty > 0 then article end ),0)) as articles_cnt,
				round(coalesce(COUNT( DISTINCT case when store_allocated_qty > 0 then store_code end ),0)) as stores_cnt,
				round(coalesce(COUNT( DISTINCT article ),0)) as all_articles,
				round(COALESCE(COUNT( DISTINCT store_code ),0)) as all_stores,
				round(COALESCE(SUM(bulk_dc_available)/count(distinct (dc_code,pack_type_id, "size",store_code)), 0)) AS net_available_before_allocation,
				round(coalesce(count(DISTINCT store_code) / greatest(count(DISTINCT article), 1), 1)) as store_avg,
                round(coalesce (SUM(total_allocated_qty) / greatest(count(DISTINCT store_code), 1),1)) as avg_units_per_store,
          		round(coalesce(sum(total_allocated_qty/greatest(article_allocated_qty,1)),0)::numeric,4)*100 AS article_allocated_perc,
          		round(coalesce(sum(total_allocated_qty)/ (SELECT greatest(sum(total_allocated_qty),1) FROM dc_pack_inv),0)::numeric,4)*100 AS store_grade_allocated_perc,
				round(COALESCE(MAX(dpi.adl_packs_allocated), 0)) AS adl_packs_allocated, 
				round(COALESCE(MAX(dpi.adl_eaches_allocated), 0)) AS adl_eaches_allocated,
				round(COALESCE(MAX(nac.adl_packs_net_available), 0)) AS adl_packs_net_available,
				round(COALESCE(MAX(nac.adl_packs_net_available_before_allocation), 0)) AS adl_packs_net_available_before_allocation,
				round(COALESCE(MAX(nac.adl_eaches_net_available), 0)) AS adl_eaches_net_available,
				round(COALESCE(MAX(nac.adl_eaches_net_available_before_allocation), 0)) AS adl_eaches_net_available_before_allocation
        FROM store_level_base_table slb
        left join dc_pack_inv dpi USING(article, store_code)
        left join sales_aggregate sa using(article,store_code)
    	left join net_inv_count nac using(dc_code, article, pack_type_id, "size")
		%24$s
		%25$s
		%26$s
		group by %15$s %5$s %9$s %13$s   
    	$fmt$, 
		_final_inv_query,   --1
		_paf_select_str, --2
    	_paf_group_by_str, --3
    	_paf_final_select_str,  --4
    	_paf_final_group_by_str,  --5
		_saf_select_str, --6
    	_saf_group_by_str, --7
    	_saf_final_select_str, --8
    	_saf_final_group_by_str, --9
		param_additional_metrics->>'add_select_str', --10
    	param_additional_metrics->>'add_group_by_str', --11
    	param_additional_metrics->>'add_final_select_str',  --12
    	param_additional_metrics->>'add_final_group_by_str', --13
		param_finalize_view_attr->>'fv_select_str', --14
		param_finalize_view_attr->>'fv_group_by_str', --15
        _article_filter, --16
        _store_filter, --17
        $2, --18 allocation code
        _pm_date::timestamp , --19
		_pm_date::timestamp + interval '1 day'--20
		,param_pack_config_type, -- 21
		_active_filter, -- 22
		_size_order_query, --23
		_size_order_join, -- 24
		_paf_join_condition, -- 25
		_saf_join_condition, --26
		dc_pack_inv_final_query, --27
		net_inv_count_final_query --28
    );

   	RAISE NOTICE ' %',  _query_combine;
    OPEN $1 FOR execute _query_combine;  
	 perform  global.sp_log(v_gen_random_uuid,'inventory_smart.finalize_v2_hle_added', 'Before Return',_query_combine,jsonb_build_object('allocation_code', $2,'store_code' , $3, 'Article code/SKU code', $4, 'ignore_allocation_code', $5,'type',$6));
     RETURN $1;
END;
$function$
;