--liquibase formatted sql
--changeset liquibase:order_batching_update_article runOnChange:true stripComments:false splitStatements:false context:MTP-70495_2 bugfix labels:MTP-70495_2 bugfix
--comment: MTP-70495 bugfix
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
	 * Created by: Nibeel Yunus
	 * Created at: 06-Feb-2025
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
	 *
	 *  Updated_by                  Updated_on          Purpose
	 *  ----------                  -----------         --------
		 Nibeel Yunus           	06-Feb-2025     MTP-70495:Pagination on Order Batching Screen
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
            			inp.article::TEXT AS article,
            			inp.store::TEXT AS store,
            			update_delivery_dt as delivery_dt,
           				update_order_priority as order_priority
        			FROM (
            		SELECT
							allocation_code,
							article,
                		store,
                		COALESCE(
                    		jsonb_extract_path_text('||quote_literal(_values)||',''delivery_dt'')::TIMESTAMP, 
                    delivery_dt
                ) AS update_delivery_dt,
             	COALESCE(
    				jsonb_extract_path_text('||quote_literal(_values)||',''order_priority''),
					order_priority::jsonb->>''value''
				) AS update_order_priority
            	FROM cache."cache_result_' || _cache_key || '" 
            	WHERE true ' || _include_exclude_query || _query_meta_filters || ' 
            	GROUP BY allocation_code, article, store, update_delivery_dt, update_order_priority
					) inp
        	WHERE 
           		COALESCE(inp.allocation_code, '''') <> ''''
            	AND COALESCE(inp.article, '''') <> ''''
            	AND COALESCE(inp.store, '''') <> ''''
    		);';		


		else
		--inline edit
		_query_combine := '
			CREATE temp TABLE if not exists order_batching_update_' || _cache_key ||' 
    		ON COMMIT DROP AS (	
   				SELECT
    				allocation_code,
    				article,						
    				store,
    				MAX(
        			COALESCE(
           				(NULLIF(rec.delivery_dt, ''''))::TIMESTAMP, 
            			carfg.delivery_dt
        				)
    				) AS delivery_dt,
    				MAX(COALESCE(rec.order_priority, carfg.order_priority)) AS order_priority
					FROM (	
    					SELECT
        					value->>''allocation_code'' AS allocation_code,
	 				        value->>''article'' AS article,
					        value->>''store'' AS store,
					        NULLIF(MAX(value->>''delivery_dt''), '''') AS delivery_dt,
					        NULLIF(MAX(value->>''order_priority''), '''')::INTEGER AS order_priority
    					FROM jsonb_array_elements('||quote_literal(_row_update)||') 
    				GROUP BY allocation_code, article, store
					) rec 
				LEFT JOIN inventory_smart.create_allocation_result_flat_gurobi carfg 
				USING (allocation_code, article, store)
				GROUP BY allocation_code, article, store
			);';
		end if;
	RAISE NOTICE 'QUERY COMBINE: %', _query_combine;
	EXECUTE _query_combine;

	_query_combine := '
		UPDATE cache.cache_result_' || _cache_key ||' cache
		SET 
    		delivery_dt = obu.delivery_dt,
    		order_priority = jsonb_build_object(''label'', obu.order_priority::TEXT, ''value'', obu.order_priority::TEXT)
		FROM order_batching_update_' || _cache_key ||' obu
		WHERE 
    		cache.allocation_code = obu.allocation_code AND 
    		cache.article = obu.article AND 
    		cache.store = obu.store;';

	RAISE NOTICE 'QUERY COMBINE: %', _query_combine;
	EXECUTE _query_combine;


	_query_combine := '
		UPDATE inventory_smart.create_allocation_result_flat_gurobi carfg
		SET 
    		delivery_dt = obu.delivery_dt,
    		order_priority = obu.order_priority::BIGINT,
            updated_by = '||_user_id||',
            updated_at = NOW()
		FROM order_batching_update_' || _cache_key ||' obu
		WHERE 
    		carfg.allocation_code = obu.allocation_code AND 
    		carfg.article = obu.article AND 
    		carfg.store = obu.store;';
	RAISE NOTICE 'QUERY COMBINE: %', _query_combine;
	EXECUTE _query_combine;
	
	END;
	$function$
;