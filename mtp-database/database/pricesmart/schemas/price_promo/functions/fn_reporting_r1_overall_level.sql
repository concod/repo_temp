--liquibase formatted sql
--changeset liquibase:fn_reporting_r1_overall_level_24052025 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: fn_reporting_r1_overall_level_9
--rollback: SELECT 1

-- Purpose: Generates aggregated reporting metrics at overall level for promotions including sales, revenue, margin and contribution metrics
--
-- Example:
-- SELECT * FROM price_promo.fn_reporting_r1_overall_level(
--   ARRAY[1,2,3], ARRAY[1,2], 1, 1, 
--   '2024-01-01'::date, '2024-01-31'::date,
--   ARRAY[1,2], ARRAY[3,4], ARRAY[5,6], ARRAY[7,8], ARRAY[9,10], ARRAY[11,12],
--   ARRAY[1,2], ARRAY[3,4], ARRAY[5,6], ARRAY[7,8]
-- );
--
-- Other Functions or procedures Used:
-- * fn_reporting_r1_get_hierarchy_names - Gets hierarchy column names
-- * fn_reporting_r1_get_hierarchy_names_for_json - Gets hierarchy names for JSON output
--
-- Tables Used:
-- * ps_reporting_post_hierarchy_date - Reads actual and forecasted metrics
-- * product_master - Reads product hierarchy information
-- * tb_halo_effect_sitewide_factor_opt - Reads sitewide halo effect factors
-- * tb_halo_effect_department_factor_opt - Reads department halo effect factors
-- * tb_loyalty_app_factor_opt - Reads loyalty and app factors
--
-- Returns:
-- JSON array containing aggregated metrics including:
-- * Sales metrics (actual, forecasted, LY, LW)
-- * Revenue metrics (actual, forecasted, LY, LW)
-- * Margin metrics (actual, forecasted, LY, LW)
-- * Contribution metrics (actual, forecasted, LY, LW)
-- * Performance indicators (ST%, inventory, discount)

DROP FUNCTION if exists price_promo.fn_reporting_r1_overall_level;
CREATE OR REPLACE FUNCTION price_promo.fn_reporting_r1_overall_level(product_hierarchy_levels integer[], store_hierarchy_levels integer[], time_hierarchy_level integer, offer_hierarchy_level integer, _start_date date, _end_date date, _l0_ids integer[] DEFAULT NULL::integer[], _l1_ids integer[] DEFAULT NULL::integer[], _l2_ids integer[] DEFAULT NULL::integer[], _l3_ids integer[] DEFAULT NULL::integer[], _l4_ids integer[] DEFAULT NULL::integer[], _brand_ids integer[] DEFAULT NULL::integer[], _s0_ids integer[] DEFAULT NULL::integer[], _s1_ids integer[] DEFAULT NULL::integer[], _s2_ids integer[] DEFAULT NULL::integer[], _completed_offer_ids integer[] DEFAULT NULL::integer[], for_download boolean DEFAULT false)
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
   
   	final_response json := null;
   	product_columns_as_null text;
   	store_columns_as_null text;
   	date_agg_level_group_query2 text;
   	offer_level_query text;
   	total_fetch_query text;
    date_agg_level_group_query2_without_time_coumn text;
    final_query text;
  	promo_ids_where text := '';
  	json_product_columns text := '';
  	json_store_columns text := '';
  	json_select text := '';
  	json_select_total text := '';
  	final_select text := '';
  	group_by_select text := '';
  	final_order_by text;
  	total_final_select text;
  	total_query_group_by_select text;
