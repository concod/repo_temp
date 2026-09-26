--liquibase formatted sql
--changeset liquibase:scenario_product_store_logic_fix runOnChange:true stripComments:false splitStatements:false context:MTP-85634 labels:MTP-85634
--comment: MTP-93374 | Enhanced scenario product store with multi-allocation type support (normal/PO/new store), fwos logic and allocation comparison
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.scenario_product_store(refcursor, varchar, varchar, varchar, varchar, varchar);

CREATE OR REPLACE FUNCTION inventory_smart.scenario_product_store(input refcursor, character varying, character varying, character varying, character varying, character varying)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
 /* 
  * Function/Procedure name: inventory_smart.scenario_product_store
  * Created by: Manohara G
  * Created at: 02-July-2024
  * No of input parameter: 6
  * Parameter Description : $1 = refcursor name
  *                         $2 = Allocation Code (scenario allocation code)
  *                         $3 = Store code filter
  *                         $4 = Article code/SKU code filter
  *                         $5 = Ignore allocation code
  *                         $6 = Type ('allocated' or other)
  * Purpose: Enhanced scenario product store view with multi-allocation type support and FWOS calculations
  * 
  * Features:
  * - Supports multiple allocation types: Normal (0,2), PO (4), New Store (5)
  * - Dynamically adapts data sources based on allocation type from plan_master
  * - Store-level allocation analysis with detailed pack information and scenario comparison
  * - Future weeks of supply (FWOS) calculations
  * - Conditional reserve allocation handling (only for normal allocations)
  * - Type-specific inventory table usage (dc/po/ns allocated units)
  * - Proper DC code handling (integer for normal/NS, text for PO)
  * - Distribution center lookup bypass for PO allocations
  * - Enhanced scenario vs original comparison support with allocation category tracking
  * 
  * Data Sources by Type:
  * - Normal (0,2): sku_dc_allocated_units
  * - PO (4): sku_po_allocated_units (no reserves)
  * - New Store (5): sku_ns_allocated_units (no reserves)
  * 
  * Dynamic Parameters (used in format string):
  * %1$s - Scenario allocation code (input parameter $2)
  * %2$s - Article filter condition
  * %3$s - Final inventory query (conditional based on $6 type)
  * %4$s - Original allocation code (extracted from scenario code)
  * %5$s - DC code casting (js.key::text for PO; js.key::int for others)
  * %6$s - Other allocations query (type-specific with both original and scenario)
  * %7$s - Other allocations join condition (type-specific)
  * %8$s - Distribution centre join (conditional for type)
  * %9$s - DC name field (dc_code for PO; name for others)
  * 
  * Calling Statement:
     begin;
     select * from inventory_smart.scenario_product_store
         ('my_cur',
          '3_aignet_test_allocation_1_SCENARIO_1',
         '',
        '20339848',
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
    _original_allocation_code text;
    _allocation_type integer;
    _other_allocations_query text;
    _other_allocations_join text;

    begin
        -- Extract original allocation code by splitting on '_SCENARIO'
        _original_allocation_code := SPLIT_PART($2, '_SCENARIO', 1);
        
        -- Get allocation type from plan_master
        raise notice 'Querying plan_master for allocation_code: %', _original_allocation_code;
        
        SELECT "type"::integer INTO _allocation_type 
        FROM inventory_smart.plan_master 
        WHERE plan_code = _original_allocation_code 
        LIMIT 1;
        
        -- Default to type 0 if not found
        _allocation_type := COALESCE(_allocation_type, 0);
        
        raise notice 'Retrieved allocation type: % for allocation_code: %', _allocation_type, _original_allocation_code;
        
        _store_filter1 := '';
        _article_filter := '';
        _store_filter2 := '';
        _priority_allocation := '';
        
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
				,other_allocations_pre as (
					__OTHER_ALLOCATIONS_QUERY_PLACEHOLDER__
			)
        ,other_allocations as (
            SELECT allocation_category, dc_code, pack_type_id, SUM(allocated_reserve_qty) as allocated_reserve_qty
            FROM (
                SELECT allocation_category, dc_code, article, pack_type_id, size, COALESCE(packs_allocated,0) as allocated_reserve_qty
                FROM (
                    SELECT dc_code, article, pack_type_id, size FROM packs
                    GROUP BY 1, 2, 3, 4
                ) am
                join other_allocations_pre b
                __OTHER_ALLOCATIONS_JOIN_PLACEHOLDER__
            ) a
            GROUP BY 1, 2, 3
        )
	,net_availble_count as (
        	select dc_code,pack_type_id, size,(COALESCE(avg(dc_available_packs),0) - COALESCE(sum(packs_allocated_qty),0) - COALESCE(sum(allocated_reserve_qty),0))  as  dc_available, (COALESCE(avg(dc_available_packs),0)  - COALESCE(sum(allocated_reserve_qty),0))  as  bulk_dc_available
        	from final_inv
        	left join (
        		select dc_code, pack_type_id, sum(allocated_reserve_qty) as allocated_reserve_qty
        		from other_allocations 
        		group by dc_code, pack_type_id
        	) oa using(dc_code, pack_type_id)
        	group by dc_code, pack_type_id, size
        )
		$$;
	ELSE
        _final_inv_query := $$
			,net_availble_count as (
					select dc_code, pack_type_id, size, (COALESCE(avg(dc_available_packs),0) - COALESCE(sum(packs_allocated_qty),0))  as  dc_available, COALESCE(avg(dc_available_packs),0)  as  bulk_dc_available
					from final_inv
					group by dc_code, pack_type_id, size
				)
				$$;
	 END IF;
	
	-- Build other allocations query and join condition
	_other_allocations_query := CASE 
		WHEN _allocation_type = 5 THEN 
			'SELECT ''scenario'' as allocation_category, * FROM inventory_smart.sku_ns_allocated_units( ''' || $2 || ''' )
			UNION ALL 
			SELECT ''original'' as allocation_category, * FROM inventory_smart.sku_ns_allocated_units( ''' || _original_allocation_code || ''' )'
		WHEN _allocation_type = 4 THEN 
			'SELECT ''scenario'' as allocation_category, * FROM inventory_smart.sku_po_allocated_units( ''' || $2 || ''' )
			UNION ALL 
			SELECT ''original'' as allocation_category, * FROM inventory_smart.sku_po_allocated_units( ''' || _original_allocation_code || ''' )'
		ELSE 
			'SELECT ''scenario'' as allocation_category, * FROM inventory_smart.sku_dc_allocated_units( ''' || $2 || ''' )
			UNION ALL 
			SELECT ''original'' as allocation_category, * FROM inventory_smart.sku_dc_allocated_units( ''' || _original_allocation_code || ''' )'
	END;
	
	_other_allocations_join := CASE 
		WHEN _allocation_type = 4 THEN 'ON (am.dc_code = b.dc_code AND am.article = b.article AND am.size = b.size AND am.pack_type_id = b.pack_type_id)'
		ELSE 'USING (dc_code, article, size, pack_type_id)'
	END;
	
        _query_combine := format($$
            ------ PRODUCT VIEW - STORE LEVEL - TABLE DATA
		with base_table_temp as materialized (SELECT carfs.article,carfs.delivery_dt ,
							  carfs.allocated_total,carfs.oh,carfs.oo,carfs.it,
							  carfs.wos, carfs.pack_dc_allocation, carfs.min, carfs.max,store store_code, updated_oh_oo_it, demand, demand_type, saf.store_name, saf.climate, saf.q_str_grade,saf.store_concept,saf.center_format_type as store_format,saf.district,saf.precipitation, carfs.inventory_source, carfs.retail_size_cd as size,
							  carfs.oh_oo_intransit,
							  case 
		                            when allocation_code like '%%SCENARIO%%' then 'scenario'
		                            else 'original'
		                       end as allocation_category
		FROM inventory_smart.create_allocation_result_flat_gurobi carfs
		join global.store_attributes_filter saf on saf.store_code = carfs.store
		WHERE carfs.created_at between $$ || quote_literal(_pm_date::timestamp) || $$ and $$ || quote_literal(_pm_date::timestamp + interval '1 day') || $$ and  allocation_code in ('%1$s','%4$s') %2$s
		)
		,scenario_article_store as (
        select article, store_code from base_table_temp where allocation_category='scenario' group by 1, 2
        )
		,base_table as (
        select * from base_table_temp a
        where exists (select 1 from scenario_article_store b where b.article=a.article and b.store_code=a.store_code)
        )
		,flat_table as (SELECT allocation_category,
				   article,
			   store_code,
			   %5$s dc_code, 
			   size,
			   oh_oo_intransit,
			   UNNEST((TRANSLATE((js.value::jsonb->>'packs_allocated')::text, '[]', '{}'))::text[]) pack_type_id,
			   UNNEST((TRANSLATE((js.value::jsonb->>'packs_allocated_qty')::text, '[]', '{}'))::numeric[]) packs_allocated_qty,
			   UNNEST((TRANSLATE((js.value::jsonb->>'packs_available_qty')::text, '[]', '{}'))::numeric[]) available_qty 
		FROM (
			SELECT * FROM base_table 
		) foo , JSONB_EACH(pack_dc_allocation) js group by 1,2,3,4,5,6,7,8,9)
	,packs as materialized(SELECT allocation_category,
			   article,
			   dc_code,
			   store_code,
			   pack_type_id,
			   size,
			   pack_type,
			   units_in_pack,
			   available_qty as available_qty_packs,
			   packs_allocated_qty,
			   available_qty * units_in_pack::double precision AS  available_qty,
			   packs_allocated_qty * units_in_pack::double precision AS total_allocated_qty,
			   (packs_allocated_qty * COALESCE(dpc.units_in_pack, 0)) + 
                COALESCE(oh_oo_intransit, 0) AS total_inventory_per_sku_store
		FROM inventory_smart.dc_pack_configuration dpc
		JOIN flat_table USING (article, pack_type_id,size))
		
		, allocation_articles as (
		select distinct article from packs
		)
--		select * from packs;
	,final_inv as (select 
						  allocation_category,
						  dc_code,
						  store_code, 
						  pack_type_id, 
						  pack_type,
						  size,
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
				greatest(0, allocated_total - greatest(0, MIN - (updated_oh_oo_it))) as wos_allocation,
				least(allocated_total,greatest(0,MIN - (updated_oh_oo_it))) as min_allocation
			from
				base_table p
			)
			
--			select * from base_table_min_wos
			
		, product_filters as (
		select l0_name, article, size, product_code from global.product_attributes_filter paf 
            where exists (select 1 from allocation_articles b where paf.article=b.article)
		)
			
	    ,fwos AS MATERIALIZED (
            SELECT 
                paf.article, 
                paf.size,
                fsst.store_code,
                fsst.str_inv,
                fsst.wos_oh_oo_it,
                CASE 
                    WHEN fsst.wos_oh_oo_it != 0 
                    THEN ROUND(CAST(fsst.str_inv / fsst.wos_oh_oo_it AS NUMERIC), 2) 
                    ELSE 0 
                END AS str_wos_factor   
            FROM inventory_smart.fwos_sku_store_table fsst 
            JOIN product_filters paf
            USING (product_code)
            WHERE fsst.l0_name = (select distinct l0_name from product_filters limit 1)
            )
    ,wos_metric_base AS (
            SELECT 
    			allocation_category,
    			store_code, 
                CASE 
                    WHEN SUM(total_inventory_per_sku_store) != 0 
                    THEN ROUND(CAST(sum(CASE 
                        WHEN total_inventory_per_sku_store != 0 
                        THEN (total_inventory_per_sku_store * (wos_oh_oo_it + alloc_qty_wos))
                        ELSE NULL 
                    END)/sum(CASE 
                        WHEN total_inventory_per_sku_store != 0 
                        THEN total_inventory_per_sku_store
                        ELSE NULL 
                    END) AS NUMERIC), 2) 
                END AS avg_fwos_post_alloc
            FROM (
                SELECT 
                    a.*, 
                    f.str_inv,
                    COALESCE(f.wos_oh_oo_it, 0) AS wos_oh_oo_it,
                    f.str_wos_factor,
                    coalesce(CASE 
                        WHEN f.str_wos_factor != 0 
                        THEN a.total_allocated_qty / COALESCE(str_wos_factor, 1) 
                    end,0) as alloc_qty_wos
                FROM packs a
                LEFT JOIN fwos f USING (article, size) 
            ) a
            GROUP BY 1, 2
        )
--        select * from wos_metric_base
        
    ,store_level_base_table as (
		SELECT allocation_category,
			   store_code,
			   store_name,
			   climate,
			   q_str_grade,
               size,
			   sum(demand) as aggregated_demand,
			   SUM(oh) as oh,
			   SUM(oo) as oo,
			   SUM(it) as it,
			   round(sum(min)) as min_store,
			   round(sum(max)) as max_store,
			   round(avg(wos),0) as wos,
			   SUM(allocated_total) as allocated_quantity,
			   COALESCE(SUM(min_allocation), 0) as min_allocation,
			   COALESCE(SUM(wos_allocation), 0) as wos_allocation,
			COUNT( DISTINCT( CASE WHEN allocated_total > 0 THEN article END)) as style_color_cnt
		FROM (
			SELECT allocation_category,
				   article,
				   store_code,
				   store_name,
				   climate,
				   q_str_grade,
					size,
				   sum(demand) demand,
				   
				   COALESCE(sum(MIN), 0) MIN,
				   COALESCE(sum(MAX), 0) MAX,
				   ROUND(AVG(COALESCE(bt.wos::int,0)),0) as wos,
				   COALESCE(SUM(min_allocation), 0) as min_allocation,
				   COALESCE(SUM(wos_allocation), 0) as wos_allocation,
				   COALESCE(sum(oh), 0) oh,
				   COALESCE(sum(oo), 0) oo,
				   COALESCE(sum(it), 0) it,
				   COALESCE(SUM(allocated_total), 0) allocated_total
			FROM base_table_min_wos bt
			GROUP BY 1, 2, 3, 4, 5, 6, 7
		) as st
		GROUP BY 1, 2, 3, 4, 5, 6)
		
--		select * from store_level_base_table

	,store_level_misc as(select  allocation_category, delivery_dt, demand_type, store_code,inventory_source, store_concept,store_format,district,precipitation,
    						CASE 
								WHEN inventory_source='dc' THEN 'B'
								WHEN inventory_source='po' THEN 'L'
								WHEN inventory_source='ns' THEN 'S'
								ELSE '' 
			   				END AS po_type 
						from base_table 
						group by 1,2,3,4,5,6,7,8,9
	)
	SELECT  slb.*,
            fi.dc_code, 
            fi.pack_type_id as packs_allocated,  
            fi.total_allocated_qty,
            nac.dc_available,
			nac.bulk_dc_available,
            fi.pack_type,
			fi.packs_allocated_qty,
            %9$s as dc,
			delivery_dt,
            demand_type,
            po_type,
			store_concept,
			store_format,
			district,
			precipitation,
			f.avg_fwos_post_alloc as fwos
    FROM store_level_base_table slb
    LEFT JOIN final_inv fi USING(allocation_category, store_code, size)
    %8$s
	left join store_level_misc using(allocation_category, store_code)
	left join net_availble_count nac using(dc_code, pack_type_id, size)
	left join wos_metric_base f using(allocation_category, store_code)
	$$, 
	$2, 
	_article_filter,
	_final_inv_query,
	_original_allocation_code,
	-- Parameter 5: DC code casting (text for PO, int for others)
	CASE 
		WHEN _allocation_type = 4 THEN 'js.key::text'
		ELSE 'js.key::int'
	END,
	-- Parameter 6: Other allocations query (not used in format, replaced after)
	'',
	-- Parameter 7: Other allocations join condition (not used in format, replaced after)
	'',
	-- Parameter 8: Distribution centre join (conditional for type)
	CASE 
		WHEN _allocation_type = 4 THEN ''
		ELSE 'LEFT JOIN global.distribution_centres dcs using(dc_code)'
	END,
	-- Parameter 9: DC name field (dc_code for PO, dcs.name for others)
	CASE 
		WHEN _allocation_type = 4 THEN 'fi.dc_code'
		ELSE 'dcs.name'
	END
	);
	
	-- Replace placeholders with actual values
	IF ($6 = 'allocated') THEN
		_query_combine := replace(_query_combine, '__OTHER_ALLOCATIONS_QUERY_PLACEHOLDER__', _other_allocations_query);
		_query_combine := replace(_query_combine, '__OTHER_ALLOCATIONS_JOIN_PLACEHOLDER__', _other_allocations_join);
	END IF;
	
    raise notice 'Allocation Type: %, Query: %', _allocation_type, _query_combine;
    OPEN $1 FOR execute _query_combine;  
	perform  global.sp_log(v_gen_random_uuid, 'inventory_smart.scenario_product_store', 'Before returning function value',_query_combine,jsonb_build_object('Allocation Code',$2,'Store code',$3,'Article code/SKU code',$4,'Ignore allocation code',$5,'type',$6,'allocation_type',_allocation_type));
    RETURN $1;
    end
$function$
;
