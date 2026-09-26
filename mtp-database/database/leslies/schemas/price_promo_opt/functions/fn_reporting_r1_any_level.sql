--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:fn_reporting_r1_any_level runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for fn_reporting_r1_any_level

DROP FUNCTION IF EXISTS price_promo_opt.fn_reporting_r1_any_level;
CREATE OR REPLACE FUNCTION price_promo_opt.fn_reporting_r1_any_level(product_hierarchy_levels integer[], store_hierarchy_levels integer[], time_hierarchy_level integer, offer_hierarchy_level integer, _start_date date, _end_date date, _product_filters jsonb, _store_filters jsonb, _completed_offer_ids integer[] DEFAULT NULL::integer[], _event_ids integer[] DEFAULT NULL::integer[], _target_currency_id integer DEFAULT NULL::integer, for_download boolean DEFAULT false, customer_hierarchy_levels integer[] DEFAULT ARRAY[0], _customer_filters jsonb DEFAULT '{}'::jsonb)
 RETURNS json
 LANGUAGE plpgsql
AS $function$
-- Purpose – Generates JSON for multi-level promotion reporting (overall, offer, or event level) with standardized metrics, comparisons, and plan variances
-- 
-- Example – SELECT price_promo_opt.fn_reporting_r1_any_level(array[1,2,3], array[1,2,3], 1, 0, '2023-01-01', '2023-03-31', '{"level1_id": [1,2,3]}', '{"level1_id": [1,2,3]}', NULL, NULL, NULL, false); -- Offer level (0)
-- Example – SELECT price_promo_opt.fn_reporting_r1_any_level(array[1,2,3], array[1,2,3], 1, 1, '2023-01-01', '2023-03-31', '{"level1_id": [1,2,3]}', '{"level1_id": [1,2,3]}', NULL, NULL, NULL, false); -- Event level (1)
-- Example – SELECT price_promo_opt.fn_reporting_r1_any_level(array[1,2,3], array[1,2,3], 1, -200, '2023-01-01', '2023-03-31', '{"level1_id": [1,2,3]}', '{"level1_id": [1,2,3]}', NULL, NULL, NULL, false); -- Overall level (-200)
-- 
-- Other Functions Used:
-- * price_promo_opt.fn_reporting_r1_get_hierarchy_names - Gets hierarchy column names
-- * price_promo_opt.fn_reporting_r1_get_hierarchy_names_for_json - Formats hierarchy names for JSON
-- * price_promo.fn_get_target_currency_id - Determines target currency for reporting
-- * price_promo.fn_get_performance_repr - Formats performance representation
-- 
-- Tables Used:
-- * price_promo.ps_reporting_post_hierarchy_date - Contains hierarchical promotion data (Overall level)
-- * price_promo.ps_reporting_post_promo_date - Contains promotion data (Offer level)
-- * price_promo.ps_reporting_post_event_date - Contains event data (Event level)
-- * price_promo.product_master - Contains product information
-- * price_promo.promo_master - Contains promotion details
-- * price_promo.event_master - Contains event information
-- * price_promo.tb_tool_configurations - Contains hierarchy configuration data
-- * global.actual_forex_rate - Contains actual currency exchange rates
-- * global.planned_forex_rate - Contains planned currency exchange rates
-- * global.tb_currency_master - Contains currency information
-- 
-- Returns – A JSON object containing reporting data at the specified hierarchy level (overall, offer, or event) with standardized metrics including:
--   * Sales $ and Units with actual, forecast, plan, LY, LW comparisons and variances
--   * Gross Margin $ and % with actual, forecast, plan, LY, LW comparisons and variances
--   * Contribution Margin $ and % with actual, forecast, LY, LW comparisons and variances
--   * ASP (Average Selling Price) with actual, forecast, plan, LY, LW comparisons and variances
--   * AUM (Average Unit Margin) with actual, forecast, plan, LY, LW comparisons and variances
--   * Incremental metrics for sales, units, and margins
DECLARE
    -- Time-related variables (used early for filtering)
    time_column TEXT := (CASE WHEN time_hierarchy_level = 1 THEN 'week_start_date' ELSE NULL END);
    time_column_2 TEXT := (CASE WHEN time_hierarchy_level = 1 THEN 'week_start_date' WHEN time_hierarchy_level = 0 THEN 'date' ELSE NULL END);
    
    -- Hierarchy configuration variables
    _product_hierarchy_config jsonb;
    _store_hierarchy_config jsonb;
    _customer_hierarchy_config jsonb;

    -- Hierarchy column variables
    product_columns TEXT;
    product_columns_as_null text;
    json_product_columns text := '';
	product_columns_imputed TEXT;
    store_columns TEXT;
    store_columns_as_null text;
    json_store_columns text := '';
	store_columns_imputed TEXT;
    customer_columns TEXT;
    customer_columns_as_null text;
    json_customer_columns text := '';
	customer_columns_imputed TEXT;
    _column_name text;
    
    -- Level-specific variables
    offer_query_table_name text;
    join_conditions text;
    select_groupby_int text;
	select_groupby_int_imputed text;
    total_final_select_groupby_int text;
	total_final_select_groupby_int_imputed text;
    total_query_initial_select_int text;
    final_orderby_int text;
    json_select_int text;
    partition_clause text;
    
    -- Where clause variables
    promo_ids_where text := '';
    event_ids_where text := '';
    total_promo_ids_where text := '';
    total_event_ids_where text := '';
    temp_string_where_condition TEXT;
    _key text;
    _value integer[];
    
    -- Query construction variables
    offer_query_select TEXT;
    offer_query_groupby TEXT;
    offer_query_final_select_groupby TEXT;
	offer_query_final_select_groupby_imputed TEXT;
    total_query_initial_select text;
    total_query_initial_groupby text;
    total_query_final_select text;
    total_query_final_groupby text;
    offer_level_query text;
    total_fetch_query text;
    final_query text;
    final_query_orderby text;
    
    -- JSON output variables
    json_select text := '';
    json_select_total text := '';
    
    -- Currency-related variables
    _currency_query text;
    
    -- Final response
    query TEXT;
    final_response json := null;
