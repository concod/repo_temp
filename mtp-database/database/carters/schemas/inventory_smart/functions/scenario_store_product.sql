--liquibase formatted sql
--changeset liquibase:scenario_store_product_multi_allocation_type runOnChange:true stripComments:false splitStatements:false context:MTP-85635 labels:MTP-45674
--comment: MTP-85635 | Enhanced scenario store product view with multi-allocation type support and original allocation comparison
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.scenario_store_product(refcursor, varchar, varchar, varchar, varchar, varchar);

CREATE OR REPLACE FUNCTION inventory_smart.scenario_store_product(input refcursor, character varying, character varying, character varying, character varying, character varying)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
 /* 
  * Function/Procedure name: inventory_smart.scenario_store_product
  * Created by: Manohara Gulla
  * Created at: 27-June-2024
  * No of input parameter: 6
  * Parameter Description : $1 = refcursor name
  *                         $2 = Allocation Code (scenario allocation code)
  *                         $3 = Store code filter
  *                         $4 = Ignore allocation codes
  *                         $5 = Article filter
  *                         $6 = Type ('allocated' or other)
  * Purpose: 
  * Enhanced scenario store product view with multi-allocation type support and original allocation comparison
  * 
  * Features:
  * - Supports multiple allocation types: Normal (0,2), PO (4), New Store (5)
  * - Compares scenario allocation with original allocation for analysis
  * - Product-level allocation summary with detailed metrics
  * - Inventory availability and allocation tracking
  * - Dynamic data source selection based on allocation type
  * - Proper DC code handling (integer for normal/NS, text for PO)
  * - Conditional distribution center joins for PO allocations
  * 
  * Calling Statement:
     begin;
     select * from inventory_smart.scenario_store_product
         ('my_cur',
          '6_105_USA_20250702T1053452513111660_SCENARIO_1_88',
         '',
         '',
        '1S530110-USA-Brick __ia_char_13 Mortar',
       'allocated');
      FETCH ALL IN "my_cur";
     commit;
   
  * if any modification done in same function/procedure please record the changes in below format
  *
  * Updated_by       Updated_on      Purpose
  * ----------       -----------     --------
  * Krishna        2025-01-27      Added multi-allocation type support, dynamic DC code casting, 
  *                                  conditional inventory table selection, enhanced debugging
  *
  */
    declare
        _query_combine text;
        _store_filter text;
        _article_filter text;
        _final_inv_query text;
		_pm_date date;
        _query text;
        _alloc_code text;
	    v_gen_random_uuid text  := gen_random_uuid()::varchar;
		_original_allocation_code text;
		_allocation_type integer;
		

    begin
		_original_allocation_code := SPLIT_PART($2, '_SCENARIO', 1);
		
		-- If no SCENARIO found, use the original code as is
		IF _original_allocation_code = '' OR _original_allocation_code IS NULL THEN
			_original_allocation_code := $2;
		END IF;
		
		-- Get allocation type from plan_master
		raise notice 'Querying plan_master for allocation_code: %', _original_allocation_code;
		
		SELECT "type"::integer INTO _allocation_type 
		FROM inventory_smart.plan_master 
		WHERE plan_code = _original_allocation_code 
		LIMIT 1;
		
		-- Default to type 0 if not found
		_allocation_type := COALESCE(_allocation_type, 0);
		
		raise notice 'Retrieved allocation type: % for allocation_code: %', _allocation_type, _original_allocation_code;
		
		_query :=  'select date(created_at) from inventory_smart.plan_master where plan_code = %L';
        if $4 = '' then 
           _alloc_code := $2;
        else
            _alloc_code := $4;
        end if; 
        _query := format(_query, _alloc_code);
        execute _query into _pm_date;
	   	raise notice 'pm_date: %', _pm_date;
        
        -- Ensure _pm_date is not NULL
        IF _pm_date IS NULL THEN
            _pm_date := CURRENT_DATE;
        END IF;
        
        raise notice 'Final pm_date: %', _pm_date;

	    _article_filter := '';
        _store_filter := '';
        if ($3 = '') IS FALSE
            then
                _store_filter := format($$ AND store_code = '%s'$$, $3);
            end if;
        IF ($5 = '') IS FALSE
        THEN
            _article_filter = format($$ AND article IN ('%s')$$, $5);
        END IF;
        IF ($6 = 'allocated')
            THEN
                _final_inv_query := $$
                    ,current_available as (
                SELECT dc_code, article, size, SUM(oh) oh, SUM(it) it, SUM(oo) oo
                    FROM (
                        SELECT article, size, pack_type_id, dc_code FROM packs GROUP BY 1, 2, 3, 4
                    ) a 
                    LEFT JOIN (
                    SELECT * FROM %1$s where  (article, dc_code) in (SELECT article, dc_code FROM packs)
                    ) b
                    USING(dc_code, pack_type_id, article, size)
                    GROUP BY 1, 2, 3
                )
        ,reserve_allocation as (
                    SELECT dc_code, article, size, SUM(COALESCE(quantity,0)) user_reserve_qty 
                    FROM (
                        SELECT dc_code, article, size, pack_type_id FROM packs
                        GROUP BY 1, 2, 3, 4
                    ) am
                    LEFT JOIN (
                    SELECT * FROM inventory_smart.sku_dc_reserved_units where  (article, dc_code) in (SELECT article, dc_code FROM packs)
                    ) b
                    USING (dc_code, article, size, pack_type_id)
                    GROUP BY 1, 2, 3 --need more clarity
                )

		,other_allocations_pre as (
				select a.*,
	            case 
	                when allocation_code like '%%SCENARIO%%' then 'scenario'
	                else 'original'
	            end as allocation_category
				from
				(
					select * from %2$s( $$ || quote_literal('%3$s') || $$ )
					UNION ALL 
					select * from %2$s( $$ || quote_literal(_original_allocation_code) || $$ ) 
				) a
			)
        ,other_allocations as (
                    SELECT allocation_category, dc_code, article, size, SUM(allocated_reserve_qty) as allocated_reserve_qty
                    FROM (
                        SELECT allocation_category, dc_code, article, pack_type_id, size, COALESCE(quantity,0) as allocated_reserve_qty
                        FROM (
                            SELECT dc_code, article, pack_type_id, size FROM packs
                            GROUP BY 1, 2, 3, 4
                        ) am
                        join other_allocations_pre b
                        USING (dc_code, article, size, pack_type_id)
                    ) a
                    GROUP BY 1, 2, 3, 4
                )
        ,final_inv as materialized (
                    SELECT 
                    	foo.allocation_category,
                    		dc_code,
                           article,
                           foo.size,
                           allocated_qty,
                           COALESCE(SUM(oh),0) as dc_available,
                           COALESCE(SUM(allocated_reserve_qty),0) as allocated_reserve_qty
                    FROM (
                         SELECT 
                         		allocation_category,
                         		dc_code,
                                article,
                                size,
                                SUM(allocated_qty) as allocated_qty
                        FROM packs
                        GROUP BY 1, 2, 3, 4
                    ) foo
                    LEFT JOIN current_available USING (dc_code, article, size)
                    LEFT JOIN other_allocations USING (dc_code, article, size, allocation_category)
                    left join reserve_allocation using (dc_code, article, size)
                    GROUP BY 1, 2, 3, 4, 5
                )
        ,net_availble_count as (
        	select allocation_category, article, dc_code, size, COALESCE(sum(dc_available),0) - COALESCE(sum(allocated_qty),0) - COALESCE(SUM(allocated_reserve_qty),0)  net_available,
        		   COALESCE(sum(dc_available),0) - COALESCE(sum(allocated_reserve_qty),0) as net_available_before_allocation
        	from final_inv
        	group by allocation_category, dc_code,article,size
        )
        $$;
        _final_inv_query := format(_final_inv_query,
            CASE 
                WHEN _allocation_type = 5 THEN 'inventory_smart.sku_ns_available_units'
                WHEN _allocation_type = 4 THEN 'inventory_smart.sku_po_available_units'
                ELSE 'inventory_smart.sku_dc_available_units'
            END,
            CASE 
                WHEN _allocation_type = 5 THEN 'inventory_smart.sku_ns_allocated_units'
                WHEN _allocation_type = 4 THEN 'inventory_smart.sku_po_allocated_units'
                ELSE 'inventory_smart.sku_dc_allocated_units'
            END,
            _alloc_code); 
    ELSE
        _final_inv_query := $$
            ,final_inv as (
        		    SELECT a.*,
        				   name as dc_name,
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
        		            	pack_type_id,
                                size,
        		            	SUM(allocated_qty) as allocated_qty,
        		            	avg(available_qty) as available_qty
							from packs
							group by 1,2,3,4) a
						GROUP BY 1, 2, 3
        		    ) a
        		    LEFT JOIN global.distribution_centres USING (dc_code)
        		)
                ,net_availble_count as (
        	select article, dc_code, size, COALESCE(sum(dc_available),0) - COALESCE(sum(allocated_qty),0) net_available,
            COALESCE(sum(dc_available),0)  as net_available_before_allocation
        	from final_inv
        	group by dc_code,article,size
        )
			$$;
        END IF;
        
        -- Ensure all variables are not null before format
        _store_filter := COALESCE(_store_filter, '');
        _article_filter := COALESCE(_article_filter, '');
        _final_inv_query := COALESCE(_final_inv_query, '');
        _original_allocation_code := COALESCE(_original_allocation_code, $2);
        _pm_date := COALESCE(_pm_date, CURRENT_DATE);
        
        -- Debug all format parameters before calling format()
        raise notice 'Format Parameters Debug:';
        raise notice 'Parameter 1 ($2): %', $2;
        raise notice 'Parameter 2 (_store_filter): %', _store_filter;
        raise notice 'Parameter 3 (_article_filter): %', _article_filter;
        raise notice 'Parameter 4 (_final_inv_query): %', substring(_final_inv_query, 1, 100) || '...';
        raise notice 'Parameter 5 (_original_allocation_code): %', _original_allocation_code;
        raise notice 'Parameter 6 (dc_code_casting): %', 
            CASE WHEN _allocation_type = 4 THEN 'js.key::text' ELSE 'js.key::int' END;
        raise notice 'Parameter 7 (dc_name_field): %', 
            CASE WHEN _allocation_type = 4 THEN 'fi.dc_code' ELSE 'dcs.name' END;
        raise notice 'Parameter 8 (distribution_centre_join): %', 
            CASE WHEN _allocation_type = 4 THEN '' ELSE 'LEFT JOIN global.distribution_centres dcs using(dc_code)' END;
        raise notice 'Parameter 9 (_pm_date): %', _pm_date;
        
        _query_combine := format($$
            ------ PRODUCT VIEW -  PRODUCT TABLE DATA
             WITH base_table_temp as materialized (
                SELECT article, channel, store store_code,pack_dc_allocation,inventory_source, demand_type, demand, allocated_total, min,max,oh,oo,it,lt_forecast,wos,product_profile_selected,carfs.retail_size_cd size,carfs.selected_store_group_names,
                       oh_oo_intransit, (allocated_total + oh_oo_intransit) / nullif(ros, 0) AS current_wos,
			           case 
			                when allocation_code like '%%SCENARIO%%' then 'scenario'
			                else 'original'
			           end as allocation_category
                FROM inventory_smart.create_allocation_result_flat_gurobi carfs
                LEFT JOIN global.store_attributes_filter saf ON store_code = store
                WHERE allocation_code in ('%1$s','%5$s') %3$s %2$s
				and carfs.created_at between $$ || quote_literal(_pm_date::timestamp) || $$ and $$ || quote_literal(_pm_date::timestamp + interval '1 day') || $$
        )
		 ,scenario_article_store as (
        select article, store_code from base_table_temp where allocation_category='scenario' group by 1, 2
        )
		   ,base_table as (
        select * from base_table_temp a
        where exists (select 1 from scenario_article_store b where b.article=a.article and b.store_code=a.store_code)
        )
		
        ,flat_table as (
                SELECT 
					   allocation_category,
					   article,
                       store_code,
                       %6$s dc_code, 
                       channel,
                       size,
                       UNNEST((TRANSLATE((js.value::jsonb->>'packs_allocated')::text, '[]', '{}'))::text[]) pack_type_id,
                       UNNEST((TRANSLATE((js.value::jsonb->>'packs_allocated_qty')::text, '[]', '{}'))::numeric[]) allocated_qty,
                       UNNEST((TRANSLATE((js.value::jsonb->>'packs_available_qty')::text, '[]', '{}'))::numeric[]) available_qty        
                FROM (
                    SELECT * FROM base_table 
                ) foo , JSONB_EACH(pack_dc_allocation) js
            )  
        ,packs as materialized (
                SELECT allocation_category,
					   article,
                       dc_code,
                       store_code,
                       pack_type_id,
                       dpc.size,
                       channel,
                       pack_type,
                       allocated_qty * units_in_pack::double precision AS allocated_qty,
                       available_qty * units_in_pack::double precision AS available_qty
                FROM inventory_smart.dc_pack_configuration dpc
                JOIN flat_table USING (article, pack_type_id,size)
            )
         %4$s

        ,article_level_base_table as  (
            select allocation_category,
				   article, 
            	   inventory_source, 
            	   demand_type,
				  product_profile_selected, 
                  REPLACE(selected_store_group_names[1], '''', '') as store_group, 
            	   sum(demand) as demand,
            	   COUNT( DISTINCT(CASE WHEN allocated_total > 0 then store_code end)) as store, 
            	   COUNT( distinct store_code ) as all_stores,-- stores can have 0 alloc
                   avg(MIN) as MIN,
                   avg(MAX) as MAX,
				   avg(wos) as wos
                   from base_table bt
                GROUP BY 1, 2, 3,4,5,6)
        SELECT alb.*,fi.dc_code, fi.size, fi.allocated_qty as allocated_quantity_size, fi.dc_available,fi.allocated_reserve_qty,nac.net_available,nac.net_available_before_allocation,%7$s dc,paf.l0_name,paf.l1_name ,paf.l2_name,paf.l3_name, paf.l4_name, paf.l5_name, paf.description, paf.launch_date, paf.country_product, paf.collection, paf.product_life_cycle ,paf.class,paf.subclass, paf.clearance_date,1 as order
        FROM article_level_base_table alb
        LEFT JOIN final_inv fi USING(article, allocation_category)
        %8$s 
        LEFT JOIN (
            SELECT article, size, product_code, l0_name, l1_name, l2_name, l3_name, l4_name, l5_name, product_description description, launch_date, country_product, collection, product_life_cycle, class, subclass, clearance_date
            FROM global.product_attributes_filter paf WHERE article in (SELECT distinct article from base_table)
        ) paf USING (article, size)
        left join net_availble_count nac on fi.article = nac.article and fi.dc_code = nac.dc_code and fi.size = nac.size and fi.allocation_category=nac.allocation_category
        $$, $2, _store_filter, _article_filter, _final_inv_query, _original_allocation_code,
        CASE WHEN _allocation_type = 4 THEN 'js.key::text' ELSE 'js.key::int' END,
        CASE WHEN _allocation_type = 4 THEN 'fi.dc_code' ELSE 'dcs.name' END,
        CASE WHEN _allocation_type = 4 THEN '' ELSE 'LEFT JOIN global.distribution_centres dcs using(dc_code)' END);
        
        -- Ensure _query_combine is not null
        IF _query_combine IS NULL THEN
            raise exception 'Error: _query_combine is NULL after format operation';
        END IF;
        
        raise notice 'Allocation Type: %', _allocation_type;
        raise notice 'Query Length: %', length(_query_combine);
        raise notice 'Query First 500 chars: %', substring(_query_combine, 1, 500);
        raise notice 'Query Last 500 chars: %', substring(_query_combine, length(_query_combine) - 499, 500);
        
        -- Check for multiple statements (semicolons)
        IF position(';' in _query_combine) > 0 THEN
            raise notice 'WARNING: Query contains semicolons at positions: %', 
                array_to_string(array(select i from generate_series(1, length(_query_combine)) i where substring(_query_combine, i, 1) = ';'), ', ');
        END IF;
        
        -- Print the complete final query BEFORE any validation
        raise notice 'COMPLETE FINAL QUERY:';
        raise notice '%', _query_combine;
        
        -- Try to validate the query syntax by running EXPLAIN
        BEGIN
            EXECUTE 'EXPLAIN ' || _query_combine;
            raise notice 'Query syntax validation: PASSED';
        EXCEPTION WHEN OTHERS THEN
            raise notice 'Query syntax validation: FAILED - %', SQLERRM;
            -- Don't throw exception here - let the main execution handle it
            -- raise exception 'Query syntax error: %', SQLERRM;
        END;
        
        OPEN $1 FOR execute _query_combine;  
		perform  global.sp_log(v_gen_random_uuid, 'inventory_smart.finalize_product_view', 'Before returning function value',_query_combine,jsonb_build_object('Allocation Code',$2,'Store code',$3,'Ignore allocation codes',$4,'article filter',$5,'type',$6,'allocation_type',_allocation_type));
        RETURN $1;
    END
$function$
;
