--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:pc_simulation_pf_coefficient runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: stacking changes for pc_simulation_pf_coefficient

DROP PROCEDURE if exists price_promo_opt.pc_simulation_pf_coefficient;
CREATE OR REPLACE PROCEDURE price_promo_opt.pc_simulation_pf_coefficient(IN var_promo_id integer, IN var_discount_filter_name character varying, IN var_start_date date, IN var_end_date date, IN arr_scenario_id integer[], IN var_stack_flag boolean DEFAULT false)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$

DECLARE

    query varchar;
BEGIN

   query := format('

        DROP TABLE IF EXISTS price_promo_opt_temp.promo_simulation_pf_coefficient%s_%s_%s;

        CREATE UNLOGGED TABLE price_promo_opt_temp.promo_simulation_pf_coefficient%s_%s_%s AS

        WITH base AS (
             SELECT dd.scenario_id,
                   dd.store_reco_level,
                   dd.customer_reco_level,
                   dd.effective_discount,
                   dd.product_id,
                   %s
			        FROM %s dd
					%s
        )
        , cte_dates AS (
            SELECT b.*,
                   (SELECT array_agg(d)
                    FROM generate_series(b.date - INTERVAL ''7 day'', b.date - INTERVAL ''1 day'', INTERVAL ''1 day'') d
                    WHERE d < b.date) AS lag1_week_dates,
                   (SELECT array_agg(d)
                    FROM generate_series(b.date - INTERVAL ''14 day'', b.date - INTERVAL ''8 day'', INTERVAL ''1 day'') d
                    WHERE d < b.date) AS lag2_week_dates
            FROM base b
        )

        , lag_products AS MATERIALIZED (
            SELECT
                cd.product_id, cd.store_reco_level, cd.customer_reco_level, 
                cd.date, cd.simulation_week_start_date,
                cd.effective_discount,
                lag1_week_dates, lag2_week_dates,
                fin.sales_units as lag_sales_units, fin.recommendation_date,
                fin.effective_discount AS lag_effective_discount,
                CASE 
                    WHEN fin.recommendation_date = ANY(cd.lag1_week_dates) THEN 1
                    WHEN fin.recommendation_date = ANY(cd.lag2_week_dates) THEN 2
                END AS lag_week_number
            FROM cte_dates cd 
            INNER JOIN 
				(
					 select distinct product_id, recommendation_date, sales_units, effective_discount 
					 from price_promo.ps_recommended_finalized_stack fin
					 where recommendation_date between %L and %L
				) fin
	           ON fin.product_id = cd.product_id		   
	           AND (fin.recommendation_date = ANY(cd.lag1_week_dates) OR fin.recommendation_date = ANY(cd.lag2_week_dates))
	           AND (fin.effective_discount > cd.effective_discount)
        )

            SELECT product_id, date, effective_discount, 
				   lag_week_number, lag_sales_units, recommendation_date as lag_date,
                   lag_effective_discount, (lag_effective_discount * multiplier * 0.01) as lag_units
            FROM lag_products lp

            INNER JOIN price_promo_opt.tb_pullforward_coefficient_opt pf
                USING (product_id, lag_week_number)

            WHERE lag_effective_discount > effective_discount
        ;
        CREATE INDEX IDX_promo_simulation_pf_coefficient%s_%s_%s
        ON price_promo_opt_temp.promo_simulation_pf_coefficient%s_%s_%s
        USING btree (product_id, date);

    ',
        -- placeholders for DROP/CREATE table
		case when var_stack_flag then '_stack' else '' END,
        var_promo_id, array_to_string(arr_scenario_id, '_'),
		case when var_stack_flag then '_stack' else '' END,
        var_promo_id, array_to_string(arr_scenario_id, '_'),
        -- base CTE params
		case when var_stack_flag then 'week_start_date as simulation_week_start_date,date' else 'fdm.simulation_week_start_date,fdm.date' END,
		var_discount_filter_name,
		case when var_stack_flag 
				then ''
				else format('cross join 
					(select distinct simulation_week_start_date, date 
					from global.tb_fiscal_date_mapping 
					where date between %L and %L) fdm',var_start_date, var_end_date)
		END, 
        -- WHERE clause date range
        var_start_date - 14, var_start_date - 1,
        -- index names
		case when var_stack_flag then '_stack' else '' END,
        var_promo_id, array_to_string(arr_scenario_id, '_'),
		case when var_stack_flag then '_stack' else '' END,
        var_promo_id, array_to_string(arr_scenario_id, '_')
    );

 -- Print the query

    RAISE NOTICE '%', query;



    -- Execute the query

    EXECUTE query;


END;
$procedure$
;