BEGIN
    raise notice 'time_column : %, time_column_2: %', time_column, time_column_2;
	-- Generate product columns
    product_columns := price_promo.fn_reporting_r1_get_hierarchy_names(product_hierarchy_levels, 1);
	product_columns_as_null := price_promo.fn_reporting_r1_get_hierarchy_names(product_hierarchy_levels, 1, true);
	json_product_columns := price_promo.fn_reporting_r1_get_hierarchy_names_for_json(product_hierarchy_levels, 1);
    -- Generate store columns
    store_columns := price_promo.fn_reporting_r1_get_hierarchy_names(store_hierarchy_levels, 2);
   	store_columns_as_null := price_promo.fn_reporting_r1_get_hierarchy_names(store_hierarchy_levels, 2, true);
   	json_store_columns := price_promo.fn_reporting_r1_get_hierarchy_names_for_json(store_hierarchy_levels, 2);

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
	if -200 = ANY(product_hierarchy_levels) and -200 = ANY(store_hierarchy_levels) and time_hierarchy_level = -200 THEN
        final_order_by = '';
    else
    	final_order_by = 'ORDER BY ' || final_order_by;
    END IF;
	

	final_group_by := ''|| CASE WHEN product_columns IS NOT NULL AND product_columns <> '' THEN ', ' || product_columns ELSE '' END
	                    || CASE WHEN store_columns IS NOT NULL AND store_columns <> '' THEN ', ' || store_columns ELSE '' END
	                    || CASE WHEN time_column_2 IS NOT NULL AND time_column_2 <> '' THEN ', ' || time_column_2 ELSE '' END;
	
	total_final_select := ''|| CASE WHEN product_columns IS NOT NULL AND product_columns <> '' THEN ', ' || product_columns ELSE '' END
	                    || CASE WHEN store_columns IS NOT NULL AND store_columns <> '' THEN ', ' || store_columns ELSE '' END
	                    || CASE WHEN time_column_2 IS NOT NULL AND time_column_2 <> '' THEN ', null::date as ' || time_column_2 ELSE '' END;

	total_query_group_by_select := ''|| CASE WHEN product_columns IS NOT NULL AND product_columns <> '' THEN ', ' || product_columns ELSE '' END
	                    || CASE WHEN store_columns IS NOT NULL AND store_columns <> '' THEN ', ' || store_columns ELSE '' end;
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

    -- Construct the WHERE condition
    temp_string_where_condition := '';
    -- For l0_ids
    IF array_length(_l0_ids, 1) > 0 THEN
        temp_string_where_condition := temp_string_where_condition || ' AND b.l0_cid IN (' || array_to_string(_l0_ids, ',') || ')';
    END IF;

    -- For l1_ids
    IF array_length(_l1_ids, 1) > 0 THEN
        temp_string_where_condition := temp_string_where_condition || ' AND b.l1_cid IN (' || array_to_string(_l1_ids, ',') || ')';
    END IF;

    -- For l2_ids
    IF array_length(_l2_ids, 1) > 0 THEN
        temp_string_where_condition := temp_string_where_condition || ' AND b.l2_cid IN (' || array_to_string(_l2_ids, ',') || ')';
    END IF;

    -- For l3_ids
    IF array_length(_l3_ids, 1) > 0 THEN
        temp_string_where_condition := temp_string_where_condition || ' AND b.l3_cid IN (' || array_to_string(_l3_ids, ',') || ')';
    END IF;

    -- For l4_ids
    IF array_length(_l4_ids, 1) > 0 THEN
        temp_string_where_condition := temp_string_where_condition || ' AND b.l4_cid IN (' || array_to_string(_l4_ids, ',') || ')';
    END IF;

    -- For brand_ids
    IF array_length(_brand_ids, 1) > 0 THEN
        temp_string_where_condition := temp_string_where_condition || ' AND b.brand_cid IN (' || array_to_string(_brand_ids, ',') || ')';
    END IF;

    -- For s0_ids
    IF array_length(_s0_ids, 1) > 0 THEN
        temp_string_where_condition := temp_string_where_condition || ' AND a.s0_id IN (' || array_to_string(_s0_ids, ',') || ')';
    END IF;

    -- For s1_ids
    IF array_length(_s1_ids, 1) > 0 THEN
        temp_string_where_condition := temp_string_where_condition || ' AND a.s1_id IN (' || array_to_string(_s1_ids, ',') || ')';
    END IF;
   
   	-- For s1_ids
    IF array_length(_s2_ids, 1) > 0 THEN
        temp_string_where_condition := temp_string_where_condition || ' AND a.s2_id IN (' || array_to_string(_s2_ids, ',') || ')';
    END IF;
   
   	

    -- Construct the dynamic SQL query
    --offer_level_query = price_promo.fn_reporting_r1_offer_level_get_query('ps_reporting_post_promo_date', date_agg_level_group_query1, date_agg_level_group_query1, time_column, temp_string_where_condition, final_group_by, _start_date, _end_date);
   	---total_fetch_query = price_promo.fn_reporting_r1_offer_level_get_query('ps_reporting_post_hierarchy_date', date_agg_level_group_query2, date_agg_level_group_query2_without_time_coumn, null::text, temp_string_where_condition, final_group_by, _start_date, _end_date);
   	
   	-- For promo_ids, 
    IF array_length(_completed_offer_ids, 1) > 0 THEN
    	promo_ids_where = format(' AND array[%1$s] && a.promo_id ', array_to_string(_completed_offer_ids, ','));
    END if;
    offer_level_query := '
		WITH date_level_agg AS (
        SELECT 
            ' || date_agg_level_group || ',
            MAX(a.date) OVER (PARTITION BY a.product_id) AS max_date,
            SUM(a.actual_inventory) AS actual_inventory,
            SUM(a.actual_revenue) AS actual_revenue, 
            SUM(a.finalized_revenue) AS finalized_revenue, 
            SUM(a.baseline_revenue) AS baseline_revenue, 
            SUM(a.ly_revenue) AS ly_revenue, 
            SUM(a.lw_revenue) AS lw_revenue, 
            SUM(a.actual_sales_units) AS actual_units,
            SUM(a.finalized_sales_units) AS finalized_units,
            SUM(a.baseline_sales_units) AS baseline_units,
            SUM(a.ly_sales_units) AS ly_units,
            SUM(a.lw_sales_units) AS lw_units,
            SUM(a.actual_margin) AS actual_margin,
            SUM(a.finalized_margin) AS finalized_margin,
            SUM(a.baseline_margin) AS baseline_margin,
            SUM(a.ly_margin) AS ly_margin,
            SUM(a.lw_margin) AS lw_margin,
			SUM(a.actual_contribution_margin) as actual_contribution_margin,
			SUM(a.finalized_contribution_margin) as finalized_contribution_margin,
			SUM(a.actual_contribution_revenue) as actual_contribution_revenue,
			SUM(a.finalized_contribution_revenue) as finalized_contribution_revenue,
			SUM(a.lw_contribution_margin) as lw_contribution_margin,
			SUM(a.lw_contribution_revenue) as lw_contribution_revenue,
			SUM(a.ly_contribution_margin) as ly_contribution_margin,
			SUM(a.ly_contribution_revenue) as ly_contribution_revenue,
			SUM(a.actual_sales_units * a.actual_discount) as actual_weighted_discount
        FROM price_promo.ps_reporting_post_hierarchy_date a 
        INNER JOIN price_promo.product_master b ON a.product_id = b.product_id 
        WHERE a.date BETWEEN ' || quote_literal(_start_date) || ' AND ' || quote_literal(_end_date) ||
        temp_string_where_condition || promo_ids_where || '
        GROUP BY ' || date_agg_level_group || '
    )
    SELECT 
		 ' || final_select || '
        
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
    FROM date_level_agg 
    ' || group_by_select || '';
   	--raise notice 'offer_level_query : %', offer_level_query;
   
   	
   	total_fetch_query := '
		WITH date_level_agg AS (
        SELECT 
            ' || date_agg_level_group_query2 || ',
            MAX(a.date) OVER (PARTITION BY a.product_id) AS max_date,
            SUM(a.actual_inventory) AS actual_inventory,
            SUM(a.actual_revenue) AS actual_revenue, 
            SUM(a.finalized_revenue) AS finalized_revenue, 
            SUM(a.baseline_revenue) AS baseline_revenue, 
            SUM(a.ly_revenue) AS ly_revenue, 
            SUM(a.lw_revenue) AS lw_revenue, 
            SUM(a.actual_sales_units) AS actual_units,
            SUM(a.finalized_sales_units) AS finalized_units,
            SUM(a.baseline_sales_units) AS baseline_units,
            SUM(a.ly_sales_units) AS ly_units,
            SUM(a.lw_sales_units) AS lw_units,
            SUM(a.actual_margin) AS actual_margin,
            SUM(a.finalized_margin) AS finalized_margin,
            SUM(a.baseline_margin) AS baseline_margin,
            SUM(a.ly_margin) AS ly_margin,
            SUM(a.lw_margin) AS lw_margin,
			SUM(a.actual_contribution_margin) as actual_contribution_margin,
			SUM(a.finalized_contribution_margin) as finalized_contribution_margin,
			SUM(a.actual_contribution_revenue) as actual_contribution_revenue,
			SUM(a.finalized_contribution_revenue) as finalized_contribution_revenue,
			SUM(a.lw_contribution_margin) as lw_contribution_margin,
			SUM(a.lw_contribution_revenue) as lw_contribution_revenue,
			SUM(a.ly_contribution_margin) as ly_contribution_margin,
			SUM(a.ly_contribution_revenue) as ly_contribution_revenue,
			SUM(a.actual_sales_units * a.actual_discount) as actual_weighted_discount
        FROM price_promo.ps_reporting_post_hierarchy_date a 
        INNER JOIN price_promo.product_master b ON a.product_id = b.product_id 
        WHERE a.date BETWEEN ' || quote_literal(_start_date) || ' AND ' || quote_literal(_end_date) ||
        temp_string_where_condition || promo_ids_where || '
        GROUP BY ' || date_agg_level_group_query2_without_time_coumn || '
    )
    SELECT 
		 ' || total_final_select || '
        
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
		1 as total
    FROM date_level_agg 
    ' || total_query_group_by_select || '';
    --raise notice 'total_fetch_query : %', total_fetch_query;
   
   
   	raise notice 'json_select : %', json_select;
    raise notice 'json_select_total : %', json_select_total;
   	final_query = '	WITH offer_level_data_cte AS (
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
																		''Var LW Sales $'', round( var_lw_revenue )
																	),
										
										''Sales U'', json_build_object(
																		''Actual Sales U'', round( actual_units ),
																		''Forecasted Sales U'', round( finalized_units ),
																		''Var FC Sales U'', round( var_finalized_units ),
																		''Last Year Sales U'', round( ly_units ),
																		''Var LY Sales U'', round( var_ly_units ),
																		''Last Week Sales U'', round( lw_units ),
																		''Var LW Sales U'', round( var_lw_units )
																	),
										
										''GM $'', json_build_object(
																		''Actual GM $'', round( actual_margin ),
																		''Forecasted GM $'', round( finalized_margin ),
																		''Var FC GM $'', round( var_finalized_margin ),
																		''Last Year GM $'', round( ly_margin ),
																		''Var LY GM $'', round( var_ly_margin ),
																		''Last Week GM $'', round( lw_margin ),
																		''Var LW GM $'', round( var_lw_margin )
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
										
										''Actual ST%'', round( actual_st ),
										''Actual BOP Inventory'', round( actual_inventory ),
										''Actual Discount'', round( actual_discount )
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
 						';
 	--, offer_level_query, total_fetch_query, json_select, json_select_total);
   	raise notice 'final_query : %', final_query;
   
  	--final_query = 'select null::json as result';
   	execute final_query into final_response;
   	return final_response;
END;
$function$
;
