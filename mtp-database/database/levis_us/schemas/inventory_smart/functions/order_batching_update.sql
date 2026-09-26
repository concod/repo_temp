--liquibase formatted sql
--changeset liquibase:order_batching_update runOnChange:true stripComments:false splitStatements:false context:MTP-100349 labels:MTP-100349
--comment: MTP-100349 order batching update function - Levi's US version
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.order_batching_update(jsonb, integer);
DROP FUNCTION IF EXISTS inventory_smart.order_batching_update(boolean, integer[], integer[], jsonb, jsonb, text, jsonb, integer);
CREATE OR REPLACE FUNCTION inventory_smart.order_batching_update(_is_set_all boolean, _inclusion integer[], _exclusion integer[], _values jsonb, _meta jsonb, _cache_key text, _row_update jsonb, _user_id integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
	/*
	 * Function/Procedure name: inventory_smart.order_batching_update
	 * Created by: Krishna
	 * Created at: 07-Aug-2025
	 * No of input parameter: 8
	 * Parameter Description : 
	 * 						   $1 = Set all flag
	 					   	   $2 = Included unique IDs
						   $3 = Excluded unique IDs
						   $4 = Values to update
						   $5 = Search filters
						   $6 = Cache key
	 					   	   $7 = Row Update
						   $8 = User ID
	 						
	 * Purpose: This procedure is created to update order batching. Handles set all, set all with exclusions, select few records and set all and inline edits.
	 * Calling Statement:
		    select * from inventory_smart.order_batching_update(true,
			[1,2,3],
			[1,2,3],
			'{"allocation_code": null, "article": null, "store": null, "delivery_dt": "21/01/2025", "order_type": null, "order_priority": "2"}',
			'{"search": [{"column": "style", "type": "str", "search_type": "contains", "pattern": "1H568310"}], "range": [], "query_type": "AND"}',
			'1234-5678-9001',
			'[{"allocation_code": "dlfe", "article": "3jirn3pi", "store": "eirne", "delivery_dt": "21/01/2025", "order_type": null, "order_priority": "2"}, {"allocation_code": "dlfe", "article": "3jirn3pi", "store": "eirne", "delivery_dt": "21/01/2025", "order_type": null, "order_priority": "2"}]',
			251);
	 *
	 * if any modification done in same function/procedure please record the changes in below format
	 */
	declare
	_set_value_query text := '';
	_include_exclude_query text :='';
	_con text[];
	_query_meta_filters text;
	_key text;
	_value text;
	_query_combine text;
	_refresh_query text;
	_start_date date := ((CURRENT_DATE - INTERVAL '5 days') AT TIME ZONE 'America/Los_Angeles')::date;
	_end_date date := ((CURRENT_DATE + INTERVAL '1 day') AT TIME ZONE 'America/Los_Angeles')::date;
	_allocations text;
    _styles text;
    _stores text;
    _delivery_dt text;
    _order_priority text;
	_sql TEXT;
	_query_part text := '';
	
	begin
		_query_meta_filters := global.form_table_query(_meta);
		_query_meta_filters := REPLACE(_query_meta_filters, 'WHERE', 'AND');
		if _is_set_all then

			if cardinality(_exclusion) > 0 then
			--set all records and unselect few
				_include_exclude_query := ' AND NOT (unique_key::int = ANY('|| quote_literal(_exclusion)||'::int[]))';
				
			elsif cardinality(_inclusion) > 0 then
			--select few records and set all
				_include_exclude_query := ' AND (unique_key::int = ANY('|| quote_literal(_inclusion)||'::int[]))';
			end if;

			_query_combine := '
    			CREATE temp TABLE if not exists order_batching_update_' || _cache_key ||' 
    			ON COMMIT DROP 
    			AS (
        			SELECT
						allocation_code,
            			inp.display_article::TEXT,
            			inp.store::TEXT AS store,
            			update_delivery_dt as delivery_dt
        			FROM (
            		SELECT
							allocation_code,
							display_article,
                		store,
                		COALESCE(
                    		jsonb_extract_path_text('||quote_literal(_values)||',''delivery_dt'')::TIMESTAMP, 
                    delivery_dt
                ) AS update_delivery_dt
            	FROM cache."cache_result_' || _cache_key || '" 
            	WHERE true ' || _include_exclude_query || _query_meta_filters || ' 
            	GROUP BY allocation_code, display_article, store, update_delivery_dt
					) inp
        	WHERE 
           		COALESCE(inp.allocation_code, '''') <> ''''
            	AND COALESCE(inp.display_article, '''') <> ''''
            	AND COALESCE(inp.store, '''') <> ''''
    		);';		


		else
		--inline edit
		_query_combine := '
			CREATE temp TABLE if not exists order_batching_update_' || _cache_key ||' 
    		ON COMMIT DROP AS (	
   				SELECT
    				allocation_code,
    				display_article,						
    				store,
    				MAX(
        			COALESCE(
           				(NULLIF(rec.delivery_dt, ''''))::TIMESTAMP, 
            			carfg.delivery_dt
        				)
    				) AS delivery_dt
					FROM (	
    					SELECT
        					value->>''allocation_code'' AS allocation_code,
	 				        value->>''display_article'' AS display_article,
					        value->>''store'' AS store,
					        NULLIF(MAX(value->>''delivery_dt''), '''') AS delivery_dt
    					FROM jsonb_array_elements('||quote_literal(_row_update)||') 
    				GROUP BY allocation_code, display_article, store
					) rec
				LEFT JOIN (select * from inventory_smart.create_allocation_result_flat_gurobi carfg where created_at >= ' || quote_literal(_start_date) || ' AND created_at < ' || quote_literal(_end_date) || ' ) carfg
				USING (allocation_code, display_article, store)
				GROUP BY allocation_code, display_article, store
			);';
		end if;
	RAISE NOTICE 'QUERY COMBINE: %', _query_combine;
	EXECUTE _query_combine;

	_query_combine := '
		UPDATE cache.cache_result_' || _cache_key ||' cache
		SET 
    		delivery_dt = obu.delivery_dt
		FROM order_batching_update_' || _cache_key ||' obu
		WHERE 
    		cache.allocation_code = obu.allocation_code AND 
    		cache.display_article = obu.display_article AND 
    		cache.store = obu.store;';

	RAISE NOTICE 'QUERY COMBINE: %', _query_combine;
	EXECUTE _query_combine;


	-- CARFG update
	if _is_set_all and cardinality(_exclusion) = 0 and cardinality(_inclusion) = 0 then
    	_sql := '
        SELECT 
            string_agg(DISTINCT quote_literal(allocation_code), '',''),
            string_agg(DISTINCT quote_literal(display_article), '',''),
            string_agg(DISTINCT quote_literal(store), '',''),
            MIN(delivery_dt::text)
        FROM order_batching_update_' || _cache_key || ';';

		RAISE NOTICE 'Executing SQL: %', _sql;
    	EXECUTE _sql INTO _allocations, _styles, _stores, _delivery_dt;

		IF jsonb_extract_path_text(_values, 'delivery_dt') IS NOT NULL THEN
    		_query_part := _query_part || 'delivery_dt = ' || quote_literal(jsonb_extract_path_text(_values, 'delivery_dt')::timestamp) || ',';
		END IF;
    		
		_query_combine := '
    		UPDATE inventory_smart.create_allocation_result_flat_gurobi carfg
    		SET '
				|| _query_part ||
   	  	   		' updated_by = ' || _user_id || ',
        		updated_at = NOW()
    		WHERE 
        		created_at >= ' || quote_literal(_start_date) || ' AND
        		created_at < ' || quote_literal(_end_date) || ' AND
        		allocation_code IN (' || _allocations || ') AND
        		display_article IN (' || _styles || ') AND
        		store IN (' || _stores || ');';
    	RAISE NOTICE 'QUERY COMBINE: %', _query_combine;
		EXECUTE _query_combine;

	else 
		_query_combine := '
			UPDATE inventory_smart.create_allocation_result_flat_gurobi carfg
			SET 
    			delivery_dt = obu.delivery_dt,
       	 	    updated_by = '||_user_id||',
        	    updated_at = NOW()
			FROM order_batching_update_' || _cache_key ||' obu
			WHERE 
				carfg.created_at >= '||quote_literal(_start_date)||' AND
				carfg.created_at < '||quote_literal(_end_date)||' AND
    			carfg.allocation_code = obu.allocation_code AND 
    			carfg.display_article = obu.display_article AND 
    			carfg.store = obu.store;';
		RAISE NOTICE 'QUERY COMBINE: %', _query_combine;
		EXECUTE _query_combine;
	end if;
	
	END;
	$function$
; 