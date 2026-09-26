--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:pc_simulation_create_discount_filter runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_simulation_create_discount_filter

DROP PROCEDURE IF EXISTS price_promo_opt.pc_simulation_create_discount_filter ;
CREATE OR REPLACE PROCEDURE price_promo_opt.pc_simulation_create_discount_filter(IN var_promo_id integer, IN var_scenario_id integer, IN var_scenario_order_id integer, IN var_stack_flag boolean DEFAULT false, IN var_is_intercept boolean DEFAULT false, IN var_is_entire_refresh boolean DEFAULT true, IN pccd_table character varying DEFAULT NULL::character varying)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$

DECLARE
    temp_table_name varchar := format('price_promo_opt_temp.promo_scenario_discount_filter_%s_%s', var_promo_id, var_scenario_id);
	temp_table_name_stack varchar := format('price_promo_opt_temp.scenario_disc_filter_date_stack_%s_%s', var_promo_id, var_scenario_id);
	table_suffix varchar := format('%s_%s',var_promo_id, var_scenario_id); query text;
    query1 text; query2 text; query3 text; query4 text; query5 text; query_final text; query3_others text; query3_kit text; offer_type text;
	discount_filter_name text; discount_filter_name_2 text; arr_scenario_id integer[] := ARRAY[var_scenario_id];query2_tmp_simulation text;
	query2_tmp_day_split_ratio text; query2_tmp_day_split_ratio_index text; query2_tmp_store_split_ratio text; 
	query2_tmp_store_split_ratio_index text; query3_fq text; buy_qty int4; query3_bxgy text; 
	query3_txn text; min_basket_value float; offer_value float; offer_y_type text;order_id int4; ia_scenario_id int4;
	tier_type1 text; disc_value float; slot_count int4; customer_category text; residential_type int2; max_week_start_date date;
    max_week_end_date date; promo_start_date date; promo_end_date date; query2_index_base text; kit_id int4;
    start_time timestamp; end_time timestamp; bxgy_disc_value int2; psd_bxgy_id int4; final_stack_table_name text;


BEGIN


--------------------------------------------------
--SET LOCAL work_mem = '256MB';

----------------------------------------------------------

----------------------------------------------------------

RAISE NOTICE 'Before enable_nestloop=%', current_setting('enable_nestloop', true);
--PERFORM set_config('enable_nestloop', 'off', true);
SET LOCAL enable_nestloop to off;
RAISE NOTICE 'enable_nestloop=%', current_setting('enable_nestloop', true);


---------------------------------------------------------------------------------


---------------------------------------------------------------------------------



select start_date, end_date 
into promo_start_date, promo_end_date
from price_promo.promo_master 
where promo_id = var_promo_id 
limit 1;  


-- Get max week start and end dates
SELECT fdm1.weeks_start_date, fdm2.weeks_start_date
INTO max_week_start_date, max_week_end_date
FROM price_promo.promo_master pm
JOIN global.tb_fiscal_date_mapping fdm1 ON pm.start_date = fdm1.date_id
JOIN global.tb_fiscal_date_mapping fdm2 ON pm.end_date = fdm2.date_id
WHERE pm.promo_id = var_promo_id;

------------------------------------------------------------------------



-- Check if the customer_selection type = residential 
-- if residential check what was the drop down value selected in step-2 of offer creation

SELECT CASE 
           WHEN COUNT(DISTINCT cm.c0_id) = 1 
                AND MIN(cm.c0_id) = 1 
           THEN 'residential_only'
           ELSE 'not_residential_only'
       END
INTO customer_category
FROM price_promo.tb_promo_customers tpc
JOIN global.customer_master cm 
    ON tpc.customer_id = cm.c2_id
WHERE tpc.promo_id = var_promo_id;



    IF customer_category = 'residential_only' THEN
        SELECT coalesce(pr.residential_sub_customer_type_id, 0)
        INTO residential_type
        FROM price_promo.ps_rules pr 
        WHERE promo_id = var_promo_id 
        LIMIT 1;
    END IF;

    IF customer_category = 'not_residential_only' THEN
        SELECT 0
        INTO residential_type;
    END IF;

----------------------------------------------------------

-- If var_stack_flag is false, then we are starting from the beginning.
-- This means we need to ultimately create the promo_scenario_discount_filter table

IF NOT var_stack_flag OR var_is_intercept  THEN

    SELECT DISTINCT NULLIF(json_element.value->>'offer_type', 'null')
    INTO offer_type
    FROM price_promo.ps_scenario_discounts psd
    CROSS JOIN LATERAL jsonb_each(psd.scenario_data) AS json_element
    WHERE psd.promo_id = var_promo_id
      AND NULLIF(json_element.value->>'scenario_id', 'null')::int = var_scenario_id
    LIMIT 1;


	SELECT scenario_order_id  
	INTO order_id 
	FROM price_promo.scenario_master
	WHERE promo_id = var_promo_id 
	  AND scenario_id = var_scenario_id;


------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

-- if scenario id is not null then it means this is a simulation 
-- the scenario_id in the function call is the actual scenario_id of the simulation

if var_scenario_order_id is not null then 


-- call price_promo_opt.pc_psdf_simflow_create_base_1(temp_table_name, )


start_time := clock_timestamp();

query1 := format(
$query$
DROP TABLE IF EXISTS %s_base;  -- table name
CREATE UNLOGGED TABLE %s_base AS  -- table name

select df.*
FROM 
(select *, concat(s0_id,'_', s3_id) store_hierarchy from price_promo_opt_temp.promo_product_filter_resim_%s_%s) df
%s

$query$,
    temp_table_name,        -- 1
    temp_table_name,        -- 2
    var_promo_id,           -- 5
    var_scenario_id ,        -- 8
CASE WHEN pccd_table IS NOT NULL 
THEN format('INNER JOIN (select distinct product_id, store_hierarchy::VARCHAR AS store_hierarchy, 
customer_id::INTEGER AS customer_id from %s) pccd
USING(product_id, store_hierarchy,customer_id)', pccd_table) ELSE '' END

);

