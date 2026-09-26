--liquibase formatted sql
--changeset liquibase:scenario_product_view_multi_allocation_type runOnChange:true stripComments:false splitStatements:false context:MTP-85635 labels:MTP-45674
--comment: MTP-85635 | Enhanced scenario product view with multi-allocation type support (normal/PO/new store) and improved allocation comparison
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.scenario_product_view(refcursor, varchar, varchar, varchar, varchar, varchar);

CREATE OR REPLACE FUNCTION inventory_smart.scenario_product_view(input refcursor, character varying, character varying, character varying, character varying, character varying)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
 /* 
  * Function/Procedure name: inventory_smart.scenario_product_view
  * Created by: Manohara Gulla
  * Created at: 27-June-2024
  * No of input parameter: 6
  * Parameter Description : $1 = refcursor name
  *                         $2 = Allocation Code (scenario allocation code)
  *                         $3 = Store code filter
  *                         $4 = Ignore allocation codes
  *                         $5 = Article filter
  *                         $6 = Type ('allocated' or other)

    * Calling Statement:
     begin;
     select * from inventory_smart.scenario_product_view
         ('my_cur',
          '6_155_PFS_20230519T071512_SCENARIO_1',
         '',
         '',
        '',
       'allocated');
      FETCH ALL IN "my_cur";

  * Purpose: Enhanced scenario product view with multi-allocation type support and proper allocation category handling
  * 
  * Features:
  * - Supports multiple allocation types: Normal (0,2), PO (4), New Store (5)
  * - Dynamically adapts data sources based on allocation type from plan_master
  * - Article-store filtering ensures accurate scenario vs original comparisons
  * - Proper allocation category tagging for scenario vs original data comparison
  * - Explicit table aliases to prevent column ambiguity errors
  * - Conditional reserve allocation handling (only for normal allocations)
  * - Type-specific inventory table usage (dc/po/ns available/allocated units)
  * - Proper DC code handling (integer for normal/NS, text for PO)
  * - Distribution center lookup bypass for PO allocations
  * - Enhanced debugging with complete query logging
  * - String concatenation instead of format() for better parameter handling
  * 
  * Data Sources by Type:
  * - Normal (0,2): sku_dc_available_units, sku_dc_allocated_units, sku_dc_reserved_units
  * - PO (4): sku_po_available_units, sku_po_allocated_units (no reserves, no DC lookup)
  * - New Store (5): sku_ns_available_units, sku_ns_allocated_units (no reserves)
  * 
  * Key Fixes Applied:
  * - Fixed allocation_category tagging in allocated units queries (SELECT 'scenario'/'original' AS allocation_category)
  * - Added explicit table aliases (am.dc_code, b.allocation_category, etc.)
  * - Conditional distribution center joins to prevent text/integer comparison errors for PO
  * - Enhanced error handling and debug logging
  * - Proper NULL checks for allocation codes and dates
  * 

     commit;
   
  * if any modification done in same function/procedure please record the changes in below format
  *
  * Updated_by       Updated_on      Purpose
  * ----------       -----------     --------
  * Krishna        2025-08-06      Added multi-allocation type support, fixed allocation_category 
  *                                  tagging, added explicit aliases, conditional DC joins, enhanced debugging
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
		-- Extract original allocation code by splitting on '_SCENARIO'
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
	   	
	   	-- Ensure _pm_date is not NULL
	   	IF _pm_date IS NULL THEN
	   		_pm_date := CURRENT_DATE;
	   	END IF;
	   	
	   	raise notice 'pm_date: %', _pm_date;

	    _article_filter := '';
        _store_filter := '';
        if ($3 = '') IS FALSE
            then
                _store_filter := format($$ AND store_code = '%s'$$, $3);
            end if;
        IF ($5 = '') IS FALSE
        THEN
            _article_filter := format($$ AND article IN ('%s')$$, $5);
        END IF;
        
        -- Debug output for variable assignments
        raise notice 'Variables: _store_filter=%, _article_filter=%, _original_allocation_code=%, _allocation_type=%', 
            _store_filter, _article_filter, _original_allocation_code, _allocation_type;
            
        -- Test if allocation code exists in plan_master
        PERFORM 1 FROM inventory_smart.plan_master WHERE plan_code = _original_allocation_code;
        IF NOT FOUND THEN
            raise notice 'WARNING: Original allocation code % not found in inventory_smart.plan_master', _original_allocation_code;
        END IF;
        
        -- Test if allocation code exists in create_allocation_result_flat_gurobi
        PERFORM 1 FROM inventory_smart.create_allocation_result_flat_gurobi WHERE allocation_code = $2 LIMIT 1;
        IF NOT FOUND THEN
            raise notice 'WARNING: Scenario allocation code % not found in inventory_smart.create_allocation_result_flat_gurobi', $2;
        END IF;
        
        -- Check the actual pack_dc_allocation data structure to verify casting logic
        declare 
            _sample_keys text[];
            _sample_pack_data jsonb;
        begin
            SELECT pack_dc_allocation INTO _sample_pack_data
            FROM inventory_smart.create_allocation_result_flat_gurobi 
            WHERE allocation_code = $2 
            LIMIT 1;
            
            IF _sample_pack_data IS NOT NULL THEN
                _sample_keys := array(SELECT jsonb_object_keys(_sample_pack_data));
                raise notice 'Sample pack_dc_allocation keys for allocation type %: %', _allocation_type, array_to_string(_sample_keys[1:3], ', ');
                
                -- Check if keys look like integers or text (PO codes)
                IF _sample_keys[1] ~ '^[0-9]+$' THEN
                    raise notice 'Keys appear to be numeric (DC codes)';
                ELSE
                    raise notice 'Keys appear to be text/PO codes - may need type adjustment';
                    raise notice 'First key sample: %', _sample_keys[1];
                END IF;
            END IF;
        end;
        
        IF ($6 = 'allocated')
            THEN
                _final_inv_query := 
                    ' ,current_available as (' ||
                    ' SELECT a.dc_code, a.article, a.size, SUM(oh) oh' ||
                    ' FROM (' ||
                        ' SELECT article, size, pack_type_id, dc_code FROM packs GROUP BY 1, 2, 3, 4' ||
                    ') a ' ||
                    ' LEFT JOIN (' ||
                    CASE 
                        WHEN _allocation_type = 5 THEN 
                            ' SELECT * FROM inventory_smart.sku_ns_available_units where (article, dc_code) in (SELECT article, dc_code FROM packs)'
                        WHEN _allocation_type = 4 THEN 
                            ' SELECT * FROM inventory_smart.sku_po_available_units where (article, po_code) in (SELECT article, dc_code FROM packs)'
                        ELSE 
                            ' SELECT * FROM inventory_smart.sku_dc_available_units where (article, dc_code) in (SELECT article, dc_code FROM packs)'
                    END ||
                    ') b ' ||
                    CASE 
                        WHEN _allocation_type = 4 THEN ' ON (a.dc_code = b.po_code AND a.pack_type_id = b.pack_type_id AND a.article = b.article AND a.size = b.size)'
                        ELSE ' USING(dc_code, pack_type_id, article, size)'
                    END ||
                    ' GROUP BY 1, 2, 3' ||
                ')' ||
        CASE 
            WHEN _allocation_type IN (0, 2) THEN 
                ' ,reserve_allocation as (' ||
                    ' SELECT dc_code, article, size, SUM(COALESCE(quantity,0)) user_reserve_qty ' ||
                    ' FROM (' ||
                        ' SELECT dc_code, article, size, pack_type_id FROM packs' ||
                        ' GROUP BY 1, 2, 3, 4' ||
                    ') am' ||
                    ' LEFT JOIN (' ||
                    ' SELECT * FROM inventory_smart.sku_dc_reserved_units where (article, dc_code) in (SELECT article, dc_code FROM packs)' ||
                    ') b' ||
                    ' USING (dc_code, article, size, pack_type_id)' ||
                    ' GROUP BY 1, 2, 3' ||
                ')'
            ELSE ''
        END ||
		' ,other_allocations_pre as (' ||
        CASE 
            WHEN _allocation_type = 5 THEN 
                ' SELECT ''scenario'' as allocation_category, * FROM inventory_smart.sku_ns_allocated_units( ' || quote_literal($2) || ' )' ||
                ' UNION ALL ' ||
                ' SELECT ''original'' as allocation_category, * FROM inventory_smart.sku_ns_allocated_units( ' || quote_literal(_original_allocation_code) || ' )'
            WHEN _allocation_type = 4 THEN 
                ' SELECT ''scenario'' as allocation_category, * FROM inventory_smart.sku_po_allocated_units( ' || quote_literal($2) || ' )' ||
                ' UNION ALL ' ||
                ' SELECT ''original'' as allocation_category, * FROM inventory_smart.sku_po_allocated_units( ' || quote_literal(_original_allocation_code) || ' )'
            ELSE 
                ' SELECT ''scenario'' as allocation_category, * FROM inventory_smart.sku_dc_allocated_units( ' || quote_literal($2) || ' )' ||
                ' UNION ALL ' ||
                ' SELECT ''original'' as allocation_category, * FROM inventory_smart.sku_dc_allocated_units( ' || quote_literal(_original_allocation_code) || ' )'
        END ||
		')' ||
        ' ,other_allocations as (' ||
                    ' SELECT allocation_category, dc_code, article, size, SUM(allocated_reserve_qty) as allocated_reserve_qty' ||
                                         ' FROM (' ||
                         ' SELECT b.allocation_category, am.dc_code, am.article, am.pack_type_id, am.size, COALESCE(b.quantity,0) as allocated_reserve_qty' ||
                         ' FROM (' ||
                             ' SELECT dc_code, article, pack_type_id, size FROM packs' ||
                             ' GROUP BY 1, 2, 3, 4' ||
                         ') am' ||
                         ' join other_allocations_pre b' ||
                        CASE 
                            WHEN _allocation_type = 4 THEN ' ON (am.dc_code = b.dc_code AND am.article = b.article AND am.size = b.size AND am.pack_type_id = b.pack_type_id)'
                            ELSE ' USING (dc_code, article, size, pack_type_id)'
                        END ||
                    ') a' ||
                    ' GROUP BY 1, 2, 3, 4' ||
                ')' ||
        ' ,final_inv as materialized (' ||
                    ' SELECT ' ||
                    '	foo.allocation_category,' ||
                    '	dc_code,' ||
                           ' article,' ||
                           ' foo.size,' ||
                           ' allocated_qty,' ||
                           ' COALESCE(SUM(oh),0) as dc_available,' ||
                           ' COALESCE(SUM(allocated_reserve_qty),0) as allocated_reserve_qty' ||
                    ' FROM (' ||
                         ' SELECT ' ||
                         '	allocation_category,' ||
                         '	dc_code,' ||
                                ' article,' ||
                                ' size,' ||
                                ' SUM(allocated_qty) as allocated_qty' ||
                        ' FROM packs' ||
                        ' GROUP BY 1, 2, 3, 4' ||
                    ') foo' ||
                    ' LEFT JOIN current_available USING (dc_code, article, size)' ||
                    ' LEFT JOIN other_allocations USING (dc_code, article, size, allocation_category)' ||
                    CASE 
                        WHEN _allocation_type IN (0, 2) THEN ' left join reserve_allocation using (dc_code, article, size)'
                        ELSE ''
                    END ||
                    ' GROUP BY 1, 2, 3, 4, 5' ||
                ')' ||
        ' ,net_availble_count as (' ||
        '	select allocation_category, article, dc_code, COALESCE(sum(dc_available),0) - COALESCE(sum(allocated_qty),0) - COALESCE(sum(allocated_reserve_qty),0)  net_available,' ||
        '		   COALESCE(sum(dc_available),0) - COALESCE(sum(allocated_reserve_qty),0) as net_available_before_allocation' ||
        '	from final_inv' ||
        '	group by allocation_category, dc_code,article' ||
        ')'; 
    ELSE
        _final_inv_query := 
            ' ,final_inv as (' ||
        		    ' SELECT a.*,' ||
        				   CASE WHEN _allocation_type = 4 THEN 'dc_code' ELSE 'name' END || ' as dc_name,' ||
        		       	   ' COALESCE(dc_available, 0) - COALESCE(allocated_qty, 0)  as net_available,' ||
        		       	   CASE WHEN _allocation_type IN (0, 2) THEN 'user_reserve_qty' ELSE '0' END || ' as allocated_reserve_qty' ||
        		    ' FROM (' ||
        		        ' SELECT' ||
        		            ' article,' ||
        		            ' dc_code,' ||
                            ' size,' ||
        		            ' SUM(allocated_qty) as allocated_qty,' ||
        		            ' sum(available_qty) as dc_available' ||
						' FROM (' ||
							' select ' ||
								' article,' ||
        		            	' dc_code,' ||
        		            	' pack_type_id,' ||
                                ' size,' ||
        		            	' SUM(allocated_qty) as allocated_qty,' ||
        		            	' avg(available_qty) as available_qty' ||
							' from packs' ||
							' group by 1,2,3,4) a' ||
						' GROUP BY 1, 2, 3' ||
        		    ') a' ||
        		    CASE WHEN _allocation_type = 4 THEN '' ELSE ' LEFT JOIN global.distribution_centres USING (dc_code)' END ||
        		')' ||
                ' ,net_availble_count as (' ||
        	' select article, dc_code, COALESCE(sum(dc_available),0) - COALESCE(sum(allocated_qty),0) net_available,' ||
            ' COALESCE(sum(dc_available),0)  as net_available_before_allocation' ||
        	' from final_inv' ||
        	' group by dc_code,article' ||
        ')';
        END IF;
        
        -- Ensure _final_inv_query is not NULL
        IF _final_inv_query IS NULL THEN
        	raise exception 'Error: _final_inv_query is NULL';
        END IF;
        
        -- Debug format parameters before calling format()
        raise notice 'Format Parameters Debug:';
        raise notice 'Parameter 1 ($2): %', $2;
        raise notice 'Parameter 2 (_store_filter): %', _store_filter;
        raise notice 'Parameter 3 (_article_filter): %', _article_filter;
        raise notice 'Parameter 4 (_final_inv_query): %', substring(_final_inv_query, 1, 100) || '...';
        raise notice 'Parameter 5 (_original_allocation_code): %', _original_allocation_code;
        
        -- Debug the dynamic CASE statement parameters
        raise notice 'Parameter 6 (current_available_query): %', 
            CASE 
                WHEN _allocation_type = 5 THEN 'sku_ns_available_units'
                WHEN _allocation_type = 4 THEN 'sku_po_available_units'
                ELSE 'sku_dc_available_units'
            END;
        
        raise notice 'Parameter 7 (reserve_allocation_cte): %', 
            CASE 
                WHEN _allocation_type IN (0, 2) THEN 'reserve_allocation CTE included'
                ELSE 'no reserve allocation'
            END;
            
        raise notice 'Parameter 10 (dc_code_casting): %', 
            CASE 
                WHEN _allocation_type = 4 THEN 'js.key::text'
                ELSE 'js.key::int'
            END;
            
        -- Debug ALL format parameters (6-15) to find NULL values
        raise notice 'Parameter 6 (current_available_query): %', 
            CASE 
                WHEN _allocation_type = 5 THEN 
                    'SELECT * FROM inventory_smart.sku_ns_available_units where (article, dc_code) in (SELECT article, dc_code FROM packs)'
                WHEN _allocation_type = 4 THEN 
                    'SELECT * FROM inventory_smart.sku_po_available_units where (article, po_code) in (SELECT article, dc_code FROM packs)'
                ELSE 
                    'SELECT * FROM inventory_smart.sku_dc_available_units where (article, dc_code) in (SELECT article, dc_code FROM packs)'
            END;
            
        raise notice 'Parameter 8 (other_allocations_query): %', 
            CASE 
                WHEN _allocation_type = 5 THEN 
                    'SELECT ''scenario'' as allocation_category, * FROM inventory_smart.sku_ns_allocated_units( ''' || $2 || ''' ) UNION ALL SELECT ''original'' as allocation_category, * FROM inventory_smart.sku_ns_allocated_units( ''' || _original_allocation_code || ''' )'
                WHEN _allocation_type = 4 THEN 
                    'SELECT ''scenario'' as allocation_category, * FROM inventory_smart.sku_po_allocated_units( ''' || $2 || ''' ) UNION ALL SELECT ''original'' as allocation_category, * FROM inventory_smart.sku_po_allocated_units( ''' || _original_allocation_code || ''' )'
                                 ELSE 
                     'SELECT ''scenario'' as allocation_category, * FROM inventory_smart.sku_dc_allocated_units( ''' || $2 || ''' ) UNION ALL SELECT ''original'' as allocation_category, * FROM inventory_smart.sku_dc_allocated_units( ''' || _original_allocation_code || ''' )'
             END;
             
        raise notice 'Parameter 9 (reserve_allocation_join): %', 
            CASE 
                WHEN _allocation_type IN (0, 2) THEN 'left join reserve_allocation using (dc_code, article, size)'
                ELSE ''
            END;
            
        raise notice 'Parameter 11 (distribution_centre_join): %', 
            CASE 
                WHEN _allocation_type = 4 THEN ''
                ELSE 'LEFT JOIN global.distribution_centres USING (dc_code)'
            END;
            
        raise notice 'Parameter 12 (user_reserve_qty): %', 
            CASE 
                WHEN _allocation_type IN (0, 2) THEN 'user_reserve_qty'
                ELSE '0'
            END;
            
        raise notice 'Parameter 13 (current_available_join): %', 
            CASE 
                WHEN _allocation_type = 4 THEN 'ON (a.dc_code = b.po_code AND a.pack_type_id = b.pack_type_id AND a.article = b.article AND a.size = b.size)'
                ELSE 'USING(dc_code, pack_type_id, article, size)'
            END;
            
        raise notice 'Parameter 14 (other_allocations_join): %', 
            CASE 
                WHEN _allocation_type = 4 THEN 'ON (am.dc_code = b.dc_code AND am.article = b.article AND am.size = b.size AND am.pack_type_id = b.pack_type_id)'
                ELSE 'USING (dc_code, article, size, pack_type_id)'
            END;
            
        raise notice 'Parameter 15 (dc_name_field): %', 
            CASE 
                WHEN _allocation_type = 4 THEN 'dc_code'
                ELSE 'name'
            END;
            
        -- Use string concatenation instead of format() to avoid parameter issues
        _query_combine := 
            'WITH base_table_temp as materialized (' ||
                'SELECT article, channel, store store_code,pack_dc_allocation,inventory_source, demand_type, demand, allocated_total, min,max,oh,oo,it,lt_forecast,wos,product_profile_selected,carfs.retail_size_cd size,carfs.selected_store_group_names,' ||
                       'oh_oo_intransit, (allocated_total + oh_oo_intransit) / nullif(ros, 0) AS current_wos,' ||
			           ' case ' ||
			                ' when allocation_code like ''%SCENARIO%'' then ''scenario''' ||
			                ' else ''original''' ||
			           ' end as allocation_category' ||
                ' FROM inventory_smart.create_allocation_result_flat_gurobi carfs' ||
                ' LEFT JOIN global.store_attributes_filter saf ON store_code = store' ||
                ' WHERE allocation_code in (' || quote_literal($2) || ',' || quote_literal(_original_allocation_code) || ')' || _article_filter || _store_filter ||
				' and carfs.created_at between ' || quote_literal(_pm_date::timestamp) || ' and ' || quote_literal(_pm_date::timestamp + interval '1 day') ||
        ')' ||
		' ,scenario_article_store as (' ||
        ' select article, store_code from base_table_temp where allocation_category=''scenario'' group by 1, 2' ||
        ')' ||
		' ,base_table as (' ||
        ' select * from base_table_temp a' ||
        ' where exists (select 1 from scenario_article_store b where b.article=a.article and b.store_code=a.store_code)' ||
        ')' ||
		
        ' ,flat_table as (' ||
                ' SELECT ' ||
					   ' allocation_category,' ||
					   ' article,' ||
                       ' store_code,' ||
                       ' ' || CASE WHEN _allocation_type = 4 THEN 'js.key::text' ELSE 'js.key::int' END || ' dc_code, ' ||
                       ' channel,' ||
                       ' size,' ||
                       ' UNNEST((TRANSLATE((js.value::jsonb->>''packs_allocated'')::text, ''[]'', ''{}''))::text[]) pack_type_id,' ||
                       ' UNNEST((TRANSLATE((js.value::jsonb->>''packs_allocated_qty'')::text, ''[]'', ''{}''))::numeric[]) allocated_qty,' ||
                       ' UNNEST((TRANSLATE((js.value::jsonb->>''packs_available_qty'')::text, ''[]'', ''{}''))::numeric[]) available_qty' ||        
                ' FROM (' ||
                    ' SELECT * FROM base_table ' ||
                ') foo , JSONB_EACH(pack_dc_allocation) js' ||
            ')' ||  
        ' ,packs as materialized (' ||
                ' SELECT allocation_category,' ||
					   ' article,' ||
                       ' dc_code,' ||
                       ' store_code,' ||
                       ' pack_type_id,' ||
                       ' dpc.size,' ||
                       ' channel,' ||
                       ' pack_type,' ||
                       ' allocated_qty * units_in_pack::double precision AS allocated_qty,' ||
                       ' available_qty * units_in_pack::double precision AS available_qty' ||
                ' FROM inventory_smart.dc_pack_configuration dpc' ||
                ' JOIN flat_table USING (article, pack_type_id,size)' ||
            ')' ||
         _final_inv_query ||

        ' ,article_level_base_table as  (' ||
            ' select allocation_category,' ||
				   'article, ' ||
            	   'inventory_source, ' ||
            	   'demand_type,' ||
				  'product_profile_selected, ' ||
                  'REPLACE(selected_store_group_names[1], '''''''', '''') as store_group,' ||
            	   'sum(demand) as demand,' ||
            	   'COUNT( DISTINCT(CASE WHEN allocated_total > 0 then store_code end)) as store, ' ||
            	   'COUNT( distinct store_code ) as all_stores,' ||
                   'avg(MIN) as MIN,' ||
                   'avg(MAX) as MAX,' ||
				   'avg(wos) as wos' ||
                   ' from base_table bt' ||
                ' GROUP BY 1, 2, 3,4,5,6)' ||
        ' SELECT alb.*,fi.dc_code, fi.size, fi.allocated_qty as allocated_quantity_size, fi.dc_available,fi.allocated_reserve_qty,nac.net_available,nac.net_available_before_allocation,' ||
        CASE WHEN _allocation_type = 4 THEN 'fi.dc_code' ELSE 'dcs.name' END || ' dc,paf.l0_name,paf.l1_name ,paf.l2_name,paf.l3_name, paf.l4_name, paf.l5_name, paf.description, paf.launch_date, paf.country_product, paf.collection, paf.product_life_cycle ,paf.class,paf.subclass, paf.clearance_date, 1 as order' ||
        ' FROM article_level_base_table alb' ||
        ' LEFT JOIN final_inv fi USING(article, allocation_category)' ||
        CASE WHEN _allocation_type = 4 THEN '' ELSE ' LEFT JOIN global.distribution_centres dcs using(dc_code)' END || 
        ' LEFT JOIN (' ||
            ' SELECT article, size, product_code, l0_name, l1_name, l2_name, l3_name, l4_name, l5_name, product_description description, launch_date, country_product, collection, product_life_cycle, class, subclass, clearance_date' ||
            ' FROM global.product_attributes_filter paf WHERE article in (SELECT distinct article from base_table)' ||
        ') paf USING (article, size)' ||
        ' left join net_availble_count nac on fi.article = nac.article and fi.dc_code = nac.dc_code and fi.allocation_category=nac.allocation_category';
        
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
		perform  global.sp_log(v_gen_random_uuid, 'inventory_smart.scenario_product_view', 'Before returning function value',_query_combine,jsonb_build_object('Allocation Code',$2,'Store code',$3,'Ignore allocation codes',$4,'article filter',$5,'type',$6,'allocation_type',_allocation_type));
        RETURN $1;
    END
$function$
;
