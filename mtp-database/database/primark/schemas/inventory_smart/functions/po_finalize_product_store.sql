--liquibase formatted sql
--changeset liquibase:po_finalize_product_store_v2 runOnChange:true stripComments:false splitStatements:false context:MTP-64698 labels:MTP-64698 
--comment: adding additional columns | pack avaialbe change for po plans MTP-106097 | Primark packs CTE: units_in_pack only; packs_rounding_factor=1
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.po_finalize_product_store(refcursor, varchar, varchar, varchar, varchar, varchar);
CREATE OR REPLACE FUNCTION inventory_smart.po_finalize_product_store(input refcursor, character varying, character varying, character varying, character varying, character varying)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
 /* 
  * Function/Procedure name: inventory_smart.finalize_product_store
  * Created by: Manohara G
  * Created at: 03-Jan-2025
  * No of input parameter: 6
  * Parameter Description : $1 = Application name
  *                         $2 = Allocation Code
  *                             $3 = Store code
  *                             $4 = Article code/SKU code
  *                             $5 = Ignore allocation code
								$6 = type
  * Purpose: 
  * This function is created to calculate Store View Allocation Summary which is displayed in the 
  * Finalize screen of Allocate flow
  * Calling Statement:
     
     begin;
     select * from inventory_smart.finalize_product_store
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
				,current_available as (
                    SELECT 
						dc_code::text, 
						pack_type_id,
						pack_type,
						packs_rounding_factor,
						case when pack_type = 'eaches'  
							then avg(oh_eaches)/coalesce(packs_rounding_factor,1)
							else  avg(oh_packs)
						end as oh_packs
                    FROM (
                        SELECT article, size, pack_type_id, dc_code, packs_rounding_factor, units_in_pack, pack_type FROM packs GROUP BY 1, 2, 3, 4, 5, 6, 7
                    ) a 
                    LEFT JOIN (
                    SELECT po_code::text as dc_code, pack_type_id, article, size, oh, oh_packs, oh_eaches  FROM inventory_smart.sku_po_available_units where  (article, po_code) in (SELECT article, dc_code FROM packs)
                    ) b
                    USING(dc_code, pack_type_id, article, size)
                    GROUP BY 1, 2, 3, 4
                    ) 
					,other_allocations as (
						select dc_code, pack_type_id, sum(allocated_reserve_qty) as allocated_reserve_qty from (
				SELECT dc_code, allocation_code, pack_type_id, avg(allocated_reserve_qty) as allocated_reserve_qty
				FROM (
					SELECT dc_code, allocation_code, article, pack_type_id, size, 
						case when pack_type = 'packs' 
							then COALESCE(packs_allocated,0)
							else COALESCE(quantity,0)/ COALESCE(packs_rounding_factor,1) 
							end as allocated_reserve_qty
					FROM (
						SELECT dc_code::text, article, pack_type_id, size, pack_type, units_in_pack, packs_rounding_factor FROM packs
						GROUP BY 1, 2, 3, 4, 5, 6, 7
					) am
					JOIN (select * from inventory_smart.sku_po_allocated_units( $$ || quote_literal('%1$s') || $$ )
					where allocation_code not in ($$ || quote_literal('%1$s') || $$))b
					USING (dc_code, article, size, pack_type_id)
				) a
				GROUP BY 1, 2, 3 ) b 
				group by 1, 2
			)
			,net_availble_count as materialized (
					select dc_code,pack_type_id, (COALESCE(avg(oh_packs),0) - COALESCE(sum(packs_allocated_qty),0) - COALESCE(avg(allocated_reserve_qty),0))  as  dc_available, (COALESCE(avg(oh_packs),0)  - COALESCE(avg(allocated_reserve_qty),0))  as  bulk_dc_available
					from final_inv
					left join current_available using(dc_code, pack_type_id)
					left join other_allocations using(dc_code,pack_type_id)
					group by dc_code,pack_type_id
				)
				$$;
				_final_inv_query := format(_final_inv_query,_alloc_code);
	ELSE
        _final_inv_query := $$
			,net_availble_count as materialized (
					select dc_code, pack_type_id, (COALESCE(avg(dc_available_packs),0) - COALESCE(sum(packs_allocated_qty),0))  as  dc_available, COALESCE(avg(dc_available_packs),0)  as  bulk_dc_available
					from final_inv
					group by dc_code, pack_type_id
				)
				$$;
	 END IF;
        _query_combine := format($$
            ------ PO- PRODUCT VIEW -STORE LEVEL - TABLE DATA
		with base_table as materialized (SELECT carfs.article,carfs.store_start_date::date, 			
							carfs.store_end_date::date,
							  carfs.allocated_total,carfs.oh,carfs.oo,carfs.it,
							  carfs.wos, carfs.pack_dc_allocation, carfs.min, carfs.max,store store_code, updated_oh_oo_it, demand, demand_type, saf.store_name, saf.climate, carfs.inventory_source, carfs.retail_size_cd as size, saf.store_attribute_1  
		FROM inventory_smart.create_allocation_result_flat_gurobi carfs
		join global.store_attributes_filter saf on saf.store_code = carfs.store
		WHERE carfs.created_at between $$ || quote_literal(_pm_date::timestamp) || $$ and $$ || quote_literal(_pm_date::timestamp + interval '1 day') || $$ and allocation_code = '%1$s' %2$s
		)
		,flat_table as (SELECT article,
			   store_code,
			   js.key dc_code, 
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
			   dc_code,
			   store_code,
			   pack_type_id,
			   size,
			   pack_type,
			   units_in_pack,
			   1 as packs_rounding_factor,
			   available_qty as available_qty_packs,
			   packs_allocated_qty,
			   packs_allocated_qty * dpc.units_in_pack::double precision as total_allocated_qty,
			   available_qty * dpc.units_in_pack::double precision as available_qty
		FROM inventory_smart.dc_pack_configuration dpc
		JOIN flat_table USING (article, pack_type_id,size))
--		select * from packs;
	,final_inv as (select 
						  dc_code,
						  store_code, 
						  pack_type_id, 
						  pack_type,
						  packs_rounding_factor,
						  avg(available_qty_packs) as dc_available_packs ,
						  sum(available_qty) as available_qty,
						  sum(total_allocated_qty) AS total_allocated_qty,
						  avg(packs_allocated_qty) packs_allocated_qty
					from packs p	
					group by 1,2,3,4,5
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
    ,store_level_base_table as (
		SELECT store_code,
			   store_name,
			   store_attribute_1,
			   sum(demand) as aggregated_demand,
			   SUM(oh) as oh,
			   SUM(oo) as oo,
			   SUM(it) as it,
			   round(sum(min)) as min_store,
			   round(sum(max)) as max_store,
			   SUM(allocated_total) as allocated_quantity,
			   SUM(oh) + SUM(oo) + SUM(it) as oh_oo_it_total,
			   SUM(allocated_total) + SUM(oh) as total_allocated_qty_oh,
			   SUM(allocated_total) + SUM(oh) + sum(oo) + sum(it) as total_allocated_qty_oh_oo_it,
			   COALESCE(SUM(min_allocation), 0) as min_allocation,
			   COALESCE(SUM(wos_allocation), 0) as wos_allocation,
			COUNT( DISTINCT( CASE WHEN allocated_total > 0 THEN article END)) as style_color_cnt
		FROM (
			SELECT article,
				   store_code,
				   store_name,
				   store_attribute_1,
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
			GROUP BY 1, 2, 3, 4
		) as st
		GROUP BY 1, 2, 3)
    ,sales_aggregate as (
    select 
                store_code,
            round(coalesce(sum(lw_margin),0)) as lw_margin
            from (
            select article,
                    store_code,
                    avg(aid.lw_margin) as lw_margin
            from packs
            left join inventory_smart.article_inventory_dashboard aid using(article, store_code)
            group by 1, 2
        ) a
        group by 1
    )
	,store_level_misc as(select  store_start_date,store_end_date,demand_type, store_code,inventory_source 
						from base_table 
						group by 1,2,3,4,5
	)
	SELECT  slb.*,
            fi.dc_code, 
			fi.dc_code as dc,
            fi.pack_type_id as packs_allocated,  
            coalesce(fi.total_allocated_qty,0) as total_allocated_qty,
			-- fi.packs_rounding_factor,
            coalesce(nac.dc_available,0) as dc_available,
			coalesce(nac.bulk_dc_available,0) as bulk_dc_available,
            fi.pack_type,
			coalesce(fi.packs_allocated_qty,0) as packs_allocated_qty,
            sa.lw_margin,
			store_start_date,
			store_end_date,
            demand_type
    FROM store_level_base_table slb
    LEFT JOIN final_inv fi USING(store_code)
    left join sales_aggregate sa using(store_code)
	left join store_level_misc using(store_code)
	left join net_availble_count nac on fi.pack_type_id = nac.pack_type_id
	%4$s
	$$, $2, _article_filter,_final_inv_query, _store_filter1);
    raise notice '%', _query_combine;
    OPEN $1 FOR execute _query_combine; 
	perform  global.sp_log(v_gen_random_uuid, 'inventory_smart.po_finalize_product_store', 'Before returning function value',_query_combine,jsonb_build_object('allocation_code',$2,'_store_code',$3,'Article code/SKU code',$4,'Ignore allocation code',$5,'type',$6)) ;		
	
    RETURN $1;
    end
$function$
;