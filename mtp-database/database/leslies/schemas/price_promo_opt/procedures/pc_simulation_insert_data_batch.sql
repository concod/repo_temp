--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:pc_simulation_insert_data_batch runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_simulation_insert_data_batch

DROP PROCEDURE IF EXISTS price_promo_opt.pc_simulation_insert_data_batch ;
CREATE OR REPLACE PROCEDURE price_promo_opt.pc_simulation_insert_data_batch(IN var_promo_id integer, IN var_scenario_id integer, IN var_start_date date, IN var_week_start_date date, IN filter_week_start_date date, IN filter_week_end_date date, IN filter_start_date date, IN filter_end_date date, IN table_name_to_insert character varying, IN table_suffix character varying, IN discount_filter character varying, IN var_stack_flag boolean DEFAULT false)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
DECLARE
    query text;
date_suffix varchar;
BEGIN
--------------------------------------------------
--SET LOCAL work_mem = '256MB';

----------------------------------------------------------
date_suffix := to_char(filter_start_date,'YYYYMMDD');

    query := format(
        'INSERT INTO %1$s (
            promo_id, scenario_id, product_id, 
            recommendation_date, s0_id, offer_type_combined_display_name, store_hierarchy, customer_id,
            discount_level_value, offer_type_id, effective_discount, 
            original_cost, discounted_price, 

			sales_units, baseline_sales_units, incremental_sales_units,
            revenue, contribution_revenue, baseline_revenue, incremental_revenue, 
			margin, baseline_margin, incremental_margin,
			baseline_contribution_margin, contribution_margin, 
			promo_spend, c0_id, s3_id
        )
select 
promo_id, scenario_id, product_id,
date recommendation_date, s0_id, offer_type_combined_display_name, store_hierarchy,  customer_id, 
null::integer as discount_level_value, offer_type_id, effective_discount, cost, discounted_price,
sales_units, baseline_sales_units, (sales_units - baseline_sales_units) as incremental_sales_units,

discounted_price * sales_units AS revenue, 
discounted_price * sales_units AS contribution_revenue, -- same as revenue
(baseline_sales_units * current_price)::float8 AS baseline_revenue,
((sales_units * discounted_price) - (baseline_sales_units * current_price))::float8 AS incremental_revenue, 

(sales_units * (discounted_price - cost))::float8 AS margin,
(baseline_sales_units * (current_price - cost))::float8 AS baseline_margin,
((sales_units * (discounted_price - cost)) - (baseline_sales_units * (current_price - cost)))::float8 AS incremental_margin,

case 
	When s0_id = 1 or s0_id = 2 then (baseline_sales_units * (current_price - cost)) + (rebate* baseline_sales_units * cost)
	when s0_id = 3 or s0_id = 4 then (baseline_sales_units * (current_price - cost - shipping_cost)) + (rebate * baseline_sales_units * cost)
end as baseline_contribution_margin,
case 
	When s0_id = 1 or s0_id = 2 then (sales_units * (discounted_price - cost)) + (rebate* sales_units * cost)
	when s0_id = 3 or s0_id = 4 then (sales_units * (discounted_price - cost - shipping_cost)) + (rebate * sales_units * cost)
end as contribution_margin, 

(sales_units * (current_price - discounted_price)) AS promo_spend,

c0_id, s3_id
from  %2$s_%6$s df 
	    -- WHERE df.date BETWEEN %4$L AND %5$L 
		--and df.baseline_sales_units > 0

		',
        
        -- Format parameters
        table_name_to_insert,  -- %1$s
        discount_filter,       -- %2$s
        table_suffix,          -- %3$s
        filter_start_date,     -- %4$L
        filter_end_date,        -- %5$L
		date_suffix

    );

RAISE NOTICE '%',query;

    EXECUTE query;
END;
$procedure$
;