RAISE NOTICE 'Query : %',query1;
execute query1;

end_time := clock_timestamp();
RAISE NOTICE 'Time taken _base table : %', end_time - start_time;


start_time := clock_timestamp();

EXECUTE format('DROP INDEX IF EXISTS idx_sim_base_%s', table_suffix);
EXECUTE format('DROP INDEX IF EXISTS idx_sim_base_%s_2', table_suffix);

EXECUTE format('CREATE INDEX idx_sim_base_%s ON %s_base (product_id, s0_id, s3_id, c0_id, customer_id)',
               table_suffix, temp_table_name);
EXECUTE format('CREATE INDEX idx_sim_base_%s_2 ON %s_base (l0_cid, l1_cid, l2_cid, l3_cid, s0_id, s3_id, c0_id, customer_id)',
               table_suffix, temp_table_name);

RAISE NOTICE 'Indexes created for _base table '; 

end_time := clock_timestamp();
RAISE NOTICE 'Time taken _base table indexes creation : %', end_time - start_time;

-- if the scenario_order_id is null then this is optimization
-- we donot have the scenario ddata and we need to get the from ps_scenario_discounts table to create the temp tables correctly. 
-- because the temp table needs to have a suffix of promoid_scenarioid

----------------------------------------------------------
else  -- if scenario Order id is null 

    SELECT DISTINCT NULLIF(json_element.value->>'scenario_id', 'null')
    INTO ia_scenario_id
    FROM price_promo.ps_scenario_discounts psd
    CROSS JOIN LATERAL jsonb_each(psd.ia_recommended_data) AS json_element
    WHERE psd.promo_id = var_promo_id
    LIMIT 1;

query1 := format(
$query$
DROP TABLE IF EXISTS %s_base;  -- table name
CREATE UNLOGGED TABLE %s_base AS  -- table name

WITH 

coupon_data AS (
				SELECT
				    MAX(CASE WHEN attribute_id = 6 THEN attribute_value END) AS attribute_value,
				    MAX(CASE WHEN attribute_id = 8 THEN NULLIF(attribute_value, '')::float END) AS audience_planned,
				    MAX(CASE WHEN attribute_id = 9 THEN NULLIF(attribute_value, '')::float END) AS expected_response_rate
				FROM (
				    SELECT attribute_id, fe_display_name, attribute_value
				    FROM price_promo.event_attribute_mapping eam 
				    JOIN price_promo.attribute_master am ON eam.attribute_id = am.id 
				    WHERE event_id IN (
				        SELECT event_id FROM price_promo.promo_master WHERE promo_id = %s
				    )
				    AND attribute_id IN (6, 8, 9)
				) foo
),


customers AS (
    SELECT tpc.customer_id, cm.c0_id
    FROM price_promo.tb_promo_customers tpc
    JOIN global.customer_master cm ON tpc.customer_id = cm.c2_id
    WHERE tpc.promo_id = %s
),

ia_discounts AS (
                SELECT 
                    psd.promo_id,
                    json_element.key::int AS scenario_key,
                    NULLIF(json_element.value->>'tier_id', 'null')::int AS tier_id,
                    NULLIF(json_element.value->>'created_at', 'null')::timestamp AS created_at,
                    NULLIF(json_element.value->>'created_by', 'null')::int AS created_by,
                    NULLIF(json_element.value->>'offer_type', 'null') AS offer_type,
                    NULLIF(json_element.value->>'scenario_id', 'null')::int AS scenario_id,
                    NULLIF(json_element.value->>'offer_x_type', 'null') AS offer_x_type,
                    NULLIF(json_element.value->>'offer_y_type', 'null') AS offer_y_type,
                    NULLIF(json_element.value->>'offer_z_type', 'null') AS offer_z_type,
                    NULLIF(json_element.value->>'offer_type_id', 'null')::int AS offer_type_id,
                    NULLIF(json_element.value->>'offer_x_value', 'null')::float AS offer_x_value,
                    NULLIF(json_element.value->>'offer_y_value', 'null')::float AS offer_y_value,
                    NULLIF(json_element.value->>'offer_z_value', 'null')::float AS offer_z_value,
                    NULLIF(json_element.value->>'scenario_type', 'null') AS scenario_type,
                    NULLIF(json_element.value->>'scenario_order_id', 'null')::int AS scenario_order_id,
                    NULLIF(json_element.value->>'qty', 'null')::int AS qty,
                    NULLIF(json_element.value->>'min_basket_value', 'null')::int AS min_basket_value
                FROM price_promo.ps_scenario_discounts psd
                CROSS JOIN LATERAL jsonb_each(psd.ia_recommended_data) AS json_element
                WHERE psd.promo_id = %s 
				AND NULLIF(json_element.value->>'scenario_order_id', 'null')::int = 0
            ),

store_segments AS (
	SELECT DISTINCT sm.s0_id, sm.s3_id
	FROM price_promo.fn_fetch_stores_for_promo(%s) fsp
	JOIN global.tb_store_master sm ON sm.store_id = fsp.store_id
)

select df.*

from 
(
select psd.promo_id, psd.scenario_id, psd.offer_type_id, psd.offer_type, 
p.product_id, p.l0_cid, p.l1_cid, p.l2_cid, p.l3_cid, p.current_price, p.cost,
coalesce(p.shipping_cost,0) as shipping_cost, coalesce(p.rebate,0) as rebate, cd.*,
--d.recommendation_date, d.week_start_date, d.phase,
c.c0_id, c.customer_id,  
p.s0_id, p.s3_id,
LEAST(
                    GREATEST(
                        CASE
                            WHEN psd.offer_type IN ('percent_off', 'upto_x_percent_off') THEN psd.offer_x_value
                            WHEN psd.offer_type = 'extra_amount_off' THEN ((psd.offer_x_value / NULLIF (current_price,0)) * 100)
                            WHEN psd.offer_type = 'fixed_price' THEN ((current_price - psd.offer_x_value) / NULLIF (current_price,0)) * 100
                            WHEN psd.offer_type = 'bxgx' AND psd.offer_x_type = 'unit' AND psd.offer_y_type = 'unit' THEN (psd.offer_y_value*100)/ (psd.offer_x_value + psd.offer_y_value)
                            WHEN psd.offer_type = 'bxgx_percent_off' AND psd.offer_x_type = 'unit' AND psd.offer_y_type = 'unit' 
							THEN ( (psd.offer_y_value*psd.offer_z_value)/ (psd.offer_x_value + psd.offer_y_value) ) * 100
							WHEN psd.offer_type = 'bmsm_fixed_quantity' AND psd.offer_x_type = 'unit' AND psd.offer_y_type = 'percent_off'
							THEN (psd.offer_y_value)
							WHEN psd.offer_type = 'bmsm_fixed_quantity' AND psd.offer_x_type = 'unit' AND psd.offer_y_type = 'dollar_off'
							THEN (psd.offer_y_value / (psd.offer_x_value * current_price)) * 100
							WHEN psd.offer_type = 'bmsm_fixed_quantity' AND psd.offer_x_type = 'unit' AND psd.offer_y_type = 'at_dollar'
							THEN ((current_price - (psd.offer_y_value / psd.offer_x_value)) / NULLIF (current_price,0)) * 100
							WHEN psd.offer_type = 'bmsm_transaction_discount' AND psd.offer_x_type = 'dollar' AND psd.offer_y_type = 'percent_off'
							THEN psd.offer_y_value
							WHEN psd.offer_type = 'bmsm_transaction_discount' AND psd.offer_x_type = 'dollar' AND psd.offer_y_type = 'dollar_off'
							THEN (psd.offer_y_value / psd.offer_x_value) * 100

							ELSE 0
                        END,
                    0),
                100
                ) AS calculated_discount,
				p.offer_type_combined_display_name
FROM 
(
select distinct pf.product_id, pf.l0_cid, pf.l1_cid, pf.l2_cid, pf.l3_cid, pdm.cost,
pdm.shipping_cost, pdm.rebate, s.s0_id, s.s3_id,
                CASE
                    WHEN s.s0_id = 1 THEN COALESCE(pdm.current_bnm_price, pdm.current_price)
                    WHEN s.s0_id = 2 THEN COALESCE(pdm.current_comm_price, pdm.current_price)
                    WHEN s.s0_id = 3 THEN COALESCE(pdm.current_ecom_its_price, pdm.current_price)
                    WHEN s.s0_id = 4 THEN COALESCE(pdm.current_ecom_lesl_price, pdm.current_price)
                    ELSE pdm.current_price
                END AS current_price,
				pf.offer_type_combined_display_name
from price_promo_opt_temp.promo_product_filter_resim_%s_%s  pf
inner join price_promo.product_master pdm on pf.product_id = pdm.product_id
cross join store_segments s
) p 
CROSS JOIN customers c
cross join ia_discounts psd
LEFT JOIN coupon_data cd on 1=1
) df
inner join global.customer_channel_master ccm on df.c0_id = ccm.c0_id and df.s0_id = ccm.s0_id 


$query$,
temp_table_name, temp_table_name, 
var_promo_id, var_promo_id, var_promo_id,
var_promo_id,var_promo_id,var_promo_id

);

