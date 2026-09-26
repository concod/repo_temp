--liquibase formatted sql
--changeset liquibase:po_finalize_product_store_size_view runOnChange:true stripComments:false splitStatements:false context:MTP-40575 labels:MTP-45674
--comment: MTP-45674 finalized plans calculation changes | other allocation changes | OB changes | MTP-103548
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.po_finalize_product_store_size_view(refcursor, varchar, varchar, varchar, varchar, varchar);
DROP FUNCTION IF EXISTS inventory_smart.po_finalize_product_store_size_view(refcursor, varchar, varchar, varchar, varchar, varchar,varchar);
CREATE OR REPLACE FUNCTION inventory_smart.po_finalize_product_store_size_view(input refcursor, character varying, character varying, character varying, character varying, character varying,character varying)
RETURNS refcursor
LANGUAGE plpgsql
AS $function$
/* 
  * Function/Procedure name: inventory_smart.po_finalize_product_store_size_view
  * Created by: Manohara G
  * Created at: 07-Aug-2024
  * No of input parameter: 6
  * Parameter Description : $1 = Application name
  *                         $2 = Allocation Code
  *                             $3 = Store code
  *                             $4 = Article code/SKU code
  *                             $5 = Ignore allocation code
								$6 = type
								$7= pack_id
  * Purpose: 
  * This function is created to calculate Store View Allocation Summary which is displayed in the 
  * Finalize screen of Allocate flow
  * Calling Statement:
     
     begin;
     select * from inventory_smart.po_finalize_product_store_size_view
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
	_alloc_code text;
	_pm_date date;
	_query text;
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
                _store_filter1 := format($$ AND store_code = '%s'$$, $3);
                _store_filter2 := format($$WHERE a.store_code = '%s'$$, $3);
            end if;
        if ($4 = '') IS FALSE
            then
                _article_filter := format($$AND carfs.article = '%s'$$, $4);
        end if;

		IF ($6 = 'allocated')
            THEN
                _final_inv_query := $$
					,other_allocations as (
						select dc_code, pack_type_id, sum(allocated_reserve_qty) allocated_reserve_qty from (
						SELECT allocation_code, dc_code, pack_type_id, avg(allocated_reserve_qty) as allocated_reserve_qty
						FROM (
							SELECT allocation_code, dc_code, article, pack_type_id, size, 
							case 
								when pack_type = 'packs' then COALESCE(packs_allocated,0)
								else COALESCE(eaches_allocated,0)
							end as allocated_reserve_qty
							FROM (
								SELECT dc_code::text, article, pack_type_id, size, pack_type FROM packs
								GROUP BY 1, 2, 3, 4, 5
							) am
							JOIN (select * from inventory_smart.sku_po_allocated_units( $$ || quote_literal('%1$s') || $$ )
                                  where allocation_code not in ($$ || quote_literal('%1$s') || $$))b
							USING (dc_code, article, size, pack_type_id)
						) a
						GROUP BY 1, 2, 3 ) c
						group by 1, 2
					)
				,net_availble_count as materialized (
						select pack_type_id, (COALESCE(avg(dc_available_packs),0)  - COALESCE(avg(allocated_reserve_qty),0) - COALESCE(sum(total_allocated),0))  as  dc_available
						from final_inv
						left join other_allocations using(dc_code, pack_type_id)
						left join total_allocated_qty using (dc_code,pack_type_id)
						group by dc_code, pack_type_id
					)
				$$;
        _final_inv_query := format(_final_inv_query,_alloc_code);
	ELSE
        _final_inv_query := $$
			,net_availble_count as materialized (
					select pack_type_id, (COALESCE(avg(dc_available_packs),0)  - COALESCE(sum(total_allocated),0))  as  dc_available
					from final_inv
					left join total_allocated_qty using (dc_code,pack_type_id)
					group by dc_code, pack_type_id
				)
				$$;
	 END IF;

        _query_combine := format($$
            ------ PO PRODUCT VIEW - STORE SIZE LEVEL - TABLE DATA
		with base_table as materialized (SELECT carfs.article,carfs.delivery_dt ,
							  carfs.allocated_total,carfs.oh,carfs.oo,carfs.it,
							  carfs.wos, carfs.pack_dc_allocation, carfs.min, carfs.max,store store_code, updated_oh_oo_it, demand, demand_type, saf.store_name, saf.climate, saf.q_str_grade, carfs.inventory_source, carfs.retail_size_cd as size
		FROM inventory_smart.create_allocation_result_flat_gurobi carfs
		join global.store_attributes_filter saf on saf.store_code = carfs.store
		WHERE carfs.created_at between $$ || quote_literal(_pm_date::timestamp) || $$ and $$ || quote_literal(_pm_date::timestamp + interval '1 day') || $$ and allocation_code = '%1$s' %2$s %3$s
		)
		,flat_table as (SELECT article,
			   store_code,
			   js.key dc_code, 
			   size,
			   UNNEST((TRANSLATE((js.value::jsonb->>'packs_allocated')::text, '[]', '{}'))::text[]) pack_type_id,
			   UNNEST((TRANSLATE((js.value::jsonb->>'packs_allocated_qty')::text, '[]', '{}'))::numeric[]) packs_allocated_qty,
			   UNNEST((TRANSLATE((js.value::jsonb->>'packs_available_qty')::text, '[]', '{}'))::numeric[]) available_qty 
		FROM (
			SELECT * FROM base_table 
		) foo , JSONB_EACH(pack_dc_allocation) js)
	,total_allocated_qty as (
		select allocation_code,
				article,
				pack_type_id,
				dc_code,
				sum(current_allocation) as total_allocated 
				from ( 
		select 
				allocation_code,
				article,
				dc_code,
				unnest(replace(replace(inventory_data::jsonb ->> 'packs_allocated'::text, '['::text, '{'::text), ']'::text, '}'::text)::text[]) AS pack_type_id,
				unnest(replace(replace(inventory_data::jsonb ->> 'packs_allocated_qty'::text, '['::text, '{'::text), ']'::text, '}'::text)::double precision[]) AS current_allocation
			from (
		select 
				carfs.allocation_code,
				carfs.article,
				carfs.store as store_code,
				js.items as dc_code,
				js.value as inventory_data
			from
				inventory_smart.create_allocation_result_flat_gurobi carfs
			cross join lateral jsonb_each_text(carfs.pack_dc_allocation) js(items,value)
			where
				allocation_code = '%1$s' 
				group by 1,2,3,4,5
			) pack_allocation) x
			group by 1,2,3,4
		)
	,packs as materialized(SELECT article,
			   dc_code,
			   store_code,
			   pack_type_id,
			   size,
			   pack_type,
			   units_in_pack,
			   available_qty as available_qty_packs,
			   packs_allocated_qty,
			   available_qty * units_in_pack::double precision AS  available_qty,
			   packs_allocated_qty * units_in_pack::double precision AS total_allocated_qty
		FROM inventory_smart.dc_pack_configuration dpc
		JOIN flat_table USING (article, pack_type_id,size) where pack_type_id='%5$s')
--		select * from packs;
	,final_inv as (select 
						  dc_code,
						  store_code, 
						  pack_type_id, 
						  pack_type,
						  avg(available_qty_packs) as dc_available_packs ,
						  avg(available_qty) as available_qty,
						  sum(total_allocated_qty) AS total_allocated_qty,
						  avg(packs_allocated_qty) packs_allocated_qty
					from packs p	
					group by 1,2,3,4
					)
--					select * from final_inv;
	%4$s
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
		SELECT 
               article,
               store_code,
			   store_name,
			   climate,
			   q_str_grade,
			   sum(demand) as aggregated_demand,
			   SUM(oh) as oh,
			   SUM(oo) as oo,
			   SUM(it) as it,
			   sum(oh) + sum(oo) + sum(it) as oh_oo_it_total,
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
				   climate,
				   q_str_grade,
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
			GROUP BY 1, 2, 3, 4, 5
		) as st
		GROUP BY 1, 2, 3, 4, 5)
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
	,store_level_misc as(select  delivery_dt, demand_type, store_code,inventory_source, 
    						CASE 
								WHEN inventory_source='dc' THEN 'B'
								WHEN inventory_source='po' THEN 'L'
								WHEN inventory_source='ns' THEN 'S'
								ELSE '' 
			   				END AS po_type 
						from base_table 
						group by 1,2,3,4
	)
	SELECT  slb.*,
            fi.dc_code, 
            fi.dc_code as dc,
            fi.pack_type_id as packs_allocated,  
            fi.total_allocated_qty,
            nac.dc_available,
            fi.pack_type,
			fi.packs_allocated_qty,
            sa.lw_qty,
            sa.lw_margin,
			delivery_dt,
            demand_type,
            po_type
    FROM store_level_base_table slb
    LEFT JOIN final_inv fi USING(store_code)
    left join sales_aggregate sa using(store_code)
	left join store_level_misc using(store_code)
	left join net_availble_count nac using(pack_type_id)
	$$, $2, _article_filter, _store_filter1, _final_inv_query,$7);
    raise notice '%', _query_combine;
    OPEN $1 FOR execute _query_combine;  
	perform  global.sp_log(v_gen_random_uuid, 'inventory_smart.po_finalize_product_store_size_view', 'Before returning function value',_query_combine,jsonb_build_object('allocation_code',$2,'_store_code',$3,'Article code/SKU code',$4,'Ignore allocation code',$5,'type',$6)) ;		

    RETURN $1;
    end
$function$
;