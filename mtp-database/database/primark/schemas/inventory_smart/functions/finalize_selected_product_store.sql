--liquibase formatted sql
--changeset liquibase:finalize_selected_product_store_v2 runOnChange:true stripComments:false splitStatements:false context:MTP-102176 labels:MTP-102176
--comment: MTP-125064 | Primark packs CTE: units_in_pack only; packs_rounding_factor=1
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.finalize_selected_product_store(refcursor, varchar, varchar, varchar[], varchar, varchar);
CREATE OR REPLACE FUNCTION inventory_smart.finalize_selected_product_store(input refcursor, allocation_code character varying, store_code character varying, article_list character varying[], ignore_allocation_code character varying, type character varying)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
 /* 
  * Function/Procedure name: inventory_smart.finalize_product_store
  * Created by: Manohara G
  * Created at: 20-DEC-2024
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
		-- Update to handle array of articles
		IF array_length(article_list, 1) IS NOT NULL THEN
			_article_filter := format($$AND carfs.article = ANY (%L)$$, article_list);
		END IF;

		IF ($6 = 'allocated')
            THEN
                _final_inv_query := $$
				,current_available as (
                    SELECT 
						dc_code, 
						pack_type_id,
						inventory_source,
						pack_type,
						packs_rounding_factor,
						case when b.pack_type = 'eaches'
							then 
								case 
									when inventory_source <> 'oh_oo' then avg(oh_packs)/coalesce(packs_rounding_factor,1)
									else avg(oh_packs)/coalesce(packs_rounding_factor,1) + avg(oo_packs)/coalesce(packs_rounding_factor,1)
								end
							else 	
								case 
									when inventory_source <> 'oh_oo' then avg(oh_packs)
									else avg(oh_packs) + avg(oo_packs)
								end  
						end as oh_packs
                    FROM (
                        SELECT article, size, pack_type_id, dc_code, inventory_source,packs_rounding_factor, units_in_pack  FROM packs GROUP BY 1, 2, 3, 4, 5, 6 ,7
                    ) a 
                    LEFT JOIN (
                    SELECT * FROM inventory_smart.sku_dc_available_units where  (article, dc_code) in (SELECT article, dc_code FROM packs)
                    ) b
                    USING(dc_code, pack_type_id, article, size)
                    GROUP BY 1, 2, 3, 4, 5) 
--					select * from current_available;
				,reserve_allocation as (
                           SELECT 
                              	dc_code, 
                              	pack_type_id,
                              	avg(COALESCE(user_reserve_qty,0)) user_reserve_qty 
                          from (
                          		select 
                                    dc_code, 
                                    article, 
                                    size,
                                    pack_type_id,
                                    case 
                                        when pack_type = 'packs' then quantity / units_in_pack::double precision
                                        else quantity / packs_rounding_factor::double precision
                                    end as user_reserve_qty                                
		                        FROM (
		                                SELECT dc_code, article, pack_type_id, size, packs_rounding_factor, pack_type, units_in_pack FROM packs
		                                GROUP BY 1, 2, 3, 4, 5, 6, 7
		                                ) am
                                LEFT JOIN inventory_smart.sku_dc_reserved_units
                                USING (article, pack_type_id, dc_code, size)
                                    ) a 
                                GROUP BY 1, 2
                            )
--                    select * from reserve_allocation;
				,other_allocations as (
					select dc_code, pack_type_id, sum(allocated_reserve_qty) as allocated_reserve_qty from (
            SELECT dc_code, allocation_code, pack_type_id, avg(allocated_reserve_qty) as allocated_reserve_qty
            FROM (
                SELECT allocation_code, dc_code, article, pack_type_id, size, 
				case when pack_type = 'packs' 
					then COALESCE(quantity,0)/ COALESCE(units_in_pack,1)
					else COALESCE(quantity,0)/ COALESCE(packs_rounding_factor,1) 
					end as allocated_reserve_qty
                FROM (
                    SELECT dc_code, article, pack_type_id, size, pack_type, units_in_pack, packs_rounding_factor FROM packs
                    GROUP BY 1, 2, 3, 4, 5, 6, 7
                ) am
                JOIN (select * from inventory_smart.sku_dc_allocated_units( $$ || quote_literal('%1$s') || $$ )
				where allocation_code not in ($$ || quote_literal('%1$s') || $$))b
                USING (dc_code, article, size, pack_type_id)
            ) a
            GROUP BY 1, 2, 3 ) b 
			group by 1, 2
        )
			,net_availble_count as materialized (
					select dc_code,pack_type_id, (COALESCE(avg(oh_packs),0) - COALESCE(sum(packs_allocated_qty),0) - COALESCE(avg(allocated_reserve_qty),0) - COALESCE(avg(user_reserve_qty),0))  as  dc_available, (COALESCE(avg(oh_packs),0)  - COALESCE(avg(allocated_reserve_qty),0) - COALESCE(avg(user_reserve_qty),0))  as  bulk_dc_available
					from final_inv
					left join current_available using(dc_code, pack_type_id)
					left join other_allocations using(dc_code, pack_type_id)
					left join reserve_allocation using(dc_code, pack_type_id)
					group by dc_code, pack_type_id
				)
				$$;
				_final_inv_query := format(_final_inv_query,_alloc_code);
	ELSE
        _final_inv_query := $$
			,reserve_allocation as (
                           SELECT 
                              	dc_code, 
                              	pack_type_id,
                              	avg(COALESCE(user_reserve_qty,0)) user_reserve_qty 
                          from (
                          		select 
                                    dc_code, 
                                    article, 
                                    size,
                                    pack_type_id,
                                    case 
                                        when pack_type = 'packs' then quantity / units_in_pack::double precision
                                        else quantity / packs_rounding_factor::double precision
                                    end as user_reserve_qty                                
		                        FROM (
		                                SELECT dc_code, article, pack_type_id, size, packs_rounding_factor, pack_type, units_in_pack FROM packs
		                                GROUP BY 1, 2, 3, 4, 5, 6, 7
		                                ) am
                                LEFT JOIN inventory_smart.sku_dc_reserved_units
                                USING (article, pack_type_id, dc_code, size)
                                    ) a 
                                GROUP BY 1, 2
                            )
			,net_availble_count as materialized (
					select dc_code,pack_type_id, (COALESCE(avg(dc_available_packs),0) - COALESCE(sum(packs_allocated_qty),0) - COALESCE(avg(user_reserve_qty),0))  as  dc_available, (COALESCE(avg(dc_available_packs),0) - COALESCE(avg(user_reserve_qty),0))  as  bulk_dc_available
					from final_inv
					left join reserve_allocation using(dc_code, pack_type_id)
					group by dc_code, pack_type_id
				)
				$$;
	 END IF;
	
        _query_combine := format($$
            ------ PRODUCT VIEW - STORE LEVEL - TABLE DATA
		with base_table as materialized (SELECT carfs.article,carfs.store_start_date::date, 			
						carfs.store_end_date::date,carfs.allocated_total,carfs.oh,carfs.oo,carfs.it,
						  carfs.wos, carfs.pack_dc_allocation, carfs.min, carfs.max,store store_code, updated_oh_oo_it, demand, demand_type, saf.store_name, saf.climate, carfs.inventory_source, carfs.retail_size_cd as size, saf.store_attribute_1, allocation_strategy
		FROM inventory_smart.create_allocation_result_flat_gurobi carfs
		join global.store_attributes_filter saf on saf.store_code = carfs.store
		WHERE carfs.created_at between $$ || quote_literal(_pm_date::timestamp) || $$ and $$ || quote_literal(_pm_date::timestamp + interval '1 day') || $$ and allocation_code = '%1$s' %2$s
		)
		,flat_table as (SELECT article,
			   store_code,
			   js.key::int dc_code, 
			   size,
			   js.value,
			   inventory_source,
			   UNNEST((TRANSLATE((js.value::jsonb->>'packs_allocated')::text, '[]', '{}'))::text[]) pack_type_id,
			   UNNEST((TRANSLATE((js.value::jsonb->>'packs_allocated_qty')::text, '[]', '{}'))::numeric[]) packs_allocated_qty,
			   UNNEST((TRANSLATE((js.value::jsonb->>'packs_available_qty')::text, '[]', '{}'))::numeric[]) available_qty,
			   UNNEST((TRANSLATE((js.value::jsonb->>'pack_rounding_factor')::text, '[]', '{}'))::numeric[]) packs_rounding_factor 
		FROM (
			SELECT * FROM base_table 
		) foo , JSONB_EACH(pack_dc_allocation) js group by 1,2,3,4,5,6,7,8,9,10)
	,packs as materialized(SELECT article,
			   dc_code,
			   store_code,
			   pack_type_id,
			   size,
			   pack_type,
			   units_in_pack,
			   1 as packs_rounding_factor,
			   inventory_source,
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
	,store_level_misc as(select  store_start_date,store_end_date, demand_type, store_code,inventory_source
						from base_table 
						group by 1,2,3,4,5
	)
	SELECT  slb.*,
            fi.dc_code, 
            fi.pack_type_id as packs_allocated,  
            fi.total_allocated_qty,
			-- fi.packs_rounding_factor,
            nac.dc_available,
			nac.bulk_dc_available,
            fi.pack_type,
			fi.packs_allocated_qty,
            dcs.name as dc,
            sa.lw_margin,
			store_start_date,
			store_end_date,
            demand_type
    FROM store_level_base_table slb
    LEFT JOIN final_inv fi USING(store_code)
    LEFT JOIN global.distribution_centres dcs using(dc_code)
    left join sales_aggregate sa using(store_code)
	left join store_level_misc using(store_code)
	left join net_availble_count nac using(dc_code, pack_type_id)
	%4$s
	$$, $2, _article_filter,_final_inv_query, _store_filter1);
    raise notice '%', _query_combine;
    OPEN $1 FOR execute _query_combine;  
	perform  global.sp_log(v_gen_random_uuid, 'inventory_smart.finalize_product_store', 'Before returning function value',_query_combine,jsonb_build_object('Allocation Code',$2,'Store code',$3,'Article code/SKU code',$4,'Ignore allocation code',$5,'type',$6));
    RETURN $1;
    end
$function$
;