RAISE NOTICE 'Query : %',query1;
execute query1;

-- create indexes 

EXECUTE format('DROP INDEX IF EXISTS idx_sim_base_%s', table_suffix);
EXECUTE format('DROP INDEX IF EXISTS idx_sim_base_%s_2', table_suffix);
EXECUTE format('CREATE INDEX idx_sim_base_%s ON %s_base (product_id, s0_id, c0_id, customer_id)',
               table_suffix, temp_table_name);
EXECUTE format('CREATE INDEX idx_sim_base_%s_2 ON %s_base (l0_cid, l1_cid, l2_cid, l3_cid, s0_id, c0_id)',
               table_suffix, temp_table_name);



end if;  -- var_scenario_order_id is null condition for creating _base table ends here. 

--------------------------------------------------------------------------------------------------------------------------------------
-- after this step, we have the same exact table format be it a simulation or optimization.
-- From now on they will go through the same flow
-- we get the baseline_sales, day_spli and store_split in 3 separate tables and then join them to form _forecast table. 

-- Getting the weekly baseline_sales data from sim_week_opt table. 


call price_promo_opt.pc_psdf_create_sim(temp_table_name, max_week_start_date, max_week_end_date);


---- Create index separately
start_time := clock_timestamp();

EXECUTE format('DROP INDEX IF EXISTS idx_sim_tmp_simulation_%s', table_suffix);

EXECUTE format('CREATE INDEX idx_sim_tmp_simulation_%s ON %s_tmp_simulation (product_id)',
               table_suffix, temp_table_name);

end_time := clock_timestamp();
RAISE NOTICE 'Time taken _tmp_simulation table indexes creation : %', end_time - start_time;
------------------------------------------------------------------------



------------------------------------------------------------------------------

-- Getting the day_split_ratio


call price_promo_opt.pc_psdf_create_daysplit(temp_table_name,  
promo_start_date, promo_end_date, table_suffix);


start_time := clock_timestamp();

EXECUTE format('DROP INDEX IF EXISTS idx_sim_tmp_day_split_ratio_%s', table_suffix);

EXECUTE format('CREATE INDEX idx_sim_tmp_day_split_ratio_%s ON %s_tmp_day_split_ratio (product_id, 
				 recommendation_date, s0_id, c0_id)',
               table_suffix, temp_table_name);

