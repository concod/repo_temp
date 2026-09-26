--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:fn_reporting_r1_overall_level_June11 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: stacking changes for fn_reporting_r1_overall_level_June11

DROP FUNCTION if exists price_promo_opt.fn_reporting_r1_overall_level;
CREATE OR REPLACE FUNCTION price_promo_opt.fn_reporting_r1_overall_level(product_hierarchy_levels integer[], store_hierarchy_levels integer[], time_hierarchy_level integer, offer_hierarchy_level integer, _start_date date, _end_date date, _product_filters jsonb, _store_filters jsonb, _completed_offer_ids integer[] DEFAULT NULL::integer[], _event_ids integer[] DEFAULT NULL::integer[], _target_currency_id integer DEFAULT NULL::integer, for_download boolean DEFAULT false)
 RETURNS json
 LANGUAGE plpgsql
AS $function$
DECLARE
    product_columns TEXT;
    store_columns TEXT;
    date_agg_level_group TEXT;
    final_group_by text := '';
    temp_string_where_condition TEXT;
    time_column TEXT := (CASE WHEN time_hierarchy_level = 1 THEN 'week_start_date' ELSE NULL END);
    time_column_2 TEXT := (CASE WHEN time_hierarchy_level = 1 THEN 'week_start_date' WHEN time_hierarchy_level = 0 THEN 'date' ELSE NULL END);
    query TEXT;
    product_overall_level_id INTEGER := -200;
    store_overall_level_id INTEGER := -200;
    _key text;
    _value integer[];
    final_response json := null;
    product_columns_as_null text;
    store_columns_as_null text;
    date_agg_level_group_query2 text;
    offer_level_query text;
    total_fetch_query text;
    date_agg_level_group_query2_without_time_coumn text;
    final_query text;
    promo_ids_where text := '';
    event_ids_where text := '';
    json_product_columns text := '';
    json_store_columns text := '';
    json_select text := '';
    json_select_total text := '';
    final_select text := '';
    group_by_select text := '';
    final_order_by text;
    total_final_select text;
	_column_name TEXT;
    total_query_group_by_select text;
	_product_hierarchy_config jsonb;
	_store_hierarchy_config jsonb;
	target_currency_id_cte text;
BEGIN
    raise notice 'time_column : %, time_column_2: %', time_column, time_column_2;
	
		select config_value::jsonb into _product_hierarchy_config
		from price_promo.tb_tool_configurations
		where module = 'product' and config_name = 'hierarchy_filters';
			
		select config_value::jsonb into _store_hierarchy_config
		from price_promo.tb_tool_configurations
		where module = 'store' and config_name = 'hierarchy_filters';

    -- Generate product columns
    product_columns := price_promo_opt.fn_reporting_r1_get_hierarchy_names(product_hierarchy_levels, 1, array['FOB']::text[]);
    product_columns_as_null := price_promo_opt.fn_reporting_r1_get_hierarchy_names(product_hierarchy_levels, 1, array['FOB']::text[], true);
    json_product_columns := price_promo_opt.fn_reporting_r1_get_hierarchy_names_for_json(product_hierarchy_levels, 1, array['FOB']::text[]);

    -- Generate store columns
    store_columns := price_promo_opt.fn_reporting_r1_get_hierarchy_names(store_hierarchy_levels, 2, array[]::text[]);
    store_columns_as_null := price_promo_opt.fn_reporting_r1_get_hierarchy_names(store_hierarchy_levels, 2, array[]::text[],  true);
    json_store_columns := price_promo_opt.fn_reporting_r1_get_hierarchy_names_for_json(store_hierarchy_levels, 2, array[]::text[]);

    -- Generate aggregation and final grouping strings
    date_agg_level_group := '  a.product_id ' 
                            || CASE WHEN product_columns IS NOT NULL AND product_columns <> '' THEN ', ' || product_columns ELSE '' END
                            || CASE WHEN store_columns IS NOT NULL AND store_columns <> '' THEN ', ' || store_columns ELSE '' END
                            || ', a.date'
                            || CASE WHEN time_column IS NOT NULL AND time_column <> '' THEN ', a.' || time_column ELSE '' END;
    date_agg_level_group_query2 := 'a.product_id '
                            || CASE WHEN product_columns_as_null IS NOT NULL AND product_columns_as_null <> '' THEN ', ' || product_columns_as_null ELSE '' END
                            || CASE WHEN store_columns_as_null IS NOT NULL AND store_columns_as_null <> '' THEN ', ' || store_columns_as_null ELSE '' END
                            || ', a.date'
                            || CASE WHEN time_column IS NOT NULL AND time_column <> '' THEN ', null::date as ' || time_column ELSE '' END;
    date_agg_level_group_query2_without_time_coumn := 'a.product_id '
                            || CASE WHEN product_columns IS NOT NULL AND product_columns <> '' THEN ', ' || product_columns ELSE '' END
                            || CASE WHEN store_columns IS NOT NULL AND store_columns <> '' THEN ', ' || store_columns ELSE '' END
                            || ', a.date'
                            || CASE WHEN time_column IS NOT NULL AND time_column <> '' THEN ', ' || time_column ELSE '' END;
    
    final_order_by := '' || CASE WHEN time_column_2 IS NOT NULL AND time_column_2 <> '' THEN  time_column_2 ELSE '' end
                         || CASE WHEN product_columns IS NOT NULL AND product_columns <> '' THEN ', ' || product_columns ELSE '' end
                         || CASE WHEN store_columns IS NOT NULL AND store_columns <> '' THEN ', ' || store_columns ELSE '' END;
    
    -- Remove any trailing commas from the final string
    date_agg_level_group := RTRIM(date_agg_level_group, ', ');
    date_agg_level_group_query2 := RTRIM(date_agg_level_group_query2, ', ');
    date_agg_level_group_query2_without_time_coumn := RTRIM(date_agg_level_group_query2_without_time_coumn, ', ');
    final_order_by := LTRIM(final_order_by, ' ,');
    final_order_by := RTRIM(final_order_by, ', ');
    if product_overall_level_id = ANY(product_hierarchy_levels) and store_overall_level_id = ANY(store_hierarchy_levels) and time_hierarchy_level = -200 THEN
        final_order_by = '';
    else
        final_order_by = 'ORDER BY ' || final_order_by;
    END IF;
    

    final_group_by := ''|| CASE WHEN product_columns IS NOT NULL AND product_columns <> '' THEN ', ' || product_columns ELSE '' END
                        || CASE WHEN store_columns IS NOT NULL AND store_columns <> '' THEN ', ' || store_columns ELSE '' END
                        || CASE WHEN time_column_2 IS NOT NULL AND time_column_2 <> '' THEN ', ' || time_column_2 ELSE '' END
						-----
						|| ', currency_id, vat_percentage'; 
						-----
    
    total_final_select := ''|| CASE WHEN product_columns IS NOT NULL AND product_columns <> '' THEN ', ' || product_columns ELSE '' END
                        || CASE WHEN store_columns IS NOT NULL AND store_columns <> '' THEN ', ' || store_columns ELSE '' END
                        || CASE WHEN time_column_2 IS NOT NULL AND time_column_2 <> '' THEN ', null::date as ' || time_column_2 ELSE '' END
 						----------------
						|| ', currency_id, vat_percentage'; 
						----------------

    total_query_group_by_select := ''|| CASE WHEN product_columns IS NOT NULL AND product_columns <> '' THEN ', ' || product_columns ELSE '' END
                        || CASE WHEN store_columns IS NOT NULL AND store_columns <> '' THEN ', ' || store_columns ELSE '' end
						-----
						|| ', currency_id, vat_percentage'; 
						-----
    

    -- Remove any trailing commas from the final string
    final_group_by := LTRIM(final_group_by, ' ,');
    final_group_by := RTRIM(final_group_by, ', ');
    total_final_select := LTRIM(total_final_select, ' ,');
    total_final_select := RTRIM(total_final_select, ', ');
    total_query_group_by_select := LTRIM(total_query_group_by_select, ' ,');
    total_query_group_by_select := RTRIM(total_query_group_by_select, ', ');
    raise notice 'final_group_by: %', final_group_by;
    if final_group_by <> '' then 
        final_select = final_group_by || ', ';
        total_final_select = total_final_select || ', ';
    end if;
    raise notice 'final_select: %', final_select;
    raise notice 'total_final_select: %', total_final_select;
    if final_group_by <> '' then 
        group_by_select = ' GROUP BY ' || final_group_by ;
    end if;
    raise notice 'group_by_select: %', group_by_select;

    if total_query_group_by_select <> '' then 
        total_query_group_by_select = ' GROUP BY ' || total_query_group_by_select ;
    end if;
    raise notice 'total_query_group_by_select: %', total_query_group_by_select;

    if not for_download then 
        json_select_total = ' , ''total'', total ';
    end if; 

    json_select = ''|| CASE WHEN json_product_columns IS NOT NULL AND json_product_columns <> '' THEN ' ' || json_product_columns ELSE '' END
                    || CASE WHEN json_store_columns IS NOT NULL AND json_store_columns <> '' THEN ' ' || json_store_columns ELSE '' END
                    || CASE WHEN time_hierarchy_level = 1 then '''Week Start Date'', week_start_date, ' when time_hierarchy_level = 0 then ' ''Date'', date, ' else '' end;
    raise notice 'json_select: %', json_select;

    -- Construct the where condition for products

    temp_string_where_condition := '';
    FOR _key IN SELECT * FROM jsonb_object_keys(_product_filters) LOOP
        
        _value := (SELECT array_agg(val::INTEGER) 
                  FROM jsonb_array_elements(_product_filters -> _key) val);

    
        IF array_length(_value, 1) > 0 THEN
	        --temp_string_where_condition := temp_string_where_condition || ' AND b.'|| split_part(_key, '_', 1) ||'_cid IN (' || array_to_string(_value, ', ') || ')';
			-- older product configuration commented, below block added.
	        _column_name := _product_hierarchy_config -> _key ->> 'id_column';
	
	        IF _column_name IS NOT NULL THEN
	            temp_string_where_condition := temp_string_where_condition ||
	                ' AND b.' || quote_ident(_column_name) ||
	                ' IN (' || array_to_string(_value, ', ') || ')';
	        ELSE
	             RAISE WARNING '[PRODUCT FILTER] Key "%" not found in _product_hierarchy_config or lacks an "id_column".', _key;
	        END IF;
		END IF;

    END LOOP;

    -- Update the where condition with stores

    FOR _key IN SELECT * FROM jsonb_object_keys(_store_filters) LOOP
        
        _value := (SELECT array_agg(val::INTEGER) 
                  FROM jsonb_array_elements(_store_filters -> _key) val);

    
        IF array_length(_value, 1) > 0 THEN
            --temp_string_where_condition := temp_string_where_condition || ' AND a.'|| split_part(_key, '_', 1) ||'_id IN (' || array_to_string(_value, ', ') || ')';
        	-- older store configuration commented, below block added.
        	_column_name := _store_hierarchy_config -> _key ->> 'id_column';
			
			IF _column_name IS NOT NULL THEN
                temp_string_where_condition := temp_string_where_condition ||
                    ' AND a.' || quote_ident(_column_name) ||
                    ' IN (' || array_to_string(_value, ', ') || ')';
        	ELSE
           		  RAISE WARNING '[STORE FILTER] Key "%" not found in _store_hierarchy_config or lacks an "id_column".', _key;
        	END IF;
		END IF;

    END LOOP;

	target_currency_id_cte := format('
				with target_currency_cte AS (
                    SELECT 
                        fn_get_target_currency_id as target_currency_id
                    from 
                        price_promo.fn_get_target_currency_id(
                            (
                                SELECT array_agg(DISTINCT b.currency_id) as source_currency_id
                                FROM price_promo.ps_reporting_post_hierarchy_date a
                                INNER JOIN price_promo.product_master b ON a.product_id = b.product_id
                                WHERE a.date BETWEEN %2$L AND %3$L
                                ' || temp_string_where_condition || promo_ids_where || event_ids_where || '
                            ),
                            %1$L::integer
                        )
			    ),
			', COALESCE(_target_currency_id::text, NULL), _start_date, _end_date);

    -- Construct the dynamic SQL query
    --offer_level_query = price_promo.fn_reporting_r1_offer_level_get_query('ps_reporting_post_promo_date', date_agg_level_group_query1, date_agg_level_group_query1, time_column, temp_string_where_condition, final_group_by, _start_date, _end_date);
    ---total_fetch_query = price_promo.fn_reporting_r1_offer_level_get_query('ps_reporting_post_hierarchy_date', date_agg_level_group_query2, date_agg_level_group_query2_without_time_coumn, null::text, temp_string_where_condition, final_group_by, _start_date, _end_date);
    
    -- For promo_ids, 
    IF array_length(_completed_offer_ids, 1) > 0 THEN
        promo_ids_where = format(' AND array[%1$s] && a.promo_id ', array_to_string(_completed_offer_ids, ','));
    END if;
    IF array_length(_event_ids, 1) > 0 THEN
        event_ids_where = format(' AND array[%1$s] && a.event_id ', array_to_string(_event_ids, ','));
    END IF;
    offer_level_query := target_currency_id_cte || '
        date_level_agg AS (
        SELECT 
            ' || date_agg_level_group || ',
            MAX(a.date) OVER (PARTITION BY a.product_id) AS max_date,

            SUM(a.actual_inventory * afr.planned_conversion_multiplier) AS actual_inventory,
            SUM(a.actual_revenue * afr.planned_conversion_multiplier) AS actual_revenue, 
            SUM(a.finalized_revenue * pfr.planned_conversion_multiplier) AS finalized_revenue, 
            SUM(a.baseline_revenue * pfr.planned_conversion_multiplier) AS baseline_revenue, 
            SUM(a.ly_revenue * pfr.planned_conversion_multiplier) AS ly_revenue, 
            SUM(a.lw_revenue * pfr.planned_conversion_multiplier) AS lw_revenue, 
            SUM(a.actual_sales_units) AS actual_units,
            SUM(a.finalized_sales_units) AS finalized_units,
            SUM(a.baseline_sales_units) AS baseline_units,
            SUM(a.ly_sales_units) AS ly_units,
            SUM(a.lw_sales_units) AS lw_units,
            SUM(a.actual_margin * afr.planned_conversion_multiplier) AS actual_margin,
            SUM(a.finalized_margin * pfr.planned_conversion_multiplier) AS finalized_margin,
            SUM(a.baseline_margin * pfr.planned_conversion_multiplier) AS baseline_margin,
            SUM(a.ly_margin * pfr.planned_conversion_multiplier) AS ly_margin,
            SUM(a.lw_margin * pfr.planned_conversion_multiplier) AS lw_margin,
	
		
			-- New Fields : var : revenue: margin: units with a  prefix
			SUM(a.actual_revenue * afr.planned_conversion_multiplier) - SUM(a.actual_item_plan_revenue * afr.planned_conversion_multiplier) AS actual_var_item_plan_revenue,
			SUM(a.ly_revenue * pfr.planned_conversion_multiplier) - SUM(a.ly_item_plan_revenue * afr.planned_conversion_multiplier) AS ly_var_item_plan_revenue,
			SUM(a.lw_revenue * pfr.planned_conversion_multiplier) - SUM(a.lw_item_plan_revenue * afr.planned_conversion_multiplier) AS lw_var_item_plan_revenue,
			SUM(a.actual_sales_units) - SUM(a.actual_item_plan_unit) AS actual_var_item_plan_unit,
			SUM(a.ly_sales_units) - SUM(a.ly_item_plan_unit) AS ly_var_item_plan_unit,
			SUM(a.lw_sales_units) - SUM(a.lw_item_plan_unit) AS lw_var_item_plan_unit,
			SUM(a.actual_margin * afr.planned_conversion_multiplier) - SUM(a.actual_item_plan_margin * afr.planned_conversion_multiplier) AS actual_var_item_plan_margin,
			SUM(a.ly_margin * pfr.planned_conversion_multiplier) - SUM(a.ly_item_plan_margin * afr.planned_conversion_multiplier) AS ly_var_item_plan_margin,
			SUM(a.lw_margin * pfr.planned_conversion_multiplier) - SUM(a.lw_item_plan_margin * afr.planned_conversion_multiplier) AS lw_var_item_plan_margin,
			-----------------------------------------------------
			--New Fields : Revenue with a prefix
			SUM(a.actual_item_plan_revenue * afr.planned_conversion_multiplier) AS actual_item_plan_revenue, -- Renamed alias to avoid conflict
			SUM(a.ly_item_plan_revenue * pfr.planned_conversion_multiplier) AS ly_item_plan_revenue,       -- Renamed alias to avoid conflict
			SUM(a.lw_item_plan_revenue * pfr.planned_conversion_multiplier) AS lw_item_plan_revenue,       -- Renamed alias to avoid conflict
			
			
			-- New Fields: Sales Units with a prefix
			SUM(a.actual_item_plan_unit) AS actual_item_plan_unit,     -- Renamed alias to avoid conflict
			SUM(a.ly_item_plan_unit) AS ly_item_plan_unit,           -- Renamed alias to avoid conflict
			SUM(a.lw_item_plan_unit) AS lw_item_plan_unit,           -- Renamed alias to avoid conflict
			
			
			-- New Fields: Margin with a prefix
			SUM(a.actual_item_plan_margin * afr.planned_conversion_multiplier) AS actual_item_plan_margin,   -- Renamed alias to avoid conflict
			SUM(a.ly_item_plan_margin * pfr.planned_conversion_multiplier) AS ly_item_plan_margin,         -- Renamed alias to avoid conflict
			SUM(a.lw_item_plan_margin * pfr.planned_conversion_multiplier) AS lw_item_plan_margin,         -- Renamed alias to avoid conflict
			
			------------------------------------------------
            SUM(a.actual_contribution_margin * afr.planned_conversion_multiplier) as actual_contribution_margin,
            SUM(a.finalized_contribution_margin * pfr.planned_conversion_multiplier) as finalized_contribution_margin,
            SUM(a.actual_contribution_revenue * afr.planned_conversion_multiplier) as actual_contribution_revenue,
            SUM(a.finalized_contribution_revenue * pfr.planned_conversion_multiplier) as finalized_contribution_revenue,
            SUM(a.lw_contribution_margin * pfr.planned_conversion_multiplier) as lw_contribution_margin,
            SUM(a.lw_contribution_revenue * pfr.planned_conversion_multiplier) as lw_contribution_revenue,
            SUM(a.ly_contribution_margin * pfr.planned_conversion_multiplier) as ly_contribution_margin,
            SUM(a.ly_contribution_revenue * pfr.planned_conversion_multiplier) as ly_contribution_revenue,
            SUM(a.actual_sales_units * a.actual_discount) as actual_weighted_discount
			--------------------------------------
			,MAX(b.currency_id) as currency_id,
			MAX(c.vat_percentage) as vat_percentage
			--------------------------------------
        	FROM price_promo.ps_reporting_post_hierarchy_date a 
        	INNER JOIN price_promo.product_master b ON a.product_id = b.product_id 
			------
			INNER JOIN global.tb_vat_master c on b.l0_id=CAST(c.l0_id AS TEXT)
			------
			inner join 
                global.planned_forex_rate afr 
                on 
                    a.date = afr.date 
                    and afr.source_currency_id = b.currency_id
                    and afr.target_currency_id = (SELECT target_currency_id FROM target_currency_cte)
			inner join 
                global.planned_forex_rate pfr 
                on 
                    a.date = pfr.date 
                    and pfr.source_currency_id = b.currency_id
                    and pfr.target_currency_id = (SELECT target_currency_id FROM target_currency_cte)
			------
        WHERE a.date BETWEEN ' || quote_literal(_start_date) || ' AND ' || quote_literal(_end_date) ||
        temp_string_where_condition || promo_ids_where || event_ids_where || '
        GROUP BY ' || date_agg_level_group || '
    )
    SELECT 
         ' || final_select || '
        (select target_currency_id from target_currency_cte) as target_currency_id,
        SUM(case when date=max_date then actual_inventory else 0 end ) as actual_inventory,
        100 * SUM(actual_units) / nullif(( SUM(case when date=max_date then actual_inventory else 0 end ) + SUM(actual_units) ), 0) as actual_st,
        CASE 
            WHEN SUM(actual_units) = 0 THEN NULL
            ELSE sum(actual_weighted_discount) / sum(actual_units)
        END AS actual_discount,
        

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
		----------------------------------------------
		-- ASP Calculations and Variances
		CASE WHEN SUM(actual_units) = 0 THEN NULL ELSE SUM(actual_revenue) / SUM(actual_units) END AS asp_actual,
		CASE WHEN SUM( finalized_units) = 0 THEN NULL ELSE SUM(finalized_revenue) / SUM( finalized_units) END AS asp_finalized,
		CASE
		WHEN SUM( finalized_units) = 0 THEN NULL -- If finalized units are zero, finalized ASP is undefined
		ELSE (
		(CASE WHEN SUM(actual_units) = 0 THEN NULL ELSE SUM(actual_revenue) / SUM(actual_units) END) -- Actual ASP
		-
		(SUM(finalized_revenue) / SUM( finalized_units)) -- Finalized ASP
		)
		/
		NULLIF((SUM(finalized_revenue) / SUM( finalized_units)), 0) -- Finalized ASP (Denominator, protected)
		END AS asp_var_fc,
		CASE WHEN SUM(ly_units) = 0 THEN NULL ELSE SUM(ly_revenue) / SUM(ly_units) END AS asp_ly,
		CASE
		WHEN SUM(ly_units) = 0 THEN NULL -- If LY units are zero, LY ASP is undefined
		ELSE (
		(CASE WHEN SUM(actual_units) = 0 THEN NULL ELSE SUM(actual_revenue) / SUM(actual_units) END) -- Actual ASP
		-
		(SUM(ly_revenue) / SUM(ly_units)) -- LY ASP
		)
		/
		NULLIF((SUM(ly_revenue) / SUM(ly_units)), 0) -- LY ASP (Denominator, protected)
		END AS asp_var_ly,
		-- Corrected asp_plan using actual_item_plan columns
		CASE WHEN SUM(actual_item_plan_unit) = 0 THEN NULL ELSE SUM(actual_item_plan_revenue) / SUM(actual_item_plan_unit) END AS asp_plan,
		-- Corrected asp_var_plan using actual_item_plan columns and NULLIF protection
		CASE
		WHEN SUM(actual_item_plan_unit) = 0 THEN NULL -- If Plan units are zero, Plan ASP is undefined
		ELSE (
		(CASE WHEN SUM(actual_units) = 0 THEN NULL ELSE SUM(actual_revenue) / SUM(actual_units) END) -- Actual ASP
		-
		(SUM(actual_item_plan_revenue) / SUM(actual_item_plan_unit)) -- Plan ASP
		)
		/
		NULLIF((SUM(actual_item_plan_revenue) / SUM(actual_item_plan_unit)), 0) -- Plan ASP (Denominator, protected)
		END AS asp_var_plan,
		CASE WHEN SUM(lw_units) = 0 THEN NULL ELSE SUM(lw_revenue) / SUM(lw_units) END AS asp_lw,
		CASE
		WHEN SUM(lw_units) = 0 THEN NULL -- If LW units are zero, LW ASP is undefined
		ELSE (
		(CASE WHEN SUM(actual_units) = 0 THEN NULL ELSE SUM(actual_revenue) / SUM(actual_units) END) -- Actual ASP
		-
		(SUM(lw_revenue) / SUM(lw_units)) -- LW ASP
		)
		/
		NULLIF((SUM(lw_revenue) / SUM(lw_units)), 0) -- LW ASP (Denominator, protected)
		END AS asp_var_lw,
		
		-- AUM Calculations and Variances
		CASE WHEN SUM(actual_units) = 0 THEN NULL ELSE SUM(actual_margin) / SUM(actual_units) END AS aum_actual,
		CASE WHEN SUM( finalized_units) = 0 THEN NULL ELSE SUM(finalized_margin) / SUM( finalized_units) END AS aum_finalized,
		CASE
		WHEN SUM( finalized_units) = 0 THEN NULL -- If finalized units are zero, finalized AUM is undefined
		ELSE (
		(CASE WHEN SUM(actual_units) = 0 THEN NULL ELSE SUM(actual_margin) / SUM(actual_units) END) -- Actual AUM
		-
		(SUM(finalized_margin) / SUM( finalized_units)) -- Finalized AUM
		)
		/
		NULLIF((SUM(finalized_margin) / SUM( finalized_units)), 0) -- Finalized AUM (Denominator, protected)
		END AS aum_var_fc,
		CASE WHEN SUM(ly_units) = 0 THEN NULL ELSE SUM(ly_margin) / SUM(ly_units) END AS aum_ly,
		CASE
		WHEN SUM(ly_units) = 0 THEN NULL -- If LY units are zero, LY AUM is undefined
		ELSE (
		(CASE WHEN SUM(actual_units) = 0 THEN NULL ELSE SUM(actual_margin) / SUM(actual_units) END) -- Actual AUM
		-
		(SUM(ly_margin) / SUM(ly_units)) -- LY AUM
		)
		/
		NULLIF((SUM(ly_margin) / SUM(ly_units)), 0) -- LY AUM (Denominator, protected)
		END AS aum_var_ly,
		-- Corrected aum_plan using actual_item_plan columns
		CASE WHEN SUM(actual_item_plan_unit) = 0 THEN NULL ELSE SUM(actual_item_plan_margin) / SUM(actual_item_plan_unit) END AS aum_plan,
		-- Corrected aum_var_plan using actual_item_plan columns and NULLIF protection
		CASE
		WHEN SUM(actual_item_plan_unit) = 0 THEN NULL -- If Plan units are zero, Plan AUM is undefined
		ELSE (
		(CASE WHEN SUM(actual_units) = 0 THEN NULL ELSE SUM(actual_margin) / SUM(actual_units) END) -- Actual AUM
		-
		(SUM(actual_item_plan_margin) / SUM(actual_item_plan_unit)) -- Plan AUM
		)
		/
		NULLIF((SUM(actual_item_plan_margin) / SUM(actual_item_plan_unit)), 0) -- Plan AUM (Denominator, protected)
		END AS aum_var_plan,
		CASE WHEN SUM(lw_units) = 0 THEN NULL ELSE SUM(lw_margin) / SUM(lw_units) END AS aum_lw,
		CASE
		WHEN SUM(lw_units) = 0 THEN NULL -- If LW units are zero, LW AUM is undefined
		ELSE (
		(CASE WHEN SUM(actual_units) = 0 THEN NULL ELSE SUM(actual_margin) / SUM(actual_units) END) -- Actual AUM
		-
		(SUM(lw_margin) / SUM(lw_units)) -- LW AUM
		)
		/
		NULLIF((SUM(lw_margin) / SUM(lw_units)), 0) -- LW AUM (Denominator, protected)
		END AS aum_var_lw,
		
		-- New Fields : var : revenue: margin: units (These already used specific names)
		SUM(actual_revenue) - SUM(actual_item_plan_revenue) AS actual_var_item_plan_revenue,
		SUM(ly_revenue) - SUM(ly_item_plan_revenue) AS ly_var_item_plan_revenue,
		SUM(lw_revenue) - SUM(lw_item_plan_revenue) AS lw_var_item_plan_revenue,
		SUM(actual_units) - SUM(actual_item_plan_unit) AS actual_var_item_plan_unit,
		SUM(ly_units) - SUM(ly_item_plan_unit) AS ly_var_item_plan_unit,
		SUM(lw_units) - SUM(lw_item_plan_unit) AS lw_var_item_plan_unit,
		SUM(actual_margin) - SUM(actual_item_plan_margin) AS actual_var_item_plan_margin,
		SUM(ly_margin) - SUM(ly_item_plan_margin) AS ly_var_item_plan_margin,
		SUM(lw_margin) - SUM(lw_item_plan_margin) AS lw_var_item_plan_margin,
		
		--New Fields : Revenue (These already used specific names)
		SUM(actual_item_plan_revenue) AS actual_item_plan_revenue,
		SUM(ly_item_plan_revenue) AS ly_item_plan_revenue,
		SUM(lw_item_plan_revenue) AS lw_item_plan_revenue,
		SUM(baseline_revenue) - SUM(actual_revenue) AS actual_incremental_revenue,
		SUM(baseline_revenue) - SUM(finalized_revenue) AS finalized_incremental_revenue,
		
		-- New Fields: Sales Units (These already used specific names)
		SUM(actual_item_plan_unit) AS actual_item_plan_unit,
		SUM(ly_item_plan_unit) AS ly_item_plan_unit,
		SUM(lw_item_plan_unit) AS lw_item_plan_unit,
		SUM(baseline_units) - SUM(actual_units) AS actual_incremental_unit,
		SUM(baseline_units) - SUM( finalized_units) AS finalized_incremental_unit, -- Note: Alias seems inconsistent, maybe finalized_incremental_unit?
		
		-- New Fields: Margin (These already used specific names)
		SUM(actual_item_plan_margin) AS actual_item_plan_margin,
		SUM(ly_item_plan_margin) AS ly_item_plan_margin,
		SUM(lw_item_plan_margin) AS lw_item_plan_margin,
		SUM(baseline_margin) - SUM(actual_margin) AS actual_incremental_margin,
		SUM(baseline_margin) - SUM(finalized_margin) AS finalized_incremental_margin, -- Note: Alias seems inconsistent, maybe finalized_incremental_margin?
		----------------------------------------------

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


        SUM(actual_margin) AS actual_margin,
        SUM(finalized_margin) AS finalized_margin,
        CASE 
            WHEN SUM(finalized_margin) = 0 THEN NULL
            ELSE 100 * (SUM(actual_margin) - SUM(finalized_margin)) / SUM(finalized_margin)
        END AS var_finalized_margin,

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
        0 as total
		---------------------
		,MAX(currency_id),
		MAX(vat_percentage)
		---------------------
    FROM date_level_agg 
    ' || group_by_select || '';
    --raise notice 'offer_level_query : %', offer_level_query;
   
    
    total_fetch_query := target_currency_id_cte || '
        date_level_agg AS (
        SELECT 
            ' || date_agg_level_group_query2 || ',
            MAX(a.date) OVER (PARTITION BY a.product_id) AS max_date,
            SUM(a.actual_inventory * afr.planned_conversion_multiplier) AS actual_inventory,
            SUM(a.actual_revenue * afr.planned_conversion_multiplier) AS actual_revenue, 
            SUM(a.finalized_revenue * pfr.planned_conversion_multiplier) AS finalized_revenue, 
            SUM(a.baseline_revenue * pfr.planned_conversion_multiplier) AS baseline_revenue, 
            SUM(a.ly_revenue * pfr.planned_conversion_multiplier) AS ly_revenue, 
            SUM(a.lw_revenue * pfr.planned_conversion_multiplier) AS lw_revenue, 
            SUM(a.actual_sales_units) AS actual_units,
            SUM(a.finalized_sales_units) AS finalized_units,
            SUM(a.baseline_sales_units) AS baseline_units,

			--------------------------------------------------
			
			--New Fields : Revenue with a prefix
			SUM(a.actual_item_plan_revenue * afr.planned_conversion_multiplier) AS actual_item_plan_revenue, -- Renamed alias to avoid conflict
			SUM(a.ly_item_plan_revenue * pfr.planned_conversion_multiplier) AS ly_item_plan_revenue,       -- Renamed alias to avoid conflict
			SUM(a.lw_item_plan_revenue * pfr.planned_conversion_multiplier) AS lw_item_plan_revenue,       -- Renamed alias to avoid conflict
			
			
			-- New Fields: Sales Units with a prefix
			SUM(a.actual_item_plan_unit) AS actual_item_plan_unit,     -- Renamed alias to avoid conflict
			SUM(a.ly_item_plan_unit) AS ly_item_plan_unit,           -- Renamed alias to avoid conflict
			SUM(a.lw_item_plan_unit) AS lw_item_plan_unit,           -- Renamed alias to avoid conflict
			
			-- New Fields: Margin with a prefix
			SUM(a.actual_item_plan_margin * afr.planned_conversion_multiplier) AS actual_item_plan_margin,   -- Renamed alias to avoid conflict
			SUM(a.ly_item_plan_margin * pfr.planned_conversion_multiplier) AS ly_item_plan_margin,         -- Renamed alias to avoid conflict
			SUM(a.lw_item_plan_margin * pfr.planned_conversion_multiplier) AS lw_item_plan_margin,         -- Renamed alias to avoid conflict
			
			--------------------------------------------------
            SUM(a.ly_sales_units) AS ly_units,
            SUM(a.lw_sales_units) AS lw_units,
            SUM(a.actual_margin * afr.planned_conversion_multiplier) AS actual_margin,
            SUM(a.finalized_margin * pfr.planned_conversion_multiplier) AS finalized_margin,
            SUM(a.baseline_margin * pfr.planned_conversion_multiplier) AS baseline_margin,
            SUM(a.ly_margin * pfr.planned_conversion_multiplier) AS ly_margin,
            SUM(a.lw_margin * pfr.planned_conversion_multiplier) AS lw_margin,
            SUM(a.actual_contribution_margin * afr.planned_conversion_multiplier) as actual_contribution_margin,
            SUM(a.finalized_contribution_margin * pfr.planned_conversion_multiplier) as finalized_contribution_margin,
            SUM(a.actual_contribution_revenue * afr.planned_conversion_multiplier) as actual_contribution_revenue,
            SUM(a.finalized_contribution_revenue * pfr.planned_conversion_multiplier) as finalized_contribution_revenue,
            SUM(a.lw_contribution_margin * pfr.planned_conversion_multiplier) as lw_contribution_margin,
            SUM(a.lw_contribution_revenue * pfr.planned_conversion_multiplier) as lw_contribution_revenue,
            SUM(a.ly_contribution_margin * pfr.planned_conversion_multiplier) as ly_contribution_margin,
            SUM(a.ly_contribution_revenue * pfr.planned_conversion_multiplier) as ly_contribution_revenue,
            SUM(a.actual_sales_units * a.actual_discount) as actual_weighted_discount
			--------------------------------------
			,MAX(b.currency_id) as currency_id,
			MAX(c.vat_percentage) as vat_percentage
			--------------------------------------

		
        FROM price_promo.ps_reporting_post_hierarchy_date a 
        INNER JOIN price_promo.product_master b ON a.product_id = b.product_id 
		------
		INNER JOIN global.tb_vat_master c on b.l0_id=CAST(c.l0_id AS TEXT)
		inner join 
            global.planned_forex_rate afr 
            on 
                a.date = afr.date 
                and afr.source_currency_id = b.currency_id
                and afr.target_currency_id = (SELECT target_currency_id FROM target_currency_cte)
		inner join 
            global.planned_forex_rate pfr 
            on 
                a.date = pfr.date 
                and pfr.source_currency_id = b.currency_id
                and pfr.target_currency_id = (SELECT target_currency_id FROM target_currency_cte)
		------

        WHERE a.date BETWEEN ' || quote_literal(_start_date) || ' AND ' || quote_literal(_end_date) ||
        temp_string_where_condition || promo_ids_where || event_ids_where || '
        GROUP BY ' || date_agg_level_group_query2_without_time_coumn || '
    )
    SELECT 
         ' || total_final_select || '
        (select target_currency_id from target_currency_cte) as target_currency_id,
        SUM(case when date=max_date then actual_inventory else 0 end ) as actual_inventory,
        100 * SUM(actual_units) / 
        NULLIF(
            (SUM(CASE WHEN date = max_date THEN actual_inventory ELSE 0 END) + SUM(actual_units)), 
            0
        ) AS actual_st,
        CASE 
            WHEN SUM(actual_units) = 0 THEN NULL
            ELSE sum(actual_weighted_discount) / sum(actual_units)
        END AS actual_discount,
        -------------------------------------------------------------
		-- ASP Calculations and Variances
		CASE WHEN SUM(actual_units) = 0 THEN NULL ELSE SUM(actual_revenue) / SUM(actual_units) END AS asp_actual,
		CASE WHEN SUM(finalized_units) = 0 THEN NULL ELSE SUM(finalized_revenue) / SUM(finalized_units) END AS asp_finalized,
		CASE
		WHEN SUM(finalized_units) = 0 THEN NULL -- If finalized units are zero, finalized ASP is undefined
		ELSE (
		(CASE WHEN SUM(actual_units) = 0 THEN NULL ELSE SUM(actual_revenue) / SUM(actual_units) END) -- Actual ASP
		-
		(SUM(finalized_revenue) / SUM(finalized_units)) -- Finalized ASP
		)
		/
		NULLIF((SUM(finalized_revenue) / SUM(finalized_units)), 0) -- Finalized ASP (Denominator, protected)
		END AS asp_var_fc,
		CASE WHEN SUM(ly_units) = 0 THEN NULL ELSE SUM(ly_revenue) / SUM(ly_units) END AS asp_ly,
		CASE
		WHEN SUM(ly_units) = 0 THEN NULL -- If LY units are zero, LY ASP is undefined
		ELSE (
		(CASE WHEN SUM(actual_units) = 0 THEN NULL ELSE SUM(actual_revenue) / SUM(actual_units) END) -- Actual ASP
		-
		(SUM(ly_revenue) / SUM(ly_units)) -- LY ASP
		)
		/
		NULLIF((SUM(ly_revenue) / SUM(ly_units)), 0) -- LY ASP (Denominator, protected)
		END AS asp_var_ly,
		-- Corrected asp_plan using actual_item_plan columns
		CASE WHEN SUM(actual_item_plan_unit) = 0 THEN NULL ELSE SUM(actual_item_plan_revenue) / SUM(actual_item_plan_unit) END AS asp_plan,
		-- Corrected asp_var_plan using actual_item_plan columns and NULLIF protection
		CASE
		WHEN SUM(actual_item_plan_unit) = 0 THEN NULL -- If Plan units are zero, Plan ASP is undefined
		ELSE (
		(CASE WHEN SUM(actual_units) = 0 THEN NULL ELSE SUM(actual_revenue) / SUM(actual_units) END) -- Actual ASP
		-
		(SUM(actual_item_plan_revenue) / SUM(actual_item_plan_unit)) -- Plan ASP
		)
		/
		NULLIF((SUM(actual_item_plan_revenue) / SUM(actual_item_plan_unit)), 0) -- Plan ASP (Denominator, protected)
		END AS asp_var_plan,
		CASE WHEN SUM(lw_units) = 0 THEN NULL ELSE SUM(lw_revenue) / SUM(lw_units) END AS asp_lw,
		CASE
		WHEN SUM(lw_units) = 0 THEN NULL -- If LW units are zero, LW ASP is undefined
		ELSE (
		(CASE WHEN SUM(actual_units) = 0 THEN NULL ELSE SUM(actual_revenue) / SUM(actual_units) END) -- Actual ASP
		-
		(SUM(lw_revenue) / SUM(lw_units)) -- LW ASP
		)
		/
		NULLIF((SUM(lw_revenue) / SUM(lw_units)), 0) -- LW ASP (Denominator, protected)
		END AS asp_var_lw,
		
		-- AUM Calculations and Variances
		CASE WHEN SUM(actual_units) = 0 THEN NULL ELSE SUM(actual_margin) / SUM(actual_units) END AS aum_actual,
		CASE WHEN SUM(finalized_units) = 0 THEN NULL ELSE SUM(finalized_margin) / SUM(finalized_units) END AS aum_finalized,
		CASE
		WHEN SUM(finalized_units) = 0 THEN NULL -- If finalized units are zero, finalized AUM is undefined
		ELSE (
		(CASE WHEN SUM(actual_units) = 0 THEN NULL ELSE SUM(actual_margin) / SUM(actual_units) END) -- Actual AUM
		-
		(SUM(finalized_margin) / SUM(finalized_units)) -- Finalized AUM
		)
		/
		NULLIF((SUM(finalized_margin) / SUM(finalized_units)), 0) -- Finalized AUM (Denominator, protected)
		END AS aum_var_fc,
		CASE WHEN SUM(ly_units) = 0 THEN NULL ELSE SUM(ly_margin) / SUM(ly_units) END AS aum_ly,
		CASE
		WHEN SUM(ly_units) = 0 THEN NULL -- If LY units are zero, LY AUM is undefined
		ELSE (
		(CASE WHEN SUM(actual_units) = 0 THEN NULL ELSE SUM(actual_margin) / SUM(actual_units) END) -- Actual AUM
		-
		(SUM(ly_margin) / SUM(ly_units)) -- LY AUM
		)
		/
		NULLIF((SUM(ly_margin) / SUM(ly_units)), 0) -- LY AUM (Denominator, protected)
		END AS aum_var_ly,
		-- Corrected aum_plan using actual_item_plan columns
		CASE WHEN SUM(actual_item_plan_unit) = 0 THEN NULL ELSE SUM(actual_item_plan_margin) / SUM(actual_item_plan_unit) END AS aum_plan,
		-- Corrected aum_var_plan using actual_item_plan columns and NULLIF protection
		CASE
		WHEN SUM(actual_item_plan_unit) = 0 THEN NULL -- If Plan units are zero, Plan AUM is undefined
		ELSE (
		(CASE WHEN SUM(actual_units) = 0 THEN NULL ELSE SUM(actual_margin) / SUM(actual_units) END) -- Actual AUM
		-
		(SUM(actual_item_plan_margin) / SUM(actual_item_plan_unit)) -- Plan AUM
		)
		/
		NULLIF((SUM(actual_item_plan_margin) / SUM(actual_item_plan_unit)), 0) -- Plan AUM (Denominator, protected)
		END AS aum_var_plan,
		CASE WHEN SUM(lw_units) = 0 THEN NULL ELSE SUM(lw_margin) / SUM(lw_units) END AS aum_lw,
		CASE
		WHEN SUM(lw_units) = 0 THEN NULL -- If LW units are zero, LW AUM is undefined
		ELSE (
		(CASE WHEN SUM(actual_units) = 0 THEN NULL ELSE SUM(actual_margin) / SUM(actual_units) END) -- Actual AUM
		-
		(SUM(lw_margin) / SUM(lw_units)) -- LW AUM
		)
		/
		NULLIF((SUM(lw_margin) / SUM(lw_units)), 0) -- LW AUM (Denominator, protected)
		END AS aum_var_lw,
		
		-- New Fields : var : revenue: margin: units (These already used specific names)
		SUM(actual_revenue) - SUM(actual_item_plan_revenue) AS actual_var_item_plan_revenue,
		SUM(ly_revenue) - SUM(ly_item_plan_revenue) AS ly_var_item_plan_revenue,
		SUM(lw_revenue) - SUM(lw_item_plan_revenue) AS lw_var_item_plan_revenue,
		SUM(actual_units) - SUM(actual_item_plan_unit) AS actual_var_item_plan_unit,
		SUM(ly_units) - SUM(ly_item_plan_unit) AS ly_var_item_plan_unit,
		SUM(lw_units) - SUM(lw_item_plan_unit) AS lw_var_item_plan_unit,
		SUM(actual_margin) - SUM(actual_item_plan_margin) AS actual_var_item_plan_margin,
		SUM(ly_margin) - SUM(ly_item_plan_margin) AS ly_var_item_plan_margin,
		SUM(lw_margin) - SUM(lw_item_plan_margin) AS lw_var_item_plan_margin,
		
		--New Fields : Revenue (These already used specific names)
		SUM(actual_item_plan_revenue) AS actual_item_plan_revenue,
		SUM(ly_item_plan_revenue) AS ly_item_plan_revenue,
		SUM(lw_item_plan_revenue) AS lw_item_plan_revenue,
		SUM(baseline_revenue) - SUM(actual_revenue) AS actual_incremental_revenue,
		SUM(baseline_revenue) - SUM(finalized_revenue) AS finalized_incremental_revenue,
		
		-- New Fields: Sales Units (These already used specific names)
		SUM(actual_item_plan_unit) AS actual_item_plan_unit,
		SUM(ly_item_plan_unit) AS ly_item_plan_unit,
		SUM(lw_item_plan_unit) AS lw_item_plan_unit,
		SUM(baseline_units) - SUM(actual_units) AS actual_incremental_unit,
		SUM(baseline_units) - SUM(finalized_units) AS finalized_incremental_unit, -- Note: Alias seems inconsistent, maybe finalized_incremental_unit?
		
		-- New Fields: Margin (These already used specific names)
		SUM(actual_item_plan_margin) AS actual_item_plan_margin,
		SUM(ly_item_plan_margin) AS ly_item_plan_margin,
		SUM(lw_item_plan_margin) AS lw_item_plan_margin,
		SUM(baseline_margin) - SUM(actual_margin) AS actual_incremental_margin,
		SUM(baseline_margin) - SUM(finalized_margin) AS finalized_incremental_margin, -- Note: Alias seems inconsistent, maybe finalized_incremental_margin?
		-------------------------------------------------------------

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


        SUM(actual_margin) AS actual_margin,
        SUM(finalized_margin) AS finalized_margin,
        CASE 
            WHEN SUM(finalized_margin) = 0 THEN NULL
            ELSE 100 * (SUM(actual_margin) - SUM(finalized_margin)) / SUM(finalized_margin)
        END AS var_finalized_margin,

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
        1 as total,
		---------------------
		MAX(currency_id),
		MAX(vat_percentage)
		---------------------
    FROM date_level_agg 
    ' || total_query_group_by_select || '';
    --raise notice 'total_fetch_query : %', total_fetch_query;
   
   
    raise notice 'json_select : %', json_select;
    raise notice 'json_select_total : %', json_select_total;
    final_query = ' WITH offer_level_data_cte AS (
                                '|| offer_level_query || '
                            ),
                            total_data_cte AS (
                                '|| total_fetch_query || '
                            )
                            SELECT 
                                json_agg(
                                    json_build_object(
                                        ''Report Level'', (case when total = 0 then ''Overall Level'' else ''TOTAL'' end),
                                        ' || json_select || '
                                        
                                        ''Sales $'', json_build_object(
                                                                        ''Actual Sales $'', round( actual_revenue ),
                                                                        ''Forecasted Sales $'', round( finalized_revenue ),
                                                                        ''Var FC Sales $'', round( var_finalized_revenue ),
                                                                        ''Last Year Sales $'', round( ly_revenue ),
                                                                        ''Var LY Sales $'', round( var_ly_revenue ),
                                                                        ''Last Week Sales $'', round( lw_revenue ),
                                                                        ''Var LW Sales $'', round( var_lw_revenue ),
																		''Actual Var Plan Sales $'', round(actual_var_item_plan_revenue), -- NEW
							                                            ''LY Var Plan Sales $'', round(ly_var_item_plan_revenue),       -- NEW
							                                            ''LW Var Plan Sales $'', round(lw_var_item_plan_revenue),       -- NEW
							                                            ''Actual Incremental Sales $'', round(actual_incremental_revenue), -- NEW
							                                            ''Finalized Incremental Sales $'', round(finalized_incremental_revenue) -- NEW
							                                              ),
                                        
                                        ''Sales U'', json_build_object(
                                                                        ''Actual Sales U'', round( actual_units ),
                                                                        ''Forecasted Sales U'', round( finalized_units ),
                                                                        ''Var FC Sales U'', round( var_finalized_units ),
                                                                        ''Last Year Sales U'', round( ly_units ),
                                                                        ''Var LY Sales U'', round( var_ly_units ),
                                                                        ''Last Week Sales U'', round( lw_units ),
                                                                        ''Var LW Sales U'', round( var_lw_units ),
																		''Actual Var Plan Sales U'', round(actual_var_item_plan_unit), -- NEW
							                                            ''LY Var Plan Sales U'', round(ly_var_item_plan_unit),       -- NEW
							                                            ''LW Var Plan Sales U'', round(lw_var_item_plan_unit),       -- NEW
							                                            ''Actual Incremental Sales U'', round(actual_incremental_unit), -- NEW
							                                            ''Finalized Incremental Sales U'', round(finalized_incremental_unit) -- NEW
							                                              ),
                                        
                                        ''GM $'', json_build_object(
                                                                        ''Actual GM $'', round( actual_margin ),
                                                                        ''Forecasted GM $'', round( finalized_margin ),
                                                                        ''Var FC GM $'', round( var_finalized_margin ),
                                                                        ''Last Year GM $'', round( ly_margin ),
                                                                        ''Var LY GM $'', round( var_ly_margin ),
                                                                        ''Last Week GM $'', round( lw_margin ),
                                                                        ''Var LW GM $'', round( var_lw_margin ),
																		''Actual Var Plan GM $'', round(actual_var_item_plan_margin), -- NEW
							                                            ''LY Var Plan GM $'', round(ly_var_item_plan_margin),       -- NEW
							                                            ''LW Var Plan GM $'', round(lw_var_item_plan_margin),       -- NEW
							                                            ''Actual Incremental GM $'', round(actual_incremental_margin), -- NEW
							                                            ''Finalized Incremental GM $'', round(finalized_incremental_margin) -- NEW
							                                            ),
                                        
                                        ''GM %'', json_build_object(
                                                                        ''Actual GM %'', round( actual_gm_percent ),
                                                                        ''Forecasted GM %'', round( finalized_gm_percent ),
                                                                        ''Var FC GM %'', round( var_finalized_gm_percent ),
                                                                        ''Last Year GM %'', round( ly_gm_percent ),
                                                                        ''Var LY GM %'', round( var_ly_gm_percent ),
                                                                        ''Last Week GM %'', round( lw_gm_percent ),
                                                                        ''Var LW GM %'', round( var_lw_gm_percent )
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
                                        
                                        -- << NEW ASP SECTION >>
                                        ''ASP'', json_build_object(
							                                            ''Actual ASP'', round(asp_actual::numeric, 2),
							                                            ''Forecasted ASP'', round(asp_finalized::numeric, 2),
							                                            ''Var FC ASP'', round(asp_var_fc::numeric, 2), 
							                                            ''Last Year ASP'', round(asp_ly::numeric, 2),
							                                            ''Var LY ASP'', round(asp_var_ly::numeric, 2), 
							                                            ''Plan ASP'', round(asp_plan::numeric, 2),
							                                            ''Var Plan ASP'', round(asp_var_plan::numeric, 2), 
							                                            ''Last Week ASP'', round(asp_lw::numeric, 2),
							                                            ''Var LW ASP'', round(asp_var_lw::numeric, 2) 
							                                        ),

                                        -- << NEW AUM SECTION >>
                                        ''AUM'', json_build_object(
								                                            ''Actual AUM'', round(aum_actual::numeric, 2),
								                                            ''Forecasted AUM'', round(aum_finalized::numeric, 2),
								                                            ''Var FC AUM'', round(aum_var_fc::numeric, 2), 
								                                            ''Last Year AUM'', round(aum_ly::numeric, 2),
								                                            ''Var LY AUM'', round(aum_var_ly::numeric, 2), 
								                                            ''Plan AUM'', round(aum_plan::numeric, 2),
								                                            ''Var Plan AUM'', round(aum_var_plan::numeric, 2), 
								                                            ''Last Week AUM'', round(aum_lw::numeric, 2),
								                                            ''Var LW AUM'', round(aum_var_lw::numeric, 2) 
								                                        ),
                                        ''Actual ST%'', round( actual_st ),
                                        ''Actual BOP Inventory'', round( actual_inventory ),
                                        ''Actual Discount'', round( actual_discount ),
										''Currency Id'', round(dd.currency_id ),
										''currency_details'', json_build_object(
																				''id'', tcm.currency_id,
																				''name'', tcm.currency_name,
																				''symbol'', tcm.currency_symbol
																			),
										''VAT Percentage'', round(vat_percentage )
                                        ' || json_select_total || '
                                    )
                                ) as result
                            FROM 
                                (
                                    select * from offer_level_data_cte
                                    union all
                                    select * from total_data_cte
                                    ' || final_order_by || '
                                ) dd
								inner join global.tb_currency_master tcm on dd.target_currency_id = tcm.currency_id
                        ';
    --, offer_level_query, total_fetch_query, json_select, json_select_total);
    raise notice 'final_query : %', final_query;
   
    --final_query = 'select null::json as result';
    execute final_query into final_response;
    return final_response;
END;
$function$
;
;