BEGIN
    raise notice 'time_column : %, time_column_2: %', time_column, time_column_2;
	
		select config_value::jsonb into _product_hierarchy_config
		from price_promo.tb_tool_configurations
		where module = 'product' and config_name = 'hierarchy_filters';
		
		select config_value::jsonb into _store_hierarchy_config
		from price_promo.tb_tool_configurations
		where module = 'store' and config_name = 'hierarchy_filters';

		select config_value::jsonb into _customer_hierarchy_config
		from price_promo.tb_tool_configurations
		where module = 'customer' and config_name = 'hierarchy_filters';
    
    -- Generate product columns
	product_columns := price_promo_opt.fn_reporting_r1_get_hierarchy_names(product_hierarchy_levels, 'product', array[]::text[]);
    product_columns_as_null := price_promo_opt.fn_reporting_r1_get_hierarchy_names(product_hierarchy_levels, 'product', array[]::text[], true);
    product_columns_imputed := price_promo_opt.fn_reporting_r1_get_hierarchy_names(product_hierarchy_levels, 'product', array[]::text[], false, true);
    json_product_columns := price_promo_opt.fn_reporting_r1_get_hierarchy_names_for_json(product_hierarchy_levels, 'product', array[]::text[]);
		
    -- Generate store columns
    store_columns := price_promo_opt.fn_reporting_r1_get_hierarchy_names(store_hierarchy_levels, 'store', array[]::text[]);
    store_columns_as_null := price_promo_opt.fn_reporting_r1_get_hierarchy_names(store_hierarchy_levels, 'store', array[]::text[],  true);
    store_columns_imputed := price_promo_opt.fn_reporting_r1_get_hierarchy_names(store_hierarchy_levels, 'store', array[]::text[], false, true);
    json_store_columns := price_promo_opt.fn_reporting_r1_get_hierarchy_names_for_json(store_hierarchy_levels, 'store', array[]::text[]);

    -- Generate customer columns
    customer_columns := price_promo_opt.fn_reporting_r1_get_hierarchy_names(customer_hierarchy_levels, 'customer', array[]::text[]);
    customer_columns_as_null := price_promo_opt.fn_reporting_r1_get_hierarchy_names(customer_hierarchy_levels, 'customer', array[]::text[],  true);
    customer_columns_imputed := price_promo_opt.fn_reporting_r1_get_hierarchy_names(customer_hierarchy_levels, 'customer', array[]::text[], false, true);
    json_customer_columns := price_promo_opt.fn_reporting_r1_get_hierarchy_names_for_json(customer_hierarchy_levels, 'customer', array[]::text[]);
	
    -- Raise Notice for all the product columns and store columns
    raise notice 'product_columns : %', product_columns;
    raise notice 'product_columns_as_null : %', product_columns_as_null;
    raise notice 'json_product_columns : %', json_product_columns;
	raise notice 'product_columns_imputed : %', product_columns_imputed;
    raise notice 'store_columns : %', store_columns;
    raise notice 'store_columns_as_null : %', store_columns_as_null;
	raise notice 'store_columns_imputed : %', store_columns_imputed;
    raise notice 'customer_columns : %', customer_columns;
    raise notice 'customer_columns_as_null : %', customer_columns_as_null;
	raise notice 'customer_columns_imputed : %', customer_columns_imputed;
    
	--Get every event filter as completed offer id filter
    IF array_length(_event_ids, 1) > 0 AND coalesce(array_length(_completed_offer_ids, 1), 0) <= 0 THEN
        SELECT COALESCE(array_agg(promo_id), ARRAY[]::integer[]) INTO _completed_offer_ids
        FROM price_promo.promo_master
        WHERE event_id = ANY(_event_ids) and status = 8;
        raise notice 'completed_offer_ids : %', _completed_offer_ids;
    END IF;

    -- If event filters are provided but no completed offers exist for those events,
    -- return an empty payload instead of running an unfiltered query.
    IF array_length(_event_ids, 1) > 0 AND coalesce(array_length(_completed_offer_ids, 1), 0) <= 0 THEN
        RETURN '[]'::json;
    END IF;
    
	
    IF offer_hierarchy_level = 0 THEN --Offer Level

        offer_query_table_name := 'price_promo.ps_reporting_post_promo_date';
        join_conditions := '
            INNER JOIN price_promo.promo_master c 
            ON a.promo_id = c.promo_id
            INNER JOIN (select event_id, name as event_name from price_promo.event_master) d
            ON c.event_id = d.event_id'; -- July 22: a.event_id to c.event_id --
        
        select_groupby_int := '  a.product_id, a.promo_id, c.name, d.event_id, event_name ';  --a.event_id to d.event_id--
		select_groupby_int_imputed := '  a.product_id, a.promo_id, price_promo.impute_special_characters(c.name) AS name, d.event_id, price_promo.impute_special_characters(event_name) AS event_name '; 
        total_final_select_groupby_int := 'promo_id, name, event_id, event_name';
		total_final_select_groupby_int_imputed := 'promo_id, price_promo.impute_special_characters(name) AS name, event_id, price_promo.impute_special_characters(event_name) AS event_name';
        total_query_initial_select_int := 'a.product_id, null::integer as promo_id, null::text as name, null::integer as event_id, null::text as event_name ';
        final_orderby_int := 'total, name, event_name ';
        
        IF for_download THEN 
            json_select_int := ' ''Deal Name'', name, ''Promo Name'', event_name,';
            json_select_total := '';
        ELSE
            json_select_int := ' ''promo_id'', promo_id, ''event_id'', event_id, ''Deal Name'', name, ''Promo Name'', event_name, ';
            json_select_total := ' , ''total'', total ';
        END IF; 

        -- Where conditions of offer and total level for promos and events
        IF array_length(_completed_offer_ids, 1) > 0 THEN
            promo_ids_where = ' AND a.promo_id IN (' || array_to_string(_completed_offer_ids, ',') || ')';
            total_promo_ids_where = format(' AND array[%1$s] && a.promo_id ', array_to_string(_completed_offer_ids, ','));
        END IF;	

    ELSIF offer_hierarchy_level = -200 THEN --Overall Level
        
        offer_query_table_name := 'price_promo.ps_reporting_post_hierarchy_date';
        join_conditions := '';

        select_groupby_int := 'a.product_id'; 
		select_groupby_int_imputed := 'a.product_id'; 
        total_final_select_groupby_int := '';
		total_final_select_groupby_int_imputed := '';
        total_query_initial_select_int := 'a.product_id';
        final_orderby_int := 'total ';
        
        IF for_download THEN 
            json_select_int := '';
            json_select_total := '';
        ELSE
            json_select_int := '';
            json_select_total := ' , ''total'', total ';
        END IF; 

        -- Where conditions of offer and total level for promos and events
        IF array_length(_completed_offer_ids, 1) > 0 THEN
            promo_ids_where = format(' AND array[%1$s] && a.promo_id ', array_to_string(_completed_offer_ids, ','));
            total_promo_ids_where = format(' AND array[%1$s] && a.promo_id ', array_to_string(_completed_offer_ids, ','));
        END IF;

    
    ELSE -- Event Level

        offer_query_table_name := 'price_promo.ps_reporting_post_event_date';
        join_conditions := 'INNER JOIN (select event_id, name as event_name from price_promo.event_master) d 
                            ON a.event_id = d.event_id';

        select_groupby_int := ' a.product_id, a.event_id, event_name '; 
		select_groupby_int_imputed := ' a.product_id, a.event_id, price_promo.impute_special_characters(event_name) AS event_name '; 
        total_final_select_groupby_int := 'event_id, event_name';
		total_final_select_groupby_int_imputed := 'event_id, price_promo.impute_special_characters(event_name) AS event_name';
        total_query_initial_select_int := 'a.product_id, null::integer as event_id, null::text as event_name ';
        final_orderby_int := 'total, event_name ';
        
        IF for_download THEN 
            json_select_int := ' ''Promo Name'', event_name,';
            json_select_total := '';
        ELSE
            json_select_int := ' ''event_id'', event_id, ''Promo Name'', event_name,';
            json_select_total := ' , ''total'', total ';
        END IF; 

        -- Where conditions of offer and total level for promos and events
        IF array_length(_completed_offer_ids, 1) > 0 THEN
            promo_ids_where = format(' AND array[%1$s] && a.promo_id ', array_to_string(_completed_offer_ids, ','));
            total_promo_ids_where = format(' AND array[%1$s] && a.promo_id ', array_to_string(_completed_offer_ids, ','));
        END IF;

    END IF;


    -- Generate aggregation and final grouping strings
    offer_query_select := select_groupby_int_imputed
                            || CASE WHEN product_columns IS NOT NULL AND product_columns <> '' THEN ', ' || product_columns_imputed ELSE '' END
                            || CASE WHEN store_columns IS NOT NULL AND store_columns <> '' THEN ', ' || store_columns_imputed ELSE '' END
                            || CASE WHEN customer_columns IS NOT NULL AND customer_columns <> '' THEN ', ' || customer_columns_imputed ELSE '' END
                            || CASE WHEN time_column IS NOT NULL AND time_column <> '' THEN ', a.' || time_column ELSE '' END
                            || ', a.date, 0 as total,';
    offer_query_groupby := select_groupby_int
                            || CASE WHEN product_columns IS NOT NULL AND product_columns <> '' THEN ', ' || product_columns ELSE '' END
                            || CASE WHEN store_columns IS NOT NULL AND store_columns <> '' THEN ', ' || store_columns ELSE '' END
                            || CASE WHEN customer_columns IS NOT NULL AND customer_columns <> '' THEN ', ' || customer_columns ELSE '' END
                            || CASE WHEN time_column IS NOT NULL AND time_column <> '' THEN ', a.' || time_column ELSE '' END
                            || ', a.date, total, ';

    offer_query_final_select_groupby := total_final_select_groupby_int
                      || CASE WHEN product_columns IS NOT NULL AND product_columns <> '' THEN ', ' || product_columns ELSE '' END
                      || CASE WHEN store_columns IS NOT NULL AND store_columns <> '' THEN ', ' || store_columns ELSE '' END
                      || CASE WHEN customer_columns IS NOT NULL AND customer_columns <> '' THEN ', ' || customer_columns ELSE '' END
                      || CASE WHEN time_column_2 IS NOT NULL AND time_column_2 <> '' THEN ', ' || time_column_2 ELSE '' END
                      || ', total, ';

	offer_query_final_select_groupby_imputed := total_final_select_groupby_int_imputed
                      || CASE WHEN product_columns IS NOT NULL AND product_columns <> '' THEN ', ' || product_columns_imputed ELSE '' END
                      || CASE WHEN store_columns IS NOT NULL AND store_columns <> '' THEN ', ' || store_columns_imputed ELSE '' END
                      || CASE WHEN customer_columns IS NOT NULL AND customer_columns <> '' THEN ', ' || customer_columns_imputed ELSE '' END
                      || CASE WHEN time_column_2 IS NOT NULL AND time_column_2 <> '' THEN ', ' || time_column_2 ELSE '' END
                      || ', total, ';

    total_query_initial_select := total_query_initial_select_int
                            || CASE WHEN product_columns_as_null IS NOT NULL AND product_columns_as_null <> '' THEN ', ' || product_columns_as_null ELSE '' END
                            || CASE WHEN store_columns_as_null IS NOT NULL AND store_columns_as_null <> '' THEN ', ' || store_columns_as_null ELSE '' END
                            || CASE WHEN customer_columns_as_null IS NOT NULL AND customer_columns_as_null <> '' THEN ', ' || customer_columns_as_null ELSE '' END
                            || CASE WHEN time_column IS NOT NULL AND time_column <> '' THEN ', null::date as ' || time_column ELSE '' END
                            || ', a.date, 1 as total,';
    
    total_query_initial_groupby := total_final_select_groupby_int
                            || CASE WHEN product_columns IS NOT NULL AND product_columns <> '' THEN ', ' || product_columns ELSE '' END
                            || CASE WHEN store_columns IS NOT NULL AND store_columns <> '' THEN ', ' || store_columns ELSE '' END
                            || CASE WHEN customer_columns IS NOT NULL AND customer_columns <> '' THEN ', ' || customer_columns ELSE '' END
                            || CASE WHEN time_column IS NOT NULL AND time_column <> '' THEN ', ' || time_column ELSE '' END
                            || ', a.date, total, ';
    
    total_query_final_select := total_final_select_groupby_int_imputed
                      || CASE WHEN product_columns IS NOT NULL AND product_columns <> '' THEN ', ' || product_columns_imputed ELSE '' END
                      || CASE WHEN store_columns IS NOT NULL AND store_columns <> '' THEN ', ' || store_columns_imputed ELSE '' END
                      || CASE WHEN customer_columns IS NOT NULL AND customer_columns <> '' THEN ', ' || customer_columns_imputed ELSE '' END
                      || CASE WHEN time_column_2 IS NOT NULL AND time_column_2 <> '' THEN ', null::date as ' || time_column_2 ELSE '' END
                      || ', total,';

    total_query_final_groupby := total_final_select_groupby_int
                      || CASE WHEN product_columns IS NOT NULL AND product_columns <> '' THEN ', ' || product_columns ELSE '' END
                      || CASE WHEN store_columns IS NOT NULL AND store_columns <> '' THEN ', ' || store_columns ELSE '' END
                      || CASE WHEN customer_columns IS NOT NULL AND customer_columns <> '' THEN ', ' || customer_columns ELSE '' END
                      || ', total, ';
   
    final_query_orderby := final_orderby_int
                         || CASE WHEN time_column_2 IS NOT NULL AND time_column_2 <> '' THEN ', ' || time_column_2 ELSE '' end
                         || CASE WHEN product_columns IS NOT NULL AND product_columns <> '' THEN ', ' || product_columns ELSE '' end
                         || CASE WHEN store_columns IS NOT NULL AND store_columns <> '' THEN ', ' || store_columns ELSE '' END
                         || CASE WHEN customer_columns IS NOT NULL AND customer_columns <> '' THEN ', ' || customer_columns ELSE '' END;
    
    json_select := json_select_int 
                    || CASE WHEN json_product_columns IS NOT NULL AND json_product_columns <> '' THEN ' ' || json_product_columns ELSE '' END
                    || CASE WHEN json_store_columns IS NOT NULL AND json_store_columns <> '' THEN ' ' || json_store_columns ELSE '' END
                    || CASE WHEN json_customer_columns IS NOT NULL AND json_customer_columns <> '' THEN ' ' || json_customer_columns ELSE '' END
                    || CASE WHEN time_hierarchy_level = 1 then '''Week Start Date'', week_start_date, ' when time_hierarchy_level = 0 then ' ''Date'', date, ' else '' end;
   
    -- Remove any trailing commas from the final string
    offer_query_select := LTRIM(RTRIM(offer_query_select, ', '), ', ');
    offer_query_groupby := LTRIM(RTRIM(offer_query_groupby, ', '), ', ');
    offer_query_final_select_groupby := LTRIM(RTRIM(offer_query_final_select_groupby, ', '), ', ');
	offer_query_final_select_groupby_imputed := LTRIM(RTRIM(offer_query_final_select_groupby_imputed, ', '), ', ');
    total_query_initial_select := LTRIM(RTRIM(total_query_initial_select, ', '), ', ');
    total_query_initial_groupby := LTRIM(RTRIM(total_query_initial_groupby, ', '), ', ');
    total_query_final_select := LTRIM(RTRIM(total_query_final_select, ', '), ', ');
    total_query_final_groupby := LTRIM(RTRIM(total_query_final_groupby, ', '), ', ');
    final_query_orderby := 'ORDER BY ' || RTRIM(LTRIM(final_query_orderby, ' ,'), ', ');
    

    raise notice 'offer_query_select: %', offer_query_select;
    raise notice 'offer_query_groupby: %', offer_query_groupby;
    raise notice 'offer_query_final_select_groupby: %', offer_query_final_select_groupby;
	raise notice 'offer_query_final_select_groupby_imputed: %', offer_query_final_select_groupby_imputed;
    raise notice 'total_query_initial_select: %', total_query_initial_select;
    raise notice 'total_query_initial_groupby: %', total_query_initial_groupby;
    raise notice 'total_query_final_select: %', total_query_final_select;
    raise notice 'total_query_final_groupby: %', total_query_final_groupby;
    raise notice 'final_query_orderby: %', final_query_orderby;
    raise notice 'json_select of columns are : %', json_select;
    raise notice 'json_select_total of columns are : %', json_select_total;


    temp_string_where_condition := '';
    -- Update the where condition with product filters
    FOR _key IN SELECT * FROM jsonb_object_keys(_product_filters) LOOP

        _value := (SELECT array_agg(val::INTEGER)
                  FROM jsonb_array_elements(_product_filters -> _key) val);


        IF array_length(_value, 1) > 0 THEN
	        _column_name := _product_hierarchy_config -> _key ->> 'id_column';

	        IF _column_name IS NOT NULL THEN
	            temp_string_where_condition := temp_string_where_condition ||
	                ' AND b.' || quote_ident(_column_name) ||
	                ' IN (' || array_to_string(_value, ', ') || ')';
	        ELSE
	             RAISE WARNING '[PRODUCT FILTER] Key "%" not found in product_hierarchy_levels or lacks an "id_column".', _key;
	        END IF;
		END IF;

    END LOOP;

    -- Update the where condition with stores
    FOR _key IN SELECT * FROM jsonb_object_keys(_store_filters) LOOP

        _value := (SELECT array_agg(val::INTEGER)
                  FROM jsonb_array_elements(_store_filters -> _key) val);


        IF array_length(_value, 1) > 0 THEN
        	_column_name := _store_hierarchy_config -> _key ->> 'id_column';

			IF _column_name IS NOT NULL THEN
                temp_string_where_condition := temp_string_where_condition ||
                    ' AND a.' || quote_ident(_column_name) ||
                    ' IN (' || array_to_string(_value, ', ') || ')';
        	ELSE
           		  RAISE WARNING '[STORE FILTER] Key "%" not found in store_hierarchy_levels or lacks an "id_column".', _key;
        	END IF;
		END IF;
    END LOOP;

    -- Update the where condition with customer filters
    FOR _key IN SELECT * FROM jsonb_object_keys(_customer_filters) LOOP

        _value := (SELECT array_agg(val::INTEGER)
                  FROM jsonb_array_elements(_customer_filters -> _key) val);


        IF array_length(_value, 1) > 0 THEN
	        _column_name := _customer_hierarchy_config -> _key ->> 'id_column';

	        IF _column_name IS NOT NULL THEN
	            temp_string_where_condition := temp_string_where_condition ||
	                ' AND cm.' || quote_ident(_column_name) ||
	                ' IN (' || array_to_string(_value, ', ') || ')';
	        ELSE
	             RAISE WARNING '[CUSTOMER FILTER] Key "%" not found in customer_hierarchy_levels or lacks an "id_column".', _key;
	        END IF;
		END IF;

    END LOOP;   
    raise notice 'Hierarchy Filter where condition: %', temp_string_where_condition;
    raise notice 'Offer : promo_ids_where: %', promo_ids_where;
    raise notice 'Offer : event_ids_where: %', event_ids_where;
    raise notice 'Total : total_promo_ids_where: %', total_promo_ids_where;
    raise notice 'Total : total_event_ids_where: %', total_event_ids_where;
    
	-- Get the target currency ID directly into a variable
    _currency_query := format('SELECT price_promo.fn_get_target_currency_id(ARRAY[1],%L)', 
        _target_currency_id
    );
    
    raise notice 'Target Currency Query: %', _currency_query;
    EXECUTE _currency_query INTO _target_currency_id;
    raise notice 'Target Currency ID: %', _target_currency_id;


    offer_level_query := '
        with date_level_agg AS (
        SELECT 
            ' || offer_query_select || ',
            MAX(a.date) OVER (PARTITION BY a.product_id' || COALESCE(', a.' || time_column_2, '') || ') AS max_date,
            SUM(coalesce(a.actual_inventory,0)) AS actual_inventory,
            SUM(coalesce(a.actual_revenue ,0)) AS actual_revenue, 
            SUM(coalesce(a.finalized_revenue  ,0)) AS finalized_revenue, 
            SUM(coalesce(a.baseline_revenue  ,0)) AS baseline_revenue, 
            SUM(coalesce(a.ly_revenue  ,0)) AS ly_revenue, 
            SUM(coalesce(a.lw_revenue  ,0)) AS lw_revenue, 
            SUM(coalesce(a.actual_item_plan_revenue ,0)) AS actual_item_plan_revenue,

            SUM(coalesce(a.actual_sales_units,0)) AS actual_units,
            SUM(coalesce(a.finalized_sales_units,0)) AS finalized_units,
            SUM(coalesce(a.baseline_sales_units,0)) AS baseline_units,
            SUM(coalesce(a.ly_sales_units,0)) AS ly_units,
            SUM(coalesce(a.lw_sales_units,0)) AS lw_units,
            SUM(coalesce(a.actual_item_plan_unit,0)) AS actual_item_plan_units, 

            SUM(coalesce(a.actual_margin ,0)) AS actual_margin,
            SUM(coalesce(a.finalized_margin  ,0)) AS finalized_margin,
            SUM(coalesce(a.baseline_margin  ,0)) AS baseline_margin,
            SUM(coalesce(a.ly_margin  ,0)) AS ly_margin,
            SUM(coalesce(a.lw_margin  ,0)) AS lw_margin,
            SUM(coalesce(a.actual_item_plan_margin ,0)) AS actual_item_plan_margin,

            SUM(coalesce(a.actual_contribution_margin ,0)) as actual_contribution_margin,
            SUM(coalesce(a.finalized_contribution_margin  ,0)) as finalized_contribution_margin,
            SUM(coalesce(a.actual_contribution_revenue ,0)) as actual_contribution_revenue,
            SUM(coalesce(a.finalized_contribution_revenue  ,0)) as finalized_contribution_revenue,
            SUM(coalesce(a.lw_contribution_margin  ,0)) as lw_contribution_margin,
            SUM(coalesce(a.lw_contribution_revenue  ,0)) as lw_contribution_revenue,
            SUM(coalesce(a.ly_contribution_margin  ,0)) as ly_contribution_margin,
            SUM(coalesce(a.ly_contribution_revenue  ,0)) as ly_contribution_revenue,
			
			--- Adding spend and discount columns ----
            SUM(coalesce(a.finalized_spend  ,0)) AS finalized_spend,
--            SUM(coalesce(a.actual_spend ,0)) AS actual_spend,
--            SUM(coalesce(a.finalized_promo_spend  ,0)) AS finalized_promo_spend,
--            SUM(coalesce(a.actual_promo_spend ,0)) AS actual_promo_spend,
--            SUM(coalesce(a.finalized_coupon_amount  ,0)) AS finalized_coupon_amount,
--            SUM(coalesce(a.actual_coupon_amount ,0)) AS actual_coupon_amount, 
            SUM(coalesce(a.actual_sales_units * a.actual_discount,0)) as actual_weighted_discount
--            SUM(coalesce(a.ly_coupon_amount ,0)) AS ly_coupon_amount,       
--			SUM(coalesce(a.lw_coupon_amount ,0)) AS lw_coupon_amount 
			

        FROM ' || offer_query_table_name || ' a 
        INNER JOIN price_promo.product_master b ON a.product_id = b.product_id 
        INNER JOIN global.customer_master cm ON a.customer_id = cm.customer_id

        ' || join_conditions || '
        WHERE a.date BETWEEN ' || quote_literal(_start_date) || ' AND ' || quote_literal(_end_date) ||
        temp_string_where_condition || promo_ids_where || event_ids_where || '
        GROUP BY ' || offer_query_groupby || '
    )

    SELECT 
        ' || offer_query_final_select_groupby || ',
        ' || _target_currency_id || ' as target_currency_id,
        SUM(case when date=max_date then actual_inventory else 0 end) as actual_inventory,
        100 * SUM(actual_units) / 
        NULLIF(
            (SUM(CASE WHEN date = max_date THEN actual_inventory ELSE 0 END) + SUM(actual_units)), 
            0
        ) AS actual_st,
        --------------------Revenue------------------
        SUM(actual_revenue) AS actual_revenue, 
        SUM(finalized_revenue) AS finalized_revenue, 
        CASE 
            WHEN SUM(finalized_revenue) = 0 THEN NULL
            ELSE 100 * (SUM(actual_revenue) - SUM(finalized_revenue)) / SUM(finalized_revenue)
        END AS var_finalized_revenue,

        SUM(ly_revenue) AS ly_revenue,
        CASE 
            WHEN SUM(ly_revenue) = 0 THEN NULL
            ELSE 100 * (SUM(actual_revenue) - SUM(ly_revenue)) / SUM(ly_revenue)
        END AS var_ly_revenue,

        SUM(lw_revenue) AS lw_revenue,
        CASE 
            WHEN SUM(lw_revenue) = 0 THEN NULL
            ELSE 100 * (SUM(actual_revenue) - SUM(lw_revenue)) / SUM(lw_revenue)
        END AS var_lw_revenue,

        SUM(actual_item_plan_revenue) AS actual_item_plan_revenue,
        CASE 
            WHEN SUM(actual_item_plan_revenue) = 0 THEN NULL
            ELSE 100 * (SUM(actual_revenue) - SUM(actual_item_plan_revenue)) / SUM(actual_item_plan_revenue)
        END AS var_actual_item_plan_revenue,

        --------------------Units-------------------
        SUM(actual_units) AS actual_units,
        SUM(finalized_units) AS finalized_units,
        CASE 
            WHEN SUM(finalized_units) = 0 THEN NULL
            ELSE 100 * (SUM(actual_units) - SUM(finalized_units)) / SUM(finalized_units)
        END AS var_finalized_units,

        SUM(ly_units) AS ly_units,
        CASE 
            WHEN SUM(ly_units) = 0 THEN NULL
            ELSE 100 * (SUM(actual_units) - SUM(ly_units)) / SUM(ly_units)
        END AS var_ly_units,

        SUM(lw_units) AS lw_units,
        CASE 
            WHEN SUM(lw_units) = 0 THEN NULL
            ELSE 100 * (SUM(actual_units) - SUM(lw_units)) / SUM(lw_units)
        END AS var_lw_units,

        SUM(actual_item_plan_units) AS actual_item_plan_units,
        CASE 
            WHEN SUM(actual_item_plan_units) = 0 THEN NULL
            ELSE 100 * (SUM(actual_units) - SUM(actual_item_plan_units)) / SUM(actual_item_plan_units)
        END AS var_actual_item_plan_units,

        --------------------Margin-------------------
        SUM(actual_margin) AS actual_margin,
        SUM(finalized_margin) AS finalized_margin,

        CASE 
            WHEN SUM(finalized_margin) = 0 THEN NULL
            ELSE 100 * (SUM(actual_margin) - SUM(finalized_margin)) / SUM(finalized_margin)
        END AS var_finalized_margin,
        		CASE 
		    WHEN SUM(baseline_margin) IS NULL OR SUM(baseline_margin) = 0 THEN NULL 
		    ELSE ROUND(((SUM(actual_margin) - SUM(baseline_margin)) / ABS(SUM(baseline_margin)))::NUMERIC * 100, 2) 
		END AS actual_performance,
		    
		CASE 
		    WHEN SUM(baseline_margin) IS NULL OR SUM(baseline_margin) = 0 THEN NULL 
		    ELSE ROUND(((SUM(finalized_margin) - SUM(baseline_margin)) / ABS(SUM(baseline_margin)))::NUMERIC * 100, 2) 
		END AS finalized_performance,

        SUM(ly_margin) AS ly_margin,
        CASE 
            WHEN SUM(ly_margin) = 0 THEN NULL
            ELSE 100 * (SUM(actual_margin) - SUM(ly_margin)) / SUM(ly_margin)
        END AS var_ly_margin,

        SUM(lw_margin) AS lw_margin,
        CASE 
            WHEN SUM(lw_margin) = 0 THEN NULL
            ELSE 100 * (SUM(actual_margin) - SUM(lw_margin)) / SUM(lw_margin)
        END AS var_lw_margin,

        SUM(actual_item_plan_margin) AS actual_item_plan_margin,
        CASE 
            WHEN SUM(actual_item_plan_margin) = 0 THEN NULL
            ELSE 100 * (SUM(actual_margin) - SUM(actual_item_plan_margin)) / SUM(actual_item_plan_margin)
        END AS var_actual_item_plan_margin,

        --------------------GM%-------------------
        CASE 
            WHEN SUM(actual_revenue) = 0 THEN NULL
            ELSE 100 * SUM(actual_margin) / SUM(actual_revenue)
        END AS actual_gm_percent,

        CASE 
            WHEN SUM(finalized_revenue) = 0 THEN NULL
            ELSE 100 * SUM(finalized_margin) / SUM(finalized_revenue)
        END AS finalized_gm_percent,
        CASE 
        WHEN SUM(actual_revenue) = 0 OR SUM(finalized_revenue) = 0 THEN NULL
        ELSE 10000 * (
            (100 * SUM(actual_margin) / SUM(actual_revenue)) 
            - 
            (100 * SUM(finalized_margin) / SUM(finalized_revenue))
        )
        END AS var_finalized_gm_percent,

        CASE 
            WHEN SUM(ly_revenue) = 0 THEN NULL
            ELSE 100 * SUM(ly_margin) / SUM(ly_revenue)
        END AS ly_gm_percent,
        CASE 
        WHEN SUM(actual_revenue) = 0 OR SUM(ly_revenue) = 0 THEN NULL
        ELSE 10000 * (
            (100 * SUM(actual_margin) / SUM(actual_revenue)) 
            - 
            (100 * SUM(ly_margin) / SUM(ly_revenue))
        )
        END AS var_ly_gm_percent,

        CASE 
            WHEN SUM(lw_revenue) = 0 THEN NULL
            ELSE 100 * SUM(lw_margin) / SUM(lw_revenue)
        END AS lw_gm_percent,
        CASE 
        WHEN SUM(actual_revenue) = 0 OR SUM(lw_revenue) = 0 THEN NULL
        ELSE 10000 * (
            (100 * SUM(actual_margin) / SUM(actual_revenue)) 
            - 
            (100 * SUM(lw_margin) / SUM(lw_revenue))
        )
        END AS var_lw_gm_percent,

        CASE 
            WHEN SUM(actual_item_plan_margin) = 0 THEN NULL
            ELSE 100 * SUM(actual_item_plan_margin) / SUM(actual_item_plan_revenue)
        END AS actual_item_plan_gm_percent,
        CASE 
        WHEN SUM(actual_revenue) = 0 OR SUM(actual_item_plan_revenue) = 0 THEN NULL
        ELSE 10000 * (
            (100 * SUM(actual_margin) / SUM(actual_revenue)) 
            - 
            (100 * SUM(actual_item_plan_margin) / SUM(actual_item_plan_revenue))
        )
        END AS var_actual_item_plan_gm_percent,

        --------------------Contribution Margin-------------------
        SUM(actual_contribution_margin) AS actual_contribution_margin,
        SUM(finalized_contribution_margin) AS finalized_contribution_margin,
        CASE 
            WHEN SUM(finalized_contribution_margin) = 0 THEN NULL
            ELSE 100 * (SUM(actual_contribution_margin) - SUM(finalized_contribution_margin)) / SUM(finalized_contribution_margin)
        END AS var_finalized_contribution_margin,
        
        SUM(ly_contribution_margin) AS ly_contribution_margin,
        CASE 
            WHEN SUM(ly_contribution_margin) = 0 THEN NULL
            ELSE 100 * (SUM(actual_contribution_margin) - SUM(ly_contribution_margin)) / SUM(ly_contribution_margin)
        END AS var_ly_contribution_margin,
        
        SUM(lw_contribution_margin) AS lw_contribution_margin,
        CASE 
            WHEN SUM(lw_contribution_margin) = 0 THEN NULL
            ELSE 100 * (SUM(actual_contribution_margin) - SUM(lw_contribution_margin)) / SUM(lw_contribution_margin)
        END AS var_lw_contribution_margin,

        --------------------CM%-------------------
        CASE 
            WHEN SUM(actual_contribution_revenue) = 0 THEN NULL
            ELSE 100 * SUM(actual_contribution_margin) / SUM(actual_contribution_revenue)
        END AS actual_cm_percent,
        
        CASE 
            WHEN SUM(finalized_contribution_revenue) = 0 THEN NULL
            ELSE 100 * SUM(finalized_contribution_margin) / SUM(finalized_contribution_revenue)
        END AS finalized_cm_percent,
        
        CASE 
        WHEN SUM(actual_contribution_revenue) = 0 OR SUM(finalized_contribution_revenue) = 0 THEN NULL
        ELSE 10000 * (
            (100 * SUM(actual_contribution_margin) / SUM(actual_contribution_revenue)) 
            - 
            (100 * SUM(finalized_contribution_margin) / SUM(finalized_contribution_revenue))
        )
        END AS var_finalized_cm_percent,
        
        CASE 
            WHEN SUM(ly_contribution_revenue) = 0 THEN NULL
            ELSE 100 * SUM(ly_contribution_margin) / SUM(ly_contribution_revenue)
        END AS ly_cm_percent,
        CASE 
        WHEN SUM(actual_contribution_revenue) = 0 OR SUM(ly_contribution_revenue) = 0 THEN NULL
        ELSE 10000 * (
            (100 * SUM(actual_contribution_margin) / SUM(actual_contribution_revenue)) 
            - 
            (100 * SUM(ly_contribution_margin) / SUM(ly_contribution_revenue))
        )
        END AS var_ly_cm_percent,
        
        CASE 
            WHEN SUM(lw_contribution_revenue) = 0 THEN NULL
            ELSE 100 * SUM(lw_contribution_margin) / SUM(lw_contribution_revenue)
        END AS lw_cm_percent,
        CASE 
        WHEN SUM(actual_contribution_revenue) = 0 OR SUM(lw_contribution_revenue) = 0 THEN NULL
        ELSE 10000 * (
            (100 * SUM(actual_contribution_margin) / SUM(actual_contribution_revenue)) 
            - 
            (100 * SUM(lw_contribution_margin) / SUM(lw_contribution_revenue))
        )
        END AS var_lw_cm_percent,


        --------------------ASP-------------------
		CASE WHEN SUM(actual_units) = 0 THEN NULL ELSE SUM(actual_revenue) / SUM(actual_units) END AS actual_asp,
		
        CASE WHEN SUM(finalized_units) = 0 THEN NULL ELSE SUM(finalized_revenue) / SUM(finalized_units) END AS finalized_asp,
		CASE
		WHEN SUM(actual_units) = 0 OR SUM(finalized_units) = 0 OR SUM(finalized_revenue) = 0 THEN NULL
		ELSE 100 * ((SUM(actual_revenue) / SUM(actual_units)) / (SUM(finalized_revenue) / SUM(finalized_units)) - 1)
		END AS var_finalized_asp,
		
		CASE WHEN SUM(ly_units) = 0 THEN NULL ELSE SUM(ly_revenue) / SUM(ly_units) END AS ly_asp,
		CASE
		WHEN SUM(actual_units) = 0 OR SUM(ly_units) = 0 OR SUM(ly_revenue) = 0 THEN NULL
		ELSE 100 * ((SUM(actual_revenue) / SUM(actual_units)) / (SUM(ly_revenue) / SUM(ly_units)) - 1)
		END AS var_ly_asp,
		
		CASE WHEN SUM(lw_units) = 0 THEN NULL ELSE SUM(lw_revenue) / SUM(lw_units) END AS lw_asp,
		CASE
		WHEN SUM(actual_units) = 0 OR SUM(lw_units) = 0 OR SUM(lw_revenue) = 0 THEN NULL
		ELSE 100 * ((SUM(actual_revenue) / SUM(actual_units)) / (SUM(lw_revenue) / SUM(lw_units)) - 1)
		END AS var_lw_asp,

		CASE WHEN SUM(actual_item_plan_units) = 0 THEN NULL ELSE SUM(actual_item_plan_revenue) / SUM(actual_item_plan_units) END AS plan_asp,
		CASE
		WHEN SUM(actual_units) = 0 OR SUM(actual_item_plan_units) = 0 OR SUM(actual_item_plan_revenue) = 0 THEN NULL
		ELSE 100 * ((SUM(actual_revenue) / SUM(actual_units)) / (SUM(actual_item_plan_revenue) / SUM(actual_item_plan_units)) - 1)
		END AS var_plan_asp,
        
        
		---------------AUM---------------
		CASE WHEN SUM(actual_units) = 0 THEN NULL ELSE SUM(actual_margin) / SUM(actual_units) END AS actual_aum,

		CASE WHEN SUM(finalized_units) = 0 THEN NULL ELSE SUM(finalized_margin) / SUM(finalized_units) END AS finalized_aum,
		CASE
		WHEN SUM(actual_units) = 0 OR SUM(finalized_units) = 0 OR SUM(finalized_margin) = 0 THEN NULL
		ELSE 100 * ((SUM(actual_margin) / SUM(actual_units)) / (SUM(finalized_margin) / SUM(finalized_units)) - 1)
		END AS var_finalized_aum,
        
		CASE WHEN SUM(ly_units) = 0 THEN NULL ELSE SUM(ly_margin) / SUM(ly_units) END AS ly_aum,
		CASE
		WHEN SUM(actual_units) = 0 OR SUM(ly_units) = 0 OR SUM(ly_margin) = 0 THEN NULL
		ELSE 100 * ((SUM(actual_margin) / SUM(actual_units)) / (SUM(ly_margin) / SUM(ly_units)) - 1)
		END AS var_ly_aum,
        
		CASE WHEN SUM(lw_units) = 0 THEN NULL ELSE SUM(lw_margin) / SUM(lw_units) END AS lw_aum,
		CASE
		WHEN SUM(actual_units) = 0 OR SUM(lw_units) = 0 OR SUM(lw_margin) = 0 THEN NULL
		ELSE 100 * ((SUM(actual_margin) / SUM(actual_units)) / (SUM(lw_margin) / SUM(lw_units)) - 1)
		END AS var_lw_aum,

		CASE WHEN SUM(actual_item_plan_units) = 0 THEN NULL ELSE SUM(actual_item_plan_margin) / SUM(actual_item_plan_units) END AS plan_aum,
		CASE
		WHEN SUM(actual_units) = 0 OR SUM(actual_item_plan_units) = 0 OR SUM(actual_item_plan_margin) = 0 THEN NULL
		ELSE 100 * ((SUM(actual_margin) / SUM(actual_units)) / (SUM(actual_item_plan_margin) / SUM(actual_item_plan_units)) - 1)
		END AS var_plan_aum,
		
		------------ Incremental Columns --------------------
        SUM(actual_revenue) - SUM(baseline_revenue) AS actual_incremental_revenue,
		SUM(finalized_revenue) - SUM(baseline_revenue) AS finalized_incremental_revenue,
		SUM(actual_units) - SUM(baseline_units) AS actual_incremental_units,
		SUM(finalized_units) - SUM(baseline_units) AS finalized_incremental_units,
		SUM(actual_margin) - SUM(baseline_margin) AS actual_incremental_margin,
		SUM(finalized_margin) - SUM(baseline_margin) AS finalized_incremental_margin, 

		--- Spend and discount columns ----
        SUM(finalized_spend) AS finalized_spend,
--        SUM(actual_spend) AS actual_spend,
--        SUM(finalized_promo_spend) AS finalized_promo_spend,
--        SUM(actual_promo_spend) AS actual_promo_spend,
--        SUM(finalized_coupon_amount) AS finalized_coupon_amount,
--        SUM(actual_coupon_amount) AS actual_coupon_amount,
        CASE 
            WHEN SUM(actual_units) = 0 THEN NULL
            ELSE sum(actual_weighted_discount) / sum(actual_units)
        END AS actual_discount
--        SUM(ly_coupon_amount) AS ly_coupon_amount,       
--        SUM(lw_coupon_amount) AS lw_coupon_amount 

    FROM date_level_agg 
    GROUP BY ' || offer_query_final_select_groupby || '' ;
--raise notice 'offer_level_query : %', offer_level_query;
   


    total_fetch_query := '
        with date_level_agg AS (
        SELECT 
            ' || total_query_initial_select || ',
            MAX(a.date) OVER (PARTITION BY a.product_id) AS max_date,
            SUM(coalesce(a.actual_inventory,0)) AS actual_inventory,

            SUM(coalesce(a.actual_revenue ,0)) AS actual_revenue, 
            SUM(coalesce(a.finalized_revenue  ,0)) AS finalized_revenue, 
            SUM(coalesce(a.baseline_revenue  ,0)) AS baseline_revenue, 
            SUM(coalesce(a.ly_revenue  ,0)) AS ly_revenue, 
            SUM(coalesce(a.lw_revenue  ,0)) AS lw_revenue, 
            SUM(coalesce(a.actual_item_plan_revenue ,0)) AS actual_item_plan_revenue,

            SUM(coalesce(a.actual_sales_units,0)) AS actual_units,
            SUM(coalesce(a.finalized_sales_units,0)) AS finalized_units,
            SUM(coalesce(a.baseline_sales_units,0)) AS baseline_units,
            SUM(coalesce(a.ly_sales_units,0)) AS ly_units,
            SUM(coalesce(a.lw_sales_units,0)) AS lw_units,
            SUM(coalesce(a.actual_item_plan_unit,0)) AS actual_item_plan_units,
            
            SUM(coalesce(a.actual_margin,0)) AS actual_margin,
            SUM(coalesce(a.finalized_margin,0)) AS finalized_margin,
            SUM(coalesce(a.baseline_margin  ,0)) AS baseline_margin,
            SUM(coalesce(a.ly_margin  ,0)) AS ly_margin,
            SUM(coalesce(a.lw_margin  ,0)) AS lw_margin,
            SUM(coalesce(a.actual_item_plan_margin ,0)) AS actual_item_plan_margin,

            SUM(coalesce(a.actual_contribution_margin ,0)) as actual_contribution_margin,
            SUM(coalesce(a.finalized_contribution_margin  ,0)) as finalized_contribution_margin,
            SUM(coalesce(a.actual_contribution_revenue ,0)) as actual_contribution_revenue,
            SUM(coalesce(a.finalized_contribution_revenue  ,0)) as finalized_contribution_revenue,
            SUM(coalesce(a.lw_contribution_margin  ,0)) as lw_contribution_margin,
            SUM(coalesce(a.lw_contribution_revenue  ,0)) as lw_contribution_revenue,
            SUM(coalesce(a.ly_contribution_margin  ,0)) as ly_contribution_margin,
            SUM(coalesce(a.ly_contribution_revenue  ,0)) as ly_contribution_revenue,
            --- Adding spend and discount columns ----
            SUM(coalesce(a.finalized_spend  ,0)) AS finalized_spend,
--            SUM(coalesce(a.actual_spend ,0)) AS actual_spend,
--            SUM(coalesce(a.finalized_promo_spend  ,0)) AS finalized_promo_spend,
--            SUM(coalesce(a.actual_promo_spend ,0)) AS actual_promo_spend,
--            SUM(coalesce(a.finalized_coupon_amount  ,0)) AS finalized_coupon_amount,
--            SUM(coalesce(a.actual_coupon_amount ,0)) AS actual_coupon_amount, 
            SUM(coalesce(a.actual_sales_units * a.actual_discount,0)) as actual_weighted_discount
--            SUM(coalesce(a.ly_coupon_amount ,0)) AS ly_coupon_amount,       
--			SUM(coalesce(a.lw_coupon_amount ,0)) AS lw_coupon_amount 

        FROM price_promo.ps_reporting_post_hierarchy_date a 
        INNER JOIN price_promo.product_master b ON a.product_id = b.product_id 
        INNER JOIN global.customer_master cm ON a.customer_id = cm.customer_id

        WHERE a.date BETWEEN ' || quote_literal(_start_date) || ' AND ' || quote_literal(_end_date) ||
        temp_string_where_condition || total_promo_ids_where || total_event_ids_where || '
        GROUP BY a.product_id, ' || total_query_initial_groupby || '

    )

    SELECT 
        ' || total_query_final_select || ',
        ' || _target_currency_id || ' as target_currency_id,
        SUM(CASE WHEN date = max_date THEN actual_inventory ELSE 0 END) + SUM(actual_units) as actual_inventory,
        100 * SUM(actual_units) / 
        NULLIF(
            (SUM(CASE WHEN date = max_date THEN actual_inventory ELSE 0 END) + SUM(actual_units)), 
            0
        ) AS actual_st,
        --------------------Revenue------------------
        SUM(actual_revenue) AS actual_revenue, 
        SUM(finalized_revenue) AS finalized_revenue, 
        CASE 
            WHEN SUM(finalized_revenue) = 0 THEN NULL
            ELSE 100 * (SUM(actual_revenue) - SUM(finalized_revenue)) / SUM(finalized_revenue)
        END AS var_finalized_revenue,

        SUM(ly_revenue) AS ly_revenue,
        CASE 
            WHEN SUM(ly_revenue) = 0 THEN NULL
            ELSE 100 * (SUM(actual_revenue) - SUM(ly_revenue)) / SUM(ly_revenue)
        END AS var_ly_revenue,

        SUM(lw_revenue) AS lw_revenue,
        CASE 
            WHEN SUM(lw_revenue) = 0 THEN NULL
            ELSE 100 * (SUM(actual_revenue) - SUM(lw_revenue)) / SUM(lw_revenue)
        END AS var_lw_revenue,

        SUM(actual_item_plan_revenue) AS actual_item_plan_revenue,
        CASE 
            WHEN SUM(actual_item_plan_revenue) = 0 THEN NULL
            ELSE 100 * (SUM(actual_revenue) - SUM(actual_item_plan_revenue)) / SUM(actual_item_plan_revenue)
        END AS var_actual_item_plan_revenue,

        --------------------Units-------------------
        SUM(actual_units) AS actual_units,
        SUM(finalized_units) AS finalized_units,
        CASE 
            WHEN SUM(finalized_units) = 0 THEN NULL
            ELSE 100 * (SUM(actual_units) - SUM(finalized_units)) / SUM(finalized_units)
        END AS var_finalized_units,

        SUM(ly_units) AS ly_units,
        CASE 
            WHEN SUM(ly_units) = 0 THEN NULL
            ELSE 100 * (SUM(actual_units) - SUM(ly_units)) / SUM(ly_units)
        END AS var_ly_units,

        SUM(lw_units) AS lw_units,
        CASE 
            WHEN SUM(lw_units) = 0 THEN NULL
            ELSE 100 * (SUM(actual_units) - SUM(lw_units)) / SUM(lw_units)
        END AS var_lw_units,

        SUM(actual_item_plan_units) AS actual_item_plan_units,
        CASE 
            WHEN SUM(actual_item_plan_units) = 0 THEN NULL
            ELSE 100 * (SUM(actual_units) - SUM(actual_item_plan_units)) / SUM(actual_item_plan_units)
        END AS var_actual_item_plan_units,

        --------------------Margin-------------------
        SUM(actual_margin) AS actual_margin,
        SUM(finalized_margin) AS finalized_margin,

        CASE 
            WHEN SUM(finalized_margin) = 0 THEN NULL
            ELSE 100 * (SUM(actual_margin) - SUM(finalized_margin)) / SUM(finalized_margin)
        END AS var_finalized_margin,
        		CASE 
		    WHEN SUM(baseline_margin) IS NULL OR SUM(baseline_margin) = 0 THEN NULL 
		    ELSE ROUND(((SUM(actual_margin) - SUM(baseline_margin)) / ABS(SUM(baseline_margin)))::NUMERIC * 100, 2) 
		END AS actual_performance,
		    
		CASE 
		    WHEN SUM(baseline_margin) IS NULL OR SUM(baseline_margin) = 0 THEN NULL 
		    ELSE ROUND(((SUM(finalized_margin) - SUM(baseline_margin)) / ABS(SUM(baseline_margin)))::NUMERIC * 100, 2) 
		END AS finalized_performance,

        SUM(ly_margin) AS ly_margin,
        CASE 
            WHEN SUM(ly_margin) = 0 THEN NULL
            ELSE 100 * (SUM(actual_margin) - SUM(ly_margin)) / SUM(ly_margin)
        END AS var_ly_margin,

        SUM(lw_margin) AS lw_margin,
        CASE 
            WHEN SUM(lw_margin) = 0 THEN NULL
            ELSE 100 * (SUM(actual_margin) - SUM(lw_margin)) / SUM(lw_margin)
        END AS var_lw_margin,

        SUM(actual_item_plan_margin) AS actual_item_plan_margin,
        CASE 
            WHEN SUM(actual_item_plan_margin) = 0 THEN NULL
            ELSE 100 * (SUM(actual_margin) - SUM(actual_item_plan_margin)) / SUM(actual_item_plan_margin)
        END AS var_actual_item_plan_margin,

        --------------------GM%-------------------
        CASE 
            WHEN SUM(actual_revenue) = 0 THEN NULL
            ELSE 100 * SUM(actual_margin) / SUM(actual_revenue)
        END AS actual_gm_percent,

        CASE 
            WHEN SUM(finalized_revenue) = 0 THEN NULL
            ELSE 100 * SUM(finalized_margin) / SUM(finalized_revenue)
        END AS finalized_gm_percent,
        CASE 
        WHEN SUM(actual_revenue) = 0 OR SUM(finalized_revenue) = 0 THEN NULL
        ELSE 10000 * (
            (100 * SUM(actual_margin) / SUM(actual_revenue)) 
            - 
            (100 * SUM(finalized_margin) / SUM(finalized_revenue))
        )
        END AS var_finalized_gm_percent,

        CASE 
            WHEN SUM(ly_revenue) = 0 THEN NULL
            ELSE 100 * SUM(ly_margin) / SUM(ly_revenue)
        END AS ly_gm_percent,
        CASE 
        WHEN SUM(actual_revenue) = 0 OR SUM(ly_revenue) = 0 THEN NULL
        ELSE 10000 * (
            (100 * SUM(actual_margin) / SUM(actual_revenue)) 
            - 
            (100 * SUM(ly_margin) / SUM(ly_revenue))
        )
        END AS var_ly_gm_percent,

        CASE 
            WHEN SUM(lw_revenue) = 0 THEN NULL
            ELSE 100 * SUM(lw_margin) / SUM(lw_revenue)
        END AS lw_gm_percent,
        CASE 
        WHEN SUM(actual_revenue) = 0 OR SUM(lw_revenue) = 0 THEN NULL
        ELSE 10000 * (
            (100 * SUM(actual_margin) / SUM(actual_revenue)) 
            - 
            (100 * SUM(lw_margin) / SUM(lw_revenue))
        )
        END AS var_lw_gm_percent,

        CASE 
            WHEN SUM(actual_item_plan_margin) = 0 THEN NULL
            ELSE 100 * SUM(actual_item_plan_margin) / SUM(actual_item_plan_revenue)
        END AS actual_item_plan_gm_percent,
        CASE 
        WHEN SUM(actual_revenue) = 0 OR SUM(actual_item_plan_revenue) = 0 THEN NULL
        ELSE 10000 * (
            (100 * SUM(actual_margin) / SUM(actual_revenue)) 
            - 
            (100 * SUM(actual_item_plan_margin) / SUM(actual_item_plan_revenue))
        )
        END AS var_actual_item_plan_gm_percent,

        --------------------Contribution Margin-------------------
        SUM(actual_contribution_margin) AS actual_contribution_margin,
        SUM(finalized_contribution_margin) AS finalized_contribution_margin,
        CASE 
            WHEN SUM(finalized_contribution_margin) = 0 THEN NULL
            ELSE 100 * (SUM(actual_contribution_margin) - SUM(finalized_contribution_margin)) / SUM(finalized_contribution_margin)
        END AS var_finalized_contribution_margin,
        
        SUM(ly_contribution_margin) AS ly_contribution_margin,
        CASE 
            WHEN SUM(ly_contribution_margin) = 0 THEN NULL
            ELSE 100 * (SUM(actual_contribution_margin) - SUM(ly_contribution_margin)) / SUM(ly_contribution_margin)
        END AS var_ly_contribution_margin,
        
        SUM(lw_contribution_margin) AS lw_contribution_margin,
        CASE 
            WHEN SUM(lw_contribution_margin) = 0 THEN NULL
            ELSE 100 * (SUM(actual_contribution_margin) - SUM(lw_contribution_margin)) / SUM(lw_contribution_margin)
        END AS var_lw_contribution_margin,

        --------------------CM%-------------------
        CASE 
            WHEN SUM(actual_contribution_revenue) = 0 THEN NULL
            ELSE 100 * SUM(actual_contribution_margin) / SUM(actual_contribution_revenue)
        END AS actual_cm_percent,
        
        CASE 
            WHEN SUM(finalized_contribution_revenue) = 0 THEN NULL
            ELSE 100 * SUM(finalized_contribution_margin) / SUM(finalized_contribution_revenue)
        END AS finalized_cm_percent,
        
        CASE 
        WHEN SUM(actual_contribution_revenue) = 0 OR SUM(finalized_contribution_revenue) = 0 THEN NULL
        ELSE 10000 * (
            (100 * SUM(actual_contribution_margin) / SUM(actual_contribution_revenue)) 
            - 
            (100 * SUM(finalized_contribution_margin) / SUM(finalized_contribution_revenue))
        )
        END AS var_finalized_cm_percent,
        
        CASE 
            WHEN SUM(ly_contribution_revenue) = 0 THEN NULL
            ELSE 100 * SUM(ly_contribution_margin) / SUM(ly_contribution_revenue)
        END AS ly_cm_percent,
        CASE 
        WHEN SUM(actual_contribution_revenue) = 0 OR SUM(ly_contribution_revenue) = 0 THEN NULL
        ELSE 10000 * (
            (100 * SUM(actual_contribution_margin) / SUM(actual_contribution_revenue)) 
            - 
            (100 * SUM(ly_contribution_margin) / SUM(ly_contribution_revenue))
        )
        END AS var_ly_cm_percent,
        
        CASE 
            WHEN SUM(lw_contribution_revenue) = 0 THEN NULL
            ELSE 100 * SUM(lw_contribution_margin) / SUM(lw_contribution_revenue)
        END AS lw_cm_percent,
        CASE 
        WHEN SUM(actual_contribution_revenue) = 0 OR SUM(lw_contribution_revenue) = 0 THEN NULL
        ELSE 10000 * (
            (100 * SUM(actual_contribution_margin) / SUM(actual_contribution_revenue)) 
            - 
            (100 * SUM(lw_contribution_margin) / SUM(lw_contribution_revenue))
        )
        END AS var_lw_cm_percent,


        --------------------ASP-------------------
		CASE WHEN SUM(actual_units) = 0 THEN NULL ELSE SUM(actual_revenue) / SUM(actual_units) END AS actual_asp,
		
        CASE WHEN SUM(finalized_units) = 0 THEN NULL ELSE SUM(finalized_revenue) / SUM(finalized_units) END AS finalized_asp,
		CASE
		WHEN SUM(actual_units) = 0 OR SUM(finalized_units) = 0 OR SUM(finalized_revenue) = 0 THEN NULL
		ELSE 100 * ((SUM(actual_revenue) / SUM(actual_units)) / (SUM(finalized_revenue) / SUM(finalized_units)) - 1)
		END AS var_finalized_asp,
		
		CASE WHEN SUM(ly_units) = 0 THEN NULL ELSE SUM(ly_revenue) / SUM(ly_units) END AS ly_asp,
		CASE
		WHEN SUM(actual_units) = 0 OR SUM(ly_units) = 0 OR SUM(ly_revenue) = 0 THEN NULL
		ELSE 100 * ((SUM(actual_revenue) / SUM(actual_units)) / (SUM(ly_revenue) / SUM(ly_units)) - 1)
		END AS var_ly_asp,
		
		CASE WHEN SUM(lw_units) = 0 THEN NULL ELSE SUM(lw_revenue) / SUM(lw_units) END AS lw_asp,
		CASE
		WHEN SUM(actual_units) = 0 OR SUM(lw_units) = 0 OR SUM(lw_revenue) = 0 THEN NULL
		ELSE 100 * ((SUM(actual_revenue) / SUM(actual_units)) / (SUM(lw_revenue) / SUM(lw_units)) - 1)
		END AS var_lw_asp,

		CASE WHEN SUM(actual_item_plan_units) = 0 THEN NULL ELSE SUM(actual_item_plan_revenue) / SUM(actual_item_plan_units) END AS plan_asp,
		CASE
		WHEN SUM(actual_units) = 0 OR SUM(actual_item_plan_units) = 0 OR SUM(actual_item_plan_revenue) = 0 THEN NULL
		ELSE 100 * ((SUM(actual_revenue) / SUM(actual_units)) / (SUM(actual_item_plan_revenue) / SUM(actual_item_plan_units)) - 1)
		END AS var_plan_asp,
        
        
		---------------AUM---------------
		CASE WHEN SUM(actual_units) = 0 THEN NULL ELSE SUM(actual_margin) / SUM(actual_units) END AS actual_aum,

		CASE WHEN SUM(finalized_units) = 0 THEN NULL ELSE SUM(finalized_margin) / SUM(finalized_units) END AS finalized_aum,
		CASE
		WHEN SUM(actual_units) = 0 OR SUM(finalized_units) = 0 OR SUM(finalized_margin) = 0 THEN NULL
		ELSE 100 * ((SUM(actual_margin) / SUM(actual_units)) / (SUM(finalized_margin) / SUM(finalized_units)) - 1)
		END AS var_finalized_aum,
        
		CASE WHEN SUM(ly_units) = 0 THEN NULL ELSE SUM(ly_margin) / SUM(ly_units) END AS ly_aum,
		CASE
		WHEN SUM(actual_units) = 0 OR SUM(ly_units) = 0 OR SUM(ly_margin) = 0 THEN NULL
		ELSE 100 * ((SUM(actual_margin) / SUM(actual_units)) / (SUM(ly_margin) / SUM(ly_units)) - 1)
		END AS var_ly_aum,
        
		CASE WHEN SUM(lw_units) = 0 THEN NULL ELSE SUM(lw_margin) / SUM(lw_units) END AS lw_aum,
		CASE
		WHEN SUM(actual_units) = 0 OR SUM(lw_units) = 0 OR SUM(lw_margin) = 0 THEN NULL
		ELSE 100 * ((SUM(actual_margin) / SUM(actual_units)) / (SUM(lw_margin) / SUM(lw_units)) - 1)
		END AS var_lw_aum,

		CASE WHEN SUM(actual_item_plan_units) = 0 THEN NULL ELSE SUM(actual_item_plan_margin) / SUM(actual_item_plan_units) END AS plan_aum,
		CASE
		WHEN SUM(actual_units) = 0 OR SUM(actual_item_plan_units) = 0 OR SUM(actual_item_plan_margin) = 0 THEN NULL
		ELSE 100 * ((SUM(actual_margin) / SUM(actual_units)) / (SUM(actual_item_plan_margin) / SUM(actual_item_plan_units)) - 1)
		END AS var_plan_aum,
		
		------------ Incremental Columns --------------------
        SUM(actual_revenue) - SUM(baseline_revenue) AS actual_incremental_revenue,
		SUM(finalized_revenue) - SUM(baseline_revenue) AS finalized_incremental_revenue,
		SUM(actual_units) - SUM(baseline_units) AS actual_incremental_units,
		SUM(finalized_units) - SUM(baseline_units) AS finalized_incremental_units,
		SUM(actual_margin) - SUM(baseline_margin) AS actual_incremental_margin,
		SUM(finalized_margin) - SUM(baseline_margin) AS finalized_incremental_margin, 

		--- Spend and discount columns ----
        SUM(finalized_spend) AS finalized_spend,
--        SUM(actual_spend) AS actual_spend,
--        SUM(finalized_promo_spend) AS finalized_promo_spend,
--        SUM(actual_promo_spend) AS actual_promo_spend,
--        SUM(finalized_coupon_amount) AS finalized_coupon_amount,
--        SUM(actual_coupon_amount) AS actual_coupon_amount,
        CASE 
            WHEN SUM(actual_units) = 0 THEN NULL
            ELSE sum(actual_weighted_discount) / sum(actual_units)
        END AS actual_discount
--        SUM(ly_coupon_amount) AS ly_coupon_amount,       
--        SUM(lw_coupon_amount) AS lw_coupon_amount 

    FROM date_level_agg 
    GROUP BY ' || total_query_final_groupby || '' ;
    --raise notice 'total_fetch_query : %', total_fetch_query;
   
  
    final_query := ' WITH   offer_level_data_cte AS (
                            '|| offer_level_query || '
                            ),
                            total_data_cte AS (
                            '|| total_fetch_query || '
                            )
                            SELECT 
                                json_agg(
                                    json_build_object(
                                        ''Report Level'', (case when total = 0 then ''Deal Level'' else ''TOTAL'' end),
                                        ' || json_select || '
                                        
                                        ''Revenue'', json_build_object(
                                                                        ''Actual Revenue'', round( actual_revenue ),
                                                                        ''Forecasted Revenue'', round( finalized_revenue ),
                                                                        ''Var FC Revenue'', round( var_finalized_revenue ),
                                                                        ''Last Year Revenue'', round( ly_revenue ),
                                                                        ''Var LY Revenue'', round( var_ly_revenue ),
                                                                        ''Last Week Revenue'', round( lw_revenue ),
                                                                        ''Var LW Revenue'', round( var_lw_revenue ),
                                                                        ''Plan Revenue'', round(actual_item_plan_revenue),
																		''Var Plan Revenue'', round(var_actual_item_plan_revenue),
							                                            ''Actual Incremental Revenue'', round(actual_incremental_revenue),
							                                            ''Forecasted Incremental Revenue'', round(finalized_incremental_revenue)
                                                                    ),
                                        
                                        ''Units'', json_build_object(
                                                                        ''Actual Units'', round( actual_units ),
                                                                        ''Forecasted Units'', round( finalized_units ),
                                                                        ''Var FC Units'', round( var_finalized_units ),
                                                                        ''Last Year Units'', round( ly_units ),
                                                                        ''Var LY Units'', round( var_ly_units ),
                                                                        ''Last Week Units'', round( lw_units ),
                                                                        ''Var LW Units'', round( var_lw_units ),
                                                                        ''Plan Units'', round(actual_item_plan_units),
																		''Var Plan Units'', round(var_actual_item_plan_units),
							                                            ''Actual Incremental Units'', round(actual_incremental_units), 
							                                            ''Forecasted Incremental Units'', round(finalized_incremental_units) 
                                                                    ),
                                        
                                        ''GM $'', json_build_object(
                                                                        ''Actual GM $'', round( actual_margin ),
                                                                        ''Forecasted GM $'', round( finalized_margin ),
                                                                        ''Var FC GM $'', round( var_finalized_margin ),
                                                                        ''Last Year GM $'', round( ly_margin ),
                                                                        ''Var LY GM $'', round( var_ly_margin ),
                                                                        ''Last Week GM $'', round( lw_margin ),
                                                                        ''Var LW GM $'', round( var_lw_margin ),
                                                                        ''Plan GM $'', round(actual_item_plan_margin),
																		''Var Plan GM $'', round(var_actual_item_plan_margin),
							                                            ''Actual Incremental GM $'', round(actual_incremental_margin),
							                                            ''Forecasted Incremental GM $'', round(finalized_incremental_margin)
                                                                    ),
                                        
                                        ''GM %'', json_build_object(
                                                                        ''Actual GM %'', round( actual_gm_percent ),
                                                                        ''Forecasted GM %'', round( finalized_gm_percent ),
                                                                        ''Var FC GM %'', round( var_finalized_gm_percent ),
                                                                        ''Last Year GM %'', round( ly_gm_percent ),
                                                                        ''Var LY GM %'', round( var_ly_gm_percent ),
                                                                        ''Last Week GM %'', round( lw_gm_percent ),
                                                                        ''Var LW GM %'', round( var_lw_gm_percent ),
                                                                        ''Plan GM %'', round(actual_item_plan_gm_percent),
																		''Var Plan GM %'', round(var_actual_item_plan_gm_percent)
                                                                    ),


                                        ''CM $'', json_build_object(
                                                                        ''Actual CM $'', round( actual_contribution_margin ),
                                                                        ''Forecasted CM $'', round( finalized_contribution_margin ),
                                                                        ''Var FC CM $'', round( var_finalized_contribution_margin ),
                                                                        ''Last Year CM $'', round( ly_contribution_margin ),
                                                                        ''Var LY CM $'', round( var_ly_contribution_margin ),
                                                                        ''Last Week CM $'', round( lw_contribution_margin ),
                                                                        ''Var LW CM $'', round( var_lw_contribution_margin )
                                                                    ),
                                        
                                        ''CM %'', json_build_object(
                                                                        ''Actual CM %'', round( actual_cm_percent ),
                                                                        ''Forecasted CM %'', round( finalized_cm_percent ),
                                                                        ''Var FC CM %'', round( var_finalized_cm_percent ),
                                                                        ''Last Year CM %'', round( ly_cm_percent ),
                                                                        ''Var LY CM %'', round( var_ly_cm_percent ),
                                                                        ''Last Week CM %'', round( lw_cm_percent ),
                                                                        ''Var LW CM %'', round( var_lw_cm_percent )
                                                                    ),
                                        
                                        
                                        ''ASP'',  json_build_object(
                                                                        ''Actual ASP'', round(actual_asp::numeric, 2),
                                                                        ''Forecasted ASP'', round(finalized_asp::numeric, 2),
                                                                        ''Var FC ASP'', round(var_finalized_asp::numeric, 2), 
                                                                        ''Last Year ASP'', round(ly_asp::numeric, 2),
                                                                        ''Var LY ASP'', round(var_ly_asp::numeric, 2), 
                                                                        ''Last Week ASP'', round(lw_asp::numeric, 2),
                                                                        ''Var LW ASP'', round(var_lw_asp::numeric, 2),
                                                                        ''Plan ASP'', round(plan_asp::numeric, 2),
                                                                        ''Var Plan ASP'', round(var_plan_asp::numeric, 2)
                                                                    ),

                                        
                                        ''AUM'',  json_build_object(
                                                                        ''Actual AUM'', round(actual_aum::numeric, 2),
                                                                        ''Forecasted AUM'', round(finalized_aum::numeric, 2),
                                                                        ''Var FC AUM'', round(var_finalized_aum::numeric, 2), 
                                                                        ''Last Year AUM'', round(ly_aum::numeric, 2),
                                                                        ''Var LY AUM'', round(var_ly_aum::numeric, 2),
                                                                        ''Last Week AUM'', round(lw_aum::numeric, 2),
                                                                        ''Var LW AUM'', round(var_lw_aum::numeric, 2),
                                                                        ''Plan AUM'', round(plan_aum::numeric, 2),
                                                                        ''Var Plan AUM'', round(var_plan_aum::numeric, 2)
                                                                    ),
                                        
                                    ''Discount'', json_build_object(
                                                                        
                                                                     /* ''Actual Spend'', round(actual_spend),
																		''Actual Order Discount'', round(actual_coupon_amount)
                                                                        ''Forecasted Spend'', round(finalized_spend),
                                                                        ''Actual Promo Spend'', round(actual_promo_spend),
																		''Actual Order Discount'', round(actual_coupon_amount),
                                                                        ''Forecasted Promo Spend'', round(finalized_promo_spend),
                                                                        ''Forecasted Order Discount'', round(finalized_coupon_amount) */
                                                                        ''Actual Discount'', round( actual_discount ),
																		''Forecasted Spend'', round(finalized_spend)
                                                                    ),

										''Actual Performance'', CASE 
																    WHEN actual_performance IS NULL THEN NULL 
																    ELSE price_promo.fn_get_performance_repr(actual_performance) 
																END,

										''Forecasted Performance'', CASE 
																	    WHEN finalized_performance IS NULL THEN NULL 
																	    ELSE price_promo.fn_get_performance_repr(finalized_performance) 
																	END,

                                        ''Actual ST%'', round( actual_st ),
                                        ''Actual BOP Inventory'', round( actual_inventory )
                                        ' || json_select_total || '
                                    )
                                ) as result
                            FROM 
                                (
                                    select * from offer_level_data_cte
                                    union all
                                    select * from total_data_cte
                                    ' || final_query_orderby || '
                                ) dd
							inner join global.tb_currency_master tcm on dd.target_currency_id = tcm.currency_id
                        ';
    raise notice 'final_query : %', final_query;
   
    execute final_query into final_response;
    return final_response;
END;
$function$
;