end_time := clock_timestamp();
RAISE NOTICE 'Time taken _tmp_day_split table indexes creation : %', end_time - start_time;

---------------------------------------------------------------------------------------------------------------------------------

-- Getting the store_split_ratio

call price_promo_opt.pc_psdf_create_storesplit(temp_table_name, var_promo_id,
max_week_start_date, max_week_end_date);

start_time := clock_timestamp();

EXECUTE format('DROP INDEX IF EXISTS idx_sim_tmp_store_split_ratio_%s', table_suffix);

EXECUTE format('CREATE INDEX idx_sim_tmp_store_split_ratio_%s ON %s_tmp_store_split_ratio (product_id, 
				 week_start_date, s0_id, s3_id, c0_id)',
               table_suffix, temp_table_name);

end_time := clock_timestamp();
RAISE NOTICE 'Time taken _tmp_store_split table indexes creation: %', end_time - start_time;
---------------------------------------------------------------------------------------------------------------------------------

-- We have all the 3 tables and baseline, day_split and store_split values in 3 separate tables. 
-- Now we join them together to make a unique _forecast table which has all the info


-- for simulation flow and simple offers --forecast table is the same as final table
-- for opt flow forecast table is the same as the final table fro simple offers. 

--So if it is a simple offer, i can directly create the 

if var_scenario_order_id is null then 

--make the forecast table same as the final table. there is no need for another phase table 
start_time := clock_timestamp();

query2 := format(
$sql$

DROP TABLE IF EXISTS %s;
CREATE UNLOGGED TABLE %s AS
SELECT
    promo_id,
    scenario_id,
    product_id,
    sim_df.l0_cid,
    sim_df.l1_cid,
    sim_df.l2_cid,
    sim_df.l3_cid,
    s0_id,
    s3_id,
    CONCAT(s0_id, '_', s3_id) AS store_hierarchy,
    customer_id,
    c0_id,
    dsplit.recommendation_date AS date,
    dsplit.recommendation_date,
    dsplit.phase,
    week_start_date,
    offer_type_id,
    offer_type,
    c0_id AS customer_type,
    calculated_discount,
	sim_df.offer_type_combined_display_name,


    -- baseline sales derived directly from sim + splits
    baseline_sales_units * dsplit.day_split_ratio * ssplit.store_split_ratio AS baseline_sales_units,
--    baseline_sales_units AS baseline_sales_units,

    -- elasticity used in further calculations
    elasticity,
    cost,
    cost AS original_cost,
    current_price,

    -- effective_discount and discounted_price (phase_multiplier = 1)
    (1 * (
        (baseline_sales_units * dsplit.day_split_ratio * ssplit.store_split_ratio) *
        (0.01 * calculated_discount) * elasticity
     )) / NULLIF(elasticity * (
        baseline_sales_units * dsplit.day_split_ratio * ssplit.store_split_ratio
     ) * 0.01, 0) AS effective_discount,

    current_price * (100 - (
        (1 * (
            (baseline_sales_units * dsplit.day_split_ratio * ssplit.store_split_ratio) *
            (0.01 * calculated_discount) * elasticity
        )) / NULLIF(elasticity * (
            baseline_sales_units * dsplit.day_split_ratio * ssplit.store_split_ratio
        ) * 0.01, 0)
    )) * 0.01 AS discounted_price,

    -- sales units (baseline + incremental*redemptions)
    (baseline_sales_units * dsplit.day_split_ratio * ssplit.store_split_ratio) +
    (
        (baseline_sales_units * dsplit.day_split_ratio * ssplit.store_split_ratio) *
        (0.01 * calculated_discount) * elasticity * %s * %s * 0.01
    ) AS sales_units,

    rebate,
    shipping_cost,
%s as coupon_redemption_percentage,
%s as residential_customer_redemption
FROM 
(select df.*, week_start_date, elasticity, baseline_sales_units from %s_base df
INNER JOIN %s_tmp_simulation sim
using(product_id, s0_id, customer_id) ) sim_df
INNER JOIN %s_tmp_store_split_ratio ssplit
   using(product_id,week_start_date, c0_id,s0_id, s3_id)
INNER JOIN %s_tmp_day_split_ratio dsplit
    using(product_id,week_start_date, c0_id,s0_id)


$sql$, 
temp_table_name, temp_table_name,

'CASE 
    WHEN attribute_value = ''bar-coded'' THEN 
        CASE 
            WHEN unique_coupon_cust > 0 and ((expected_response_rate *audience_planned * 0.01) / NULLIF(unique_coupon_cust, 0)) * coupon_rev_proportion < 100 THEN 
                ((expected_response_rate *audience_planned * 0.01) / NULLIF(unique_coupon_cust, 0)) * coupon_rev_proportion
            WHEN unique_coupon_cust > 0 and ((expected_response_rate *audience_planned * 0.01) / NULLIF(unique_coupon_cust, 0)) * coupon_rev_proportion > 100 THEN 
				100
            WHEN coupon_rev_proportion > 0 THEN 
                coupon_rev_proportion
            ELSE 
                5
        END
    ELSE 100
END',


 -- Residential customer redemption expression
format(
    'CASE 
        WHEN %s = 2 THEN COALESCE((
            SELECT txn_redemption
            FROM price_promo.tb_accublue_redemption tar
            WHERE tar.phase = dsplit.phase 
              AND tar.s3_id = sim_df.s3_id 
              AND tar.l0_cid = sim_df.l0_cid
--              AND tar.fiscal_year = EXTRACT(YEAR FROM dsplit.recommendation_date)
        ), 1)
        WHEN %s = 3 THEN COALESCE((
            SELECT txn_redemption
            FROM price_promo.tb_military_redemption tar
            WHERE tar.phase = dsplit.phase 
              AND tar.s3_id = sim_df.s3_id 
              AND tar.l0_cid = sim_df.l0_cid
--              AND tar.fiscal_year = EXTRACT(YEAR FROM dsplit.recommendation_date)
        ), 1)
        ELSE 1
     END', residential_type, residential_type
),


'CASE 
    WHEN attribute_value = ''bar-coded'' THEN 
        CASE 
            WHEN unique_coupon_cust > 0 and ((expected_response_rate *audience_planned * 0.01) / NULLIF(unique_coupon_cust, 0)) * coupon_rev_proportion < 100 THEN 
                ((expected_response_rate *audience_planned * 0.01) / NULLIF(unique_coupon_cust, 0)) * coupon_rev_proportion
            WHEN unique_coupon_cust > 0 and ((expected_response_rate *audience_planned * 0.01) / NULLIF(unique_coupon_cust, 0)) * coupon_rev_proportion > 100 THEN 
				100
            WHEN coupon_rev_proportion > 0 THEN 
                coupon_rev_proportion
            ELSE 
                5
        END
    ELSE 100
END',


 -- Residential customer redemption expression
format(
    'CASE 
        WHEN %s = 2 THEN COALESCE((
            SELECT txn_redemption
            FROM price_promo.tb_accublue_redemption tar
            WHERE tar.phase = dsplit.phase 
              AND tar.s3_id = sim_df.s3_id 
              AND tar.l0_cid = sim_df.l0_cid
--              AND tar.fiscal_year = EXTRACT(YEAR FROM dsplit.recommendation_date)
        ), 1)
        WHEN %s = 3 THEN COALESCE((
            SELECT txn_redemption
            FROM price_promo.tb_military_redemption tar
            WHERE tar.phase = dsplit.phase 
              AND tar.s3_id = sim_df.s3_id 
              AND tar.l0_cid = sim_df.l0_cid
--              AND tar.fiscal_year = EXTRACT(YEAR FROM dsplit.recommendation_date)
        ), 1)
        ELSE 1
     END', residential_type, residential_type
),

temp_table_name, temp_table_name,  temp_table_name,  temp_table_name 

);

