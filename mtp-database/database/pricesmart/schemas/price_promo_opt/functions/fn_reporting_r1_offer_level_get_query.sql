--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:fn_reporting_r1_offer_level_get_query runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: stacking changes for fn_reporting_r1_offer_level_get_query

DROP FUNCTION if exists price_promo_opt.fn_reporting_r1_offer_level_get_query;
CREATE OR REPLACE FUNCTION price_promo_opt.fn_reporting_r1_offer_level_get_query(post_reporting_table_name text, date_agg_level_group1 text, date_agg_level_group2 text, time_column text, temp_string_where_condition text, final_group_by text, _start_date date, _end_date date)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
	final_query text; 
	time_column_ text := '';
BEGIN
    if time_column is not null then 
    	time_column_ = COALESCE(', a.' || time_column, '');
    end if;
   
	final_query := '
		WITH date_level_agg AS (
        SELECT 
            ' || date_agg_level_group1 || ',
            MAX(a.date) OVER (PARTITION BY promo_id' || time_column_ || ') AS max_date,
            SUM(a.actual_inventory) AS actual_inventory,
            SUM(a.actual_revenue) AS actual_revenue, 
            SUM(a.finalized_revenue) AS finalized_revenue, 
            SUM(a.baseline_revenue) AS baseline_revenue, 
            SUM(a.ly_revenue) AS ly_revenue, 
            SUM(a.lw_revenue) AS lw_revenue, 
            SUM(a.actual_units) AS actual_units,
            SUM(a.finalized_units) AS finalized_units,
            SUM(a.baseline_units) AS baseline_units,
            SUM(a.ly_units) AS ly_units,
            SUM(a.lw_units) AS lw_units,
            SUM(a.actual_margin) AS actual_margin,
            SUM(a.finalized_margin) AS finalized_margin,
            SUM(a.baseline_margin) AS baseline_margin,
            SUM(a.ly_margin) AS ly_margin,
            SUM(a.lw_margin) AS lw_margin,
			SUM(a.actual_units * a.actual_discount) as actual_weighted_discount
        FROM price_promo.' || post_reporting_table_name || ' a 
        INNER JOIN price_promo.product_master b ON a.product_id = b.product_id 
        WHERE a.date BETWEEN ' || quote_literal(_start_date) || ' AND ' || quote_literal(_end_date) ||
        temp_string_where_condition || '
        GROUP BY ' || date_agg_level_group2 || '
    )
    SELECT 
		' || final_group_by || ',
        
        SUM(case when date=max_date then actual_inventory else 0 end ) as actual_inventory,
        100 * SUM(actual_units) / SUM(case when date=max_date then actual_inventory else 0 end ) as actual_st,
		sum(actual_weighted_discount) / sum(actual_units) as actual_discount,

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
		END AS var_ly_gm_percent

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
		END AS var_lw_gm_percent

    FROM date_level_agg 
    GROUP BY ' || final_group_by || '';

    -- Print the generated final_query.
    RAISE NOTICE 'final_query : %', final_query;
   	return final_query;
END;
$function$



;