RAISE NOTICE 'Query Forecast: %', query2;
EXECUTE query2; 



end if; -- end of the var_scenario_order_id is null condition
-------------------------------------------------------------------------------------------------------------------------------------------------

if var_scenario_order_id is not null then 

start_time := clock_timestamp();

-----------------------
	if offer_type = 'percent_off' or offer_type = 'extra_amount_off' or offer_type = 'fixed_price' then 
		
	query2 := format(
		$sql$

		DROP TABLE IF EXISTS %s;
		CREATE UNLOGGED TABLE %s AS
		
		SELECT
		    promo_id,
		    scenario_id,
		    product_id,
		    sim_df.l0_cid,
		    sim_df.l1_cid,
		    sim_df.l2_cid,
		    sim_df.l3_cid,
		    s0_id,
		    s3_id,
		    CONCAT(s0_id, '_', s3_id) AS store_hierarchy,
		    customer_id,
		    c0_id,
		    dsplit.recommendation_date AS date,
		    dsplit.recommendation_date,
		    dsplit.phase,
		    week_start_date,
		    offer_type_id,
		    offer_type,
		    c0_id AS customer_type,
		    calculated_discount,
			sim_df.offer_type_combined_display_name,


		    -- baseline sales derived directly from sim + splits
		    baseline_sales_units * dsplit.day_split_ratio * ssplit.store_split_ratio AS baseline_sales_units,
		--    baseline_sales_units AS baseline_sales_units,
		
		    -- elasticity used in further calculations
		    elasticity,
		    cost,
		    cost AS original_cost,
		    current_price,
		
		    -- effective_discount and discounted_price (phase_multiplier = 1)
		    (1 * (
		        (baseline_sales_units * dsplit.day_split_ratio * ssplit.store_split_ratio) *
		        (0.01 * calculated_discount) * elasticity
		     )) / NULLIF(elasticity * (
		        baseline_sales_units * dsplit.day_split_ratio * ssplit.store_split_ratio
		     ) * 0.01, 0) AS effective_discount,
		
		    current_price * (100 - (
		        (1 * (
		            (baseline_sales_units * dsplit.day_split_ratio * ssplit.store_split_ratio) *
		            (0.01 * calculated_discount) * elasticity
		        )) / NULLIF(elasticity * (
		            baseline_sales_units * dsplit.day_split_ratio * ssplit.store_split_ratio
		        ) * 0.01, 0)
		    )) * 0.01 AS discounted_price,
		
		    -- sales units (baseline + incremental)
		    (baseline_sales_units * dsplit.day_split_ratio * ssplit.store_split_ratio) +
		    (
		        (baseline_sales_units * dsplit.day_split_ratio * ssplit.store_split_ratio) *
		        (0.01 * calculated_discount) * elasticity * %s * %s * 0.01
		    ) AS sales_units,
		
		    rebate,
		    shipping_cost,
%s as coupon_redemption_percentage,
%s as residential_customer_redemption
FROM 
(select df.*, week_start_date, elasticity, baseline_sales_units from %s_base df
INNER JOIN %s_tmp_simulation sim
using(product_id, s0_id, customer_id) ) sim_df
INNER JOIN %s_tmp_store_split_ratio ssplit
   using(product_id,week_start_date, c0_id,s0_id, s3_id)
INNER JOIN %s_tmp_day_split_ratio dsplit
    using(product_id,week_start_date, c0_id,s0_id)


$sql$, 
temp_table_name, temp_table_name,


'CASE 
    WHEN attribute_value = ''bar-coded'' THEN 
        CASE 
            WHEN unique_coupon_cust > 0 and ((expected_response_rate *audience_planned * 0.01) / NULLIF(unique_coupon_cust, 0)) * coupon_rev_proportion < 100 THEN 
                ((expected_response_rate *audience_planned * 0.01) / NULLIF(unique_coupon_cust, 0)) * coupon_rev_proportion
            WHEN unique_coupon_cust > 0 and ((expected_response_rate *audience_planned * 0.01) / NULLIF(unique_coupon_cust, 0)) * coupon_rev_proportion > 100 THEN 
				100
            WHEN coupon_rev_proportion > 0 THEN 
                coupon_rev_proportion
            ELSE 
                5
        END
    ELSE 100
END',


 -- Residential customer redemption expression
format(
    'CASE 
        WHEN %s = 2 THEN COALESCE((
            SELECT txn_redemption
            FROM price_promo.tb_accublue_redemption tar
            WHERE tar.phase = dsplit.phase 
              AND tar.s3_id = sim_df.s3_id 
              AND tar.l0_cid = sim_df.l0_cid
--              AND tar.fiscal_year = EXTRACT(YEAR FROM dsplit.recommendation_date)
        ), 1)
        WHEN %s = 3 THEN COALESCE((
            SELECT txn_redemption
            FROM price_promo.tb_military_redemption tar
            WHERE tar.phase = dsplit.phase 
              AND tar.s3_id = sim_df.s3_id 
              AND tar.l0_cid = sim_df.l0_cid
--              AND tar.fiscal_year = EXTRACT(YEAR FROM dsplit.recommendation_date)
        ), 1)
        ELSE 1
     END', residential_type, residential_type
),

'CASE 
    WHEN attribute_value = ''bar-coded'' THEN 
        CASE 
            WHEN unique_coupon_cust > 0 and ((expected_response_rate *audience_planned * 0.01) / NULLIF(unique_coupon_cust, 0)) * coupon_rev_proportion < 100 THEN 
                ((expected_response_rate *audience_planned * 0.01) / NULLIF(unique_coupon_cust, 0)) * coupon_rev_proportion
            WHEN unique_coupon_cust > 0 and ((expected_response_rate *audience_planned * 0.01) / NULLIF(unique_coupon_cust, 0)) * coupon_rev_proportion > 100 THEN 
				100
            WHEN coupon_rev_proportion > 0 THEN 
                coupon_rev_proportion
            ELSE 
                5
        END
    ELSE 100
END',


 -- Residential customer redemption expression
format(
    'CASE 
        WHEN %s = 2 THEN COALESCE((
            SELECT txn_redemption
            FROM price_promo.tb_accublue_redemption tar
            WHERE tar.phase = dsplit.phase 
              AND tar.s3_id = sim_df.s3_id 
              AND tar.l0_cid = sim_df.l0_cid
--              AND tar.fiscal_year = EXTRACT(YEAR FROM dsplit.recommendation_date)
        ), 1)
        WHEN %s = 3 THEN COALESCE((
            SELECT txn_redemption
            FROM price_promo.tb_military_redemption tar
            WHERE tar.phase = dsplit.phase 
              AND tar.s3_id = sim_df.s3_id 
              AND tar.l0_cid = sim_df.l0_cid
--              AND tar.fiscal_year = EXTRACT(YEAR FROM dsplit.recommendation_date)
        ), 1)
        ELSE 1
     END', residential_type, residential_type
),

temp_table_name, temp_table_name,  temp_table_name,  temp_table_name 

);
	
		RAISE NOTICE 'Query Forecast: %', query2;
		EXECUTE query2; 

-----------------------

	else -- if offer_type is not a simple offer then create a forecast table. 
		query2 := format(
		$sql$
		
		DROP TABLE IF EXISTS %s_forecast;
		CREATE UNLOGGED TABLE %s_forecast AS
		
		SELECT
		    sim_df.*,
			dsplit.recommendation_date,
			dsplit.recommendation_date as date,
			dsplit.phase,
		    dsplit.day_split_ratio,
		    ssplit.store_split_ratio,
		    baseline_sales_units * dsplit.day_split_ratio * ssplit.store_split_ratio AS baseline_sales,
		    current_price * (1 - (calculated_discount * 0.01)) AS calculated_effective_price,
		
			(baseline_sales_units * dsplit.day_split_ratio * ssplit.store_split_ratio) + 
			((baseline_sales_units * dsplit.day_split_ratio * ssplit.store_split_ratio) * 
			(0.01*calculated_discount) * elasticity) as calculated_sales,
		
			((baseline_sales_units * dsplit.day_split_ratio * ssplit.store_split_ratio) * 
			(0.01*calculated_discount) * elasticity) as calculated_incremental_without_coupon,
		
		
			((baseline_sales_units * dsplit.day_split_ratio * ssplit.store_split_ratio) * 
			(0.01*calculated_discount) * elasticity) * 
			%s --coupon_redemption_percentage 
			* 0.01 * 
			%s --residential_customer_redemption 
			as calculated_incremental

FROM 
(select df.*, week_start_date, elasticity, baseline_sales_units from %s_base df
INNER JOIN %s_tmp_simulation sim
using(product_id, s0_id, customer_id) ) sim_df
INNER JOIN %s_tmp_store_split_ratio ssplit
   using(product_id,week_start_date, c0_id,s0_id, s3_id)
INNER JOIN %s_tmp_day_split_ratio dsplit
    using(product_id,week_start_date, c0_id,s0_id)


$sql$, 
temp_table_name, temp_table_name,

'CASE 
    WHEN attribute_value = ''bar-coded'' THEN 
        CASE 
            WHEN unique_coupon_cust > 0 and ((expected_response_rate *audience_planned * 0.01) / NULLIF(unique_coupon_cust, 0)) * coupon_rev_proportion < 100 THEN 
                ((expected_response_rate *audience_planned * 0.01) / NULLIF(unique_coupon_cust, 0)) * coupon_rev_proportion
            WHEN unique_coupon_cust > 0 and ((expected_response_rate *audience_planned * 0.01) / NULLIF(unique_coupon_cust, 0)) * coupon_rev_proportion > 100 THEN 
				100
            WHEN coupon_rev_proportion > 0 THEN 
                coupon_rev_proportion
            ELSE 
                5
        END
    ELSE 100
END',


 -- Residential customer redemption expression
format(
    'CASE 
        WHEN %s = 2 THEN COALESCE((
            SELECT txn_redemption
            FROM price_promo.tb_accublue_redemption tar
            WHERE tar.phase = dsplit.phase 
              AND tar.s3_id = sim_df.s3_id 
              AND tar.l0_cid = sim_df.l0_cid
--              AND tar.fiscal_year = EXTRACT(YEAR FROM dsplit.recommendation_date)
        ), 1)
        WHEN %s = 3 THEN COALESCE((
            SELECT txn_redemption
            FROM price_promo.tb_military_redemption tar
            WHERE tar.phase = dsplit.phase 
              AND tar.s3_id = sim_df.s3_id 
              AND tar.l0_cid = sim_df.l0_cid
--              AND tar.fiscal_year = EXTRACT(YEAR FROM dsplit.recommendation_date)
        ), 1)
        ELSE 1
     END', residential_type, residential_type
),


temp_table_name, temp_table_name,  temp_table_name,  temp_table_name 

);

		RAISE NOTICE 'Query Forecast: %', query2;
		EXECUTE query2; 

		
	end if; -- if offer_type is simple offer or not condition ends here
 
end if;  -- if var_scenario_id is not null condition ends here

end_time := clock_timestamp();
RAISE NOTICE 'Time taken forecast/final table if the offer is simple offer or not: %', end_time - start_time;



-----------------------------------------------------------------------------------------------------------------------------




if var_scenario_order_id is not null then  

------------------------------------------------------------------------------------------------------------------------------

IF offer_type = 'kit_offer' THEN

start_time := clock_timestamp();

EXECUTE format('DROP INDEX IF EXISTS idx_sim_forecast_%s', table_suffix);
EXECUTE format('CREATE INDEX idx_sim_forecast_%s ON %s_forecast (
				l0_cid, l1_cid, l2_cid, l3_cid)',
               table_suffix, temp_table_name);

EXECUTE format('DROP INDEX IF EXISTS idx_sim_forecast_%s_2', table_suffix);
EXECUTE format('CREATE INDEX idx_sim_forecast_%s_2 ON %s_forecast (product_id, c0_id, s0_id)',
               table_suffix, temp_table_name);

end_time := clock_timestamp();
RAISE NOTICE 'Time taken forecast table indexes creation: %', end_time - start_time;


start_time := clock_timestamp();

call price_promo_opt.pc_psdf_create_final_table_from_kit(temp_table_name, var_promo_id, var_scenario_id);

end_time := clock_timestamp();
RAISE NOTICE 'Time taken final table table creation from kit offer: %', end_time - start_time;

---------------------------------------------------------------------------------------------------------

ELSIF offer_type = 'bmsm_fixed_quantity' THEN


start_time := clock_timestamp();

EXECUTE format('DROP INDEX IF EXISTS idx_sim_forecast_%s', table_suffix);
EXECUTE format('CREATE INDEX idx_sim_forecast_%s ON %s_forecast (
				l0_cid, l1_cid, l2_cid, l3_cid, c0_id, s0_id, customer_id, phase)',
               table_suffix, temp_table_name);

EXECUTE format('DROP INDEX IF EXISTS idx_sim_forecast_%s_2', table_suffix);
EXECUTE format('CREATE INDEX idx_sim_forecast_%s_2 ON %s_forecast (product_id, c0_id, s0_id, customer_id, phase)',
               table_suffix, temp_table_name);

end_time := clock_timestamp();
RAISE NOTICE 'Time taken forecast table indexes creation: %', end_time - start_time;


start_time := clock_timestamp();

 call price_promo_opt.pc_psdf_create_final_table_from_bmsmfixedqty( temp_table_name , 
 var_promo_id , var_scenario_id );

end_time := clock_timestamp();
RAISE NOTICE 'Time taken for final table creation in bmsmfixedqty: %', end_time - start_time;



------------------------------------------------------------------------------------------------------------------------------

ELSIF offer_type = 'bxgy_offer' THEN


start_time := clock_timestamp();

EXECUTE format('DROP INDEX IF EXISTS idx_sim_forecast_%s', table_suffix);
EXECUTE format('CREATE INDEX idx_sim_forecast_%s ON %s_forecast (
				l0_cid, l1_cid, l2_cid, l3_cid, s0_id,c0_id, phase)',
               table_suffix, temp_table_name);

EXECUTE format('DROP INDEX IF EXISTS idx_sim_forecast_%s_2', table_suffix);
EXECUTE format('CREATE INDEX idx_sim_forecast_%s_2 ON %s_forecast (product_id, s0_id, c0_id, phase)',
               table_suffix, temp_table_name);

end_time := clock_timestamp();
RAISE NOTICE 'Time taken forecast table indexes creation: %', end_time - start_time;

start_time := clock_timestamp();

 call price_promo_opt.pc_psdf_create_final_table_from_bxgy(temp_table_name, var_promo_id, var_scenario_id);

end_time := clock_timestamp();
RAISE NOTICE 'Time taken for final table creation in bxgy: %', end_time - start_time;



------------------------------------------------------------------------------------------------------------------------------


ELSIF offer_type = 'bmsm_transaction_discount'  THEN

start_time := clock_timestamp();

EXECUTE format('DROP INDEX IF EXISTS idx_sim_forecast_%s', table_suffix);
EXECUTE format('CREATE INDEX idx_sim_forecast_%s ON %s_forecast (
				l0_cid, l1_cid, l2_cid, l3_cid, s0_id,c0_id, phase)',
               table_suffix, temp_table_name);

EXECUTE format('DROP INDEX IF EXISTS idx_sim_forecast_%s_2', table_suffix);
EXECUTE format('CREATE INDEX idx_sim_forecast_%s_2 ON %s_forecast (product_id, s0_id, c0_id, phase)',
               table_suffix, temp_table_name);
end_time := clock_timestamp();
RAISE NOTICE 'Time taken _forecast table indexes creation: %', end_time - start_time;

start_time := clock_timestamp();

call price_promo_opt.pc_psdf_create_final_table_from_bmsmtxndisc(temp_table_name, var_promo_id, var_scenario_id);

end_time := clock_timestamp();
RAISE NOTICE 'Time taken for final table creation in bmsm txn disc: %', end_time - start_time;


---------------------------------------------------------------------------------------------------------------------------------------------

ELSIF offer_type = 'tiered_offer'  THEN

start_time := clock_timestamp();

EXECUTE format('DROP INDEX IF EXISTS idx_sim_forecast_%s', table_suffix);
EXECUTE format('CREATE INDEX idx_sim_forecast_%s ON %s_forecast (
				l0_cid, l1_cid, l2_cid, l3_cid, s0_id,c0_id, customer_id, phase)',
               table_suffix, temp_table_name);

EXECUTE format('DROP INDEX IF EXISTS idx_sim_forecast_%s_2', table_suffix);
EXECUTE format('CREATE INDEX idx_sim_forecast_%s_2 ON %s_forecast (product_id, s0_id, c0_id, customer_id, phase)',
               table_suffix, temp_table_name);

end_time := clock_timestamp();
RAISE NOTICE 'Time taken _forecast table indexes creation: %', end_time - start_time;


start_time := clock_timestamp();

 call price_promo_opt.pc_psdf_create_final_table_from_tier(temp_table_name, var_promo_id, var_scenario_id);

end_time := clock_timestamp();
RAISE NOTICE 'Time taken for final table creation in tier: %', end_time - start_time;

---------------------------------------------------------------------------------------------------------------------------------------------

elsif offer_type = 'bxgx' or offer_type = 'bxgx_percent_off' THEN 

start_time := clock_timestamp();

EXECUTE format('DROP INDEX IF EXISTS idx_sim_forecast_%s', table_suffix);
EXECUTE format('CREATE INDEX idx_sim_forecast_%s ON %s_forecast (
				l0_cid, l1_cid, l2_cid, l3_cid, c0_id, s0_id, phase)',
               table_suffix, temp_table_name);

EXECUTE format('DROP INDEX IF EXISTS idx_sim_forecast_%s_2', table_suffix);
EXECUTE format('CREATE INDEX idx_sim_forecast_%s_2 ON %s_forecast (product_id, c0_id, s0_id, phase)',
               table_suffix, temp_table_name);

end_time := clock_timestamp();
RAISE NOTICE 'Time taken forecast table indexes creation: %', end_time - start_time;

start_time := clock_timestamp();

call price_promo_opt.pc_psdf_create_final_table_from_bxgx( temp_table_name, var_promo_id, var_scenario_id); 

end_time := clock_timestamp();
RAISE NOTICE 'Time taken for final table creation in bxgx: %', end_time - start_time;


---------------------------------------------------------------------------------------------------------------------------------------------

ELSIF offer_type = 'free_installation'  THEN

start_time := clock_timestamp();

EXECUTE format('DROP INDEX IF EXISTS idx_sim_forecast_%s', table_suffix);
EXECUTE format('CREATE INDEX idx_sim_forecast_%s ON %s_forecast (
				product_id, phase)',
               table_suffix, temp_table_name);

end_time := clock_timestamp();
RAISE NOTICE 'Time taken _forecast table indexes creation: %', end_time - start_time;


start_time := clock_timestamp();

 call price_promo_opt.pc_psdf_create_final_table_from_free_installation(temp_table_name, var_promo_id, var_scenario_id);

end_time := clock_timestamp();
RAISE NOTICE 'Time taken for final table creation in free installation: %', end_time - start_time;


----------------------------------------------------------------------------------------------------------------------
    -- Step 3: Handle other offer_types
    ELSE

RAISE NOTICE 'Final Table for simple offers is already created';

END IF; -- offer type if else condition ends here
 
End IF; -- var_scenario_id is not null condition ends here

---------------------


---------------------------------------------------------------------------------------



END IF;  -- var_stack_flag if condition ends here
------------------------------------------------------------------------------------



IF var_stack_flag THEN


	CALL price_promo_opt.pc_simulation_create_discount_filter_finalized_stack(var_promo_id, arr_scenario_id, pccd_table);

	final_stack_table_name := format('price_promo_opt_temp.scenario_disc_filter_date_stack_%s_%s', 
								var_promo_id, array_to_string(arr_scenario_id, '_'));

	discount_filter_name := format('price_promo_opt_temp.promo_scenario_discount_filter_%s_%s', 
	var_promo_id, array_to_string(arr_scenario_id, '_'));

	discount_filter_name_2 := format('price_promo_opt_temp.simulation_stacked_discounts_table_%s_%s', 
	var_promo_id, array_to_string(arr_scenario_id, '_'));

	CALL price_promo_opt.generate_promo_scenario_report_stack(discount_filter_name, 
	discount_filter_name_2, var_is_intercept,pccd_table, final_stack_table_name);
	call price_promo_opt.pc_create_sdf_unlogged_tables_by_date(concat(final_stack_table_name,'_final'),
	promo_start_date, promo_end_date);
ELSE

--EXECUTE format('DROP INDEX IF EXISTS idx_psdf_date_%s', table_suffix);
--EXECUTE format('CREATE INDEX idx_psdf_date_%s ON %s using btree(date)',table_suffix, temp_table_name);

call price_promo_opt.pc_create_sdf_unlogged_tables_by_date(temp_table_name,
	promo_start_date, promo_end_date);
END IF;





END;
$procedure$
;
