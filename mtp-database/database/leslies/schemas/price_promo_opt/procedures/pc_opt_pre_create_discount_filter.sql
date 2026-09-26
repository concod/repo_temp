--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:pc_opt_pre_create_discount_filter runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_opt_pre_create_discount_filter

DROP PROCEDURE IF EXISTS price_promo_opt.pc_opt_pre_create_discount_filter ;
CREATE OR REPLACE PROCEDURE price_promo_opt.pc_opt_pre_create_discount_filter(IN var_promo_id integer, IN var_speed_id integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$

DECLARE

    temp_table_name varchar := format('price_promo_opt_temp.promo_opt_pre_discount_filter_%s_%s', var_promo_id, var_speed_id);
	temp_table_name_stack varchar := format('price_promo_opt_temp.opt_pre_disc_filter_date_stack_%s_%s', var_promo_id, var_speed_id);
	table_suffix varchar := format('%s_%s',var_promo_id, var_speed_id); query text; 
    query1 text; query2 text; query3 text; query4 text; query5 text; query_final text; query3_others text; query3_kit text; offer_type text;
	discount_filter_name text; discount_filter_name_2 text; arr_scenario_id integer[] := ARRAY[var_speed_id];query2_tmp_simulation text;
	query2_tmp_day_split_ratio text; query2_tmp_day_split_ratio_index text; query2_tmp_store_split_ratio text; 
	query2_tmp_store_split_ratio_index text; query3_fq text; buy_qty int4; query3_bxgy text; 
	query3_txn text; min_basket_value float; offer_value float; offer_y_type text;order_id int4; ia_scenario_id int4;
	tier_type1 text; disc_value float; slot_count int4; customer_category text; residential_type int2; max_week_start_date date;
    max_week_end_date date; promo_start_date date; promo_end_date date; start_time timestamp; end_time timestamp;

BEGIN

---------------------------------------------------------------------------------

RAISE NOTICE 'Before enable_nestloop=%', current_setting('enable_nestloop', true);
--PERFORM set_config('enable_nestloop', 'off', true);
SET LOCAL enable_nestloop to off;
RAISE NOTICE 'enable_nestloop=%', current_setting('enable_nestloop', true);

---------------------------------------------------------------------------------


select start_date, end_date 
into promo_start_date, promo_end_date 
from price_promo.promo_master 
where promo_id = var_promo_id ;

-- Get max week start and end dates
SELECT fdm1.weeks_start_date, fdm2.weeks_start_date
INTO max_week_start_date, max_week_end_date
FROM price_promo.promo_master pm
JOIN global.tb_fiscal_date_mapping fdm1 ON pm.start_date = fdm1.date_id
JOIN global.tb_fiscal_date_mapping fdm2 ON pm.end_date = fdm2.date_id
WHERE pm.promo_id = var_promo_id;


query1 := format(
$query$
DROP TABLE IF EXISTS %s_opt_base;  -- table name
CREATE UNLOGGED TABLE %s_opt_base AS  -- table name

WITH 
--promo_dates AS (
--
--    SELECT sub1.recommendation_date, tfdm.weeks_start_date AS week_start_date,
--    CASE 
--        WHEN EXTRACT(MONTH FROM recommendation_date) BETWEEN 3 AND 5 THEN 1
--        WHEN EXTRACT(MONTH FROM recommendation_date) BETWEEN 6 AND 7 THEN 2
--        WHEN EXTRACT(MONTH FROM recommendation_date) BETWEEN 8 AND 9 THEN 3
--        WHEN EXTRACT(MONTH FROM recommendation_date) IN (10, 11, 12, 1, 2) THEN 4
--    END AS phase 
--    FROM (
--        SELECT generate_series(pm.start_date, pm.end_date, '1 day')::date AS recommendation_date
--        FROM price_promo.promo_master pm
--        WHERE pm.promo_id = %s
--    ) sub1
--    INNER JOIN global.tb_fiscal_date_mapping tfdm ON sub1.recommendation_date = tfdm.date
--
--)
--,
discount_level_data as 
(

select promo_id, concat(coalesce(product_level_id,0), '_', coalesce(store_level_id,0), '_', coalesce(customer_level_id,0)) AS discount_level_value
from price_promo.ps_scenario_discounts 
where promo_id = %s

),

discount_points as (
select offer_type, offer_x_value, offer_x_type, 
offer_y_value, offer_y_type, offer_z_value, offer_z_type, 
discount_filter, opt_discount_type_id as offer_type_id, offer_identifier
from 
	(
	
		select *, 1 as tiered_offer_indicator, 1 as max_tier  
					from price_promo.master_valid_offers
					Inner join price_promo_opt.fn_get_rules_data(%s) using(offer_type)
					WHERE (discount_filter BETWEEN min_discount AND max_discount) OR
					(discount_filter = any(CASE WHEN discount_type_values::integer[] is NULL THEN ARRAY[]::integer[]
						ELSE discount_type_values::integer[] end))
	)	foo 			
)

SELECT 
--d.recommendation_date, d.week_start_date, d.phase,
pdf.*, dp.offer_type, dp.offer_type_id, dp.discount_filter, dp.offer_identifier, dl.discount_level_value,

LEAST(
            GREATEST(
                CASE
                    WHEN offer_type = 'percent_off' OR offer_type ='upto_x_percent_off' THEN offer_x_value
                    WHEN offer_type = 'extra_amount_off' THEN ((offer_x_value / current_price) * 100)
                    WHEN offer_type = 'fixed_price' THEN (((current_price - offer_x_value) / current_price) * 100)
                    WHEN offer_type = 'bxgy_percent_off' THEN ((offer_z_value * 0.01 * offer_y_value) / (offer_y_value + offer_x_value)) * 100
                    WHEN offer_type = 'bxgy' THEN ((offer_y_value / (offer_y_value + offer_x_value)) * 100)
                    WHEN offer_type = 'bmsm' AND offer_x_type = 'dollar' AND offer_y_type = 'percent_off' THEN offer_y_value
                    WHEN offer_type = 'bmsm' AND offer_x_type = 'unit' AND offer_y_type = 'percent_off' THEN offer_y_value
                    WHEN offer_type = 'bmsm' AND offer_x_type = 'dollar' AND offer_y_type = 'dollar_off' THEN ((offer_y_value / offer_x_value) * 100)
                    WHEN offer_type = 'bmsm' AND offer_x_type = 'unit' AND offer_y_type = 'dollar_off' THEN ((offer_y_value / (offer_x_value * current_price)) * 100)
                    WHEN offer_type = 'bmsm' AND offer_x_type = 'unit' AND offer_y_type = 'at_dollar' THEN (((current_price - (offer_y_value / offer_x_value)) / current_price) * 100)
                END,
                0
            ),
            100
        ) AS calculated_discount
       
FROM 
--promo_dates d
--CROSS JOIN 
price_promo_opt_temp.promo_product_filter_resim_%s_%s pdf
cross join discount_points dp
cross join discount_level_data dl 

$query$,
    temp_table_name,        -- 1
    temp_table_name,        -- 2
    var_promo_id,           -- 3
	var_promo_id,
    var_promo_id,
	var_promo_id,
	var_speed_id


);
start_time := clock_timestamp();
RAISE NOTICE 'Query : %',query1;
execute query1;
end_time := clock_timestamp();
RAISE NOTICE 'Time taken s_opt_base : %', end_time - start_time;

----------------------------------------------------------------------------------------------------------------------------------

query2_tmp_simulation := format(
    $query$
    DROP TABLE IF EXISTS %s_opt_tmp_simulation;
    CREATE UNLOGGED TABLE %s_opt_tmp_simulation AS
    SELECT
        df.product_id,
        df.s0_id,
        week_start_date,
		--df.phase,
        df.customer_id,
        df.offer_type_id,
        tswo.baseline_sales_units,
        tswo.elasticity
    FROM (
        SELECT distinct
            df.product_id,
            df.s0_id,
--            df.week_start_date,
			--df.phase,
            df.customer_id,
            df.offer_type_id
        FROM %s_opt_base df
    ) df
    INNER JOIN price_promo_opt.tb_simulation_week_opt tswo
        ON df.product_id = tswo.product_id
        AND df.s0_id = tswo.s0_id
        --AND df.week_start_date = tswo.week_start_date
        AND df.customer_id = tswo.c2_id
--        AND df.offer_type_id = tswo.deal_type;
	where tswo.week_start_date between '%s' and '%s'
    $query$,
    temp_table_name, temp_table_name, temp_table_name, max_week_start_date, max_week_end_date
);

start_time := clock_timestamp();
-- Execute the table creation
RAISE NOTICE 'Creating temp table: %', query2_tmp_simulation;
EXECUTE query2_tmp_simulation;
end_time := clock_timestamp();
RAISE NOTICE 'Time taken s_opt_tmp_simulation : %', end_time - start_time;



---------------------------------------------------------------------------------------------------------------------------------


query2_tmp_day_split_ratio := format (
$sql$

DROP TABLE IF EXISTS %s_opt_tmp_day_split_ratio;
CREATE UNLOGGED TABLE %s_opt_tmp_day_split_ratio AS

        WITH 
        pe AS materialized (
            SELECT DISTINCT df.product_id, df.s0_id, df.c0_id, 
            df.l0_cid, df.l1_cid, df.l2_cid, df.l3_cid
            FROM price_promo_opt_temp.promo_opt_pre_discount_filter_%s_opt_base df -- table suffix
        ),

        pe2_prod AS (
          SELECT DISTINCT df.product_id, df.l0_cid, df.l1_cid, df.l2_cid, df.l3_cid
            FROM pe df
        ),

        pe_l3 AS materialized (
            SELECT DISTINCT df.l0_cid, l1_cid, l2_cid, l3_cid, df.c0_id, df.s0_id
            FROM pe df
			group by 1,2,3,4,5,6
        ),
        
        dso_kvi AS (
            SELECT product_id, s0_id, c0_id,l0_cid, l1_cid, l2_cid, l3_cid, date as recommendation_date,
                   day_split_ratio AS day_split_ratio_kvi
            FROM (
                SELECT tdso.*, pe.l0_cid, pe.l1_cid, pe.l2_cid, pe.l3_cid
                FROM price_promo_opt.tb_day_split_opt_kvi tdso

				INNER JOIN pe 
				on pe.product_id = tdso.product_id and pe.c0_id = tdso.c0_id 
				and pe.s0_id = tdso.s0_id 

                WHERE tdso.date BETWEEN '%s' AND '%s'
				--and tdso.day_split_ratio > 0 
				) foo
			
--            INNER JOIN dt on dso_kvi.date = dt.recommendation_date
--            INNER JOIN pe2_prod USING(product_id, c0_id) 
            ),

        dso AS (
            SELECT product_id, l0_cid, l1_cid, l2_cid, l3_cid, s0_id, c0_id, date as recommendation_date,
                   day_split_ratio AS day_split_ratio, phase,coupon_rev_proportion, unique_coupon_cust
            FROM (
                select tdso.*, case 	
        when extract(month from date) between 3 and 5 then 1
        when extract(month from date) between 6 and 7 then 2
        when extract(month from date) between 8 and 9 then 3
        when extract(month from date) in (10, 11, 12, 1, 2) then 4
    	end as phase 
                FROM price_promo_opt.tb_day_split_opt tdso

				INNER JOIN pe_l3 p ON p.l0_cid = tdso.l0_cid 
                    AND p.l1_cid = tdso.l1_cid AND p.l2_cid = tdso.l2_cid 
                    AND p.l3_cid = tdso.l3_cid AND p.c0_id = tdso.c0_id
                    AND p.s0_id = tdso.s0_id 

                WHERE tdso.date BETWEEN '%s' AND '%s'
				--and tdso.day_split_ratio > 0 
            ) dso
--            INNER JOIN dt  on dso.date = dt.recommendation_date
            INNER JOIN pe2_prod USING(l0_cid, l1_cid, l2_cid, l3_cid) 
			left join price_promo.tb_coupon_redemption tcr
		 	using(l0_cid, l1_cid, l2_cid, l3_cid, c0_id,s0_id, phase)
           
        )

        SELECT 
            COALESCE(dso_kvi.product_id, dso.product_id) AS product_id,
		    COALESCE(dso_kvi.s0_id, dso.s0_id) AS s0_id,
		    COALESCE(dso_kvi.c0_id, dso.c0_id) AS c0_id,
		    COALESCE(dso_kvi.recommendation_date, dso.recommendation_date) AS recommendation_date,
		     week_start_date, phase, coupon_rev_proportion, unique_coupon_cust,
            COALESCE(day_split_ratio_kvi, dso.day_split_ratio, 0) AS day_split_ratio

from 
        dso 
        FULL OUTER JOIN dso_kvi USING(product_id, recommendation_date, s0_id, c0_id)
		INNER JOIN 
		(
			select date as recommendation_date, weeks_start_date as week_start_date from global.tb_fiscal_date_mapping
			where date between %L and %L
		) tfdm
		using(recommendation_date)
        

        $sql$,
        temp_table_name, temp_table_name,
        table_suffix, 
		promo_start_date, promo_end_date, 
		promo_start_date, promo_end_date, 
		promo_start_date, promo_end_date
		);    

start_time := clock_timestamp();
RAISE NOTICE 'Query: %', query2_tmp_day_split_ratio;
EXECUTE query2_tmp_day_split_ratio;
end_time := clock_timestamp();
RAISE NOTICE 'Time taken s_opt_tmp_day_split_ratio : %', end_time - start_time;



--------------------------------------------------------------------------------------------------------------------------


--call price_promo_opt.pc_get_store_split_data(var_promo_id,var_speed_id);

    -- Construct dynamic SQL
    query := format($q$
        DROP TABLE IF EXISTS %s_opt_tmp_store_split_ratio;
        CREATE UNLOGGED TABLE %s_opt_tmp_store_split_ratio AS

        WITH 
        se as  (
            SELECT stm.store_id, stm.s0_id, stm.s3_id
            FROM price_promo.fn_fetch_stores_for_promo(%s) fsp
            INNER JOIN global.tb_store_master stm USING(store_id)
        ),

        se_hierarchy AS (
            SELECT DISTINCT s0_id, s3_id
            FROM se
        ),

        pe AS (
            SELECT DISTINCT  product_id, l0_cid, l1_cid, l2_cid, l3_cid, 
            promo_id, 
            c0_id 
			FROM %s_opt_base df
        ),

        pe_prod AS (
            SELECT DISTINCT product_id, c0_id
            FROM pe
        ),

		pe_product AS (
		            SELECT DISTINCT df.promo_id, df.product_id, df.l0_cid, l1_cid, l2_cid, l3_cid
		            from pe df
		),

        pe_l3 AS (
            SELECT DISTINCT c0_id, l0_cid, l1_cid, l2_cid, l3_cid
            FROM pe 
        ),

        sso_kvi AS (
            SELECT product_id, s0_id, s3_id, c0_id, week_start_date,
                   SUM(store_split_ratio) AS store_split_ratio_kvi
            FROM (
                SELECT *, store_split_ratio AS store_split_ratio_kvi
                FROM price_promo_opt.tb_store_split_opt_kvi
                WHERE week_start_date BETWEEN '%s' AND '%s'
            ) sso_kvi
            INNER JOIN se USING(store_id)
            INNER JOIN pe_prod USING(product_id, c0_id)
            GROUP BY 1,2,3,4,5
        ),

        sso AS (
            SELECT l0_cid, l1_cid, l2_cid, l3_cid, s0_id, s3_id, week_start_date, c0_id,
                   SUM(store_split_ratio) AS store_split_ratio
            FROM (
                SELECT *
                FROM price_promo_opt.tb_store_split_opt
                WHERE week_start_date BETWEEN '%s' AND '%s'
            ) sso
            INNER JOIN se USING(store_id)
            INNER JOIN pe_l3 USING(l0_cid, l1_cid, l2_cid, l3_cid, c0_id)
            GROUP BY 1,2,3,4,5,6,7,8
        )
		  SELECT
		      -- keys
		      COALESCE(k.week_start_date, s.week_start_date) AS week_start_date,
		      COALESCE(k.s0_id,         s.s0_id)             AS s0_id,
		      COALESCE(k.s3_id,         s.s3_id)             AS s3_id,
		      COALESCE(k.c0_id,         s.c0_id)             AS c0_id,
		      -- KVI product key (NULL when SSO-only row)
		      coalesce(k.product_id,s.product_id) as product_id,
		      -- ratios
		      coalesce(k.store_split_ratio_kvi, s.store_split_ratio) store_split_ratio
		  FROM 
		  (select sso.*, pe_product.product_id from sso inner join pe_product using(l0_cid, l1_cid, l2_cid, l3_cid) )AS s
		  FULL OUTER JOIN sso_kvi AS k
		  using(week_start_date,s0_id, s3_id, c0_id, product_id)
;
    $q$,
    temp_table_name,                -- DROP TABLE
    temp_table_name,                -- CREATE TABLE
    var_promo_id,                -- fn_fetch_stores_for_promo 1
    temp_table_name,            -- pe
    max_week_start_date,  -- week_start_date from
    max_week_end_date,    -- week_start_date to
    max_week_start_date,  -- again
    max_week_end_date     -- again
    );
	start_time := clock_timestamp();
    RAISE NOTICE 'store split table: %', query;
    EXECUTE query;
	end_time := clock_timestamp();
	RAISE NOTICE 'Time taken s_opt_tmp_store_split_ratio : %', end_time - start_time;


---------------------------------------------------------------------------------------------------------------------------


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
        SELECT pr.residential_sub_customer_type_id
        INTO residential_type
        FROM price_promo.ps_rules pr 
        WHERE promo_id = var_promo_id 
        LIMIT 1;
    END IF;

    IF customer_category = 'not_residential_only' THEN
        SELECT 0
        INTO residential_type;
    END IF;

---------------------------------------------------------------------------------------------------------

	query2 := format(
		$sql$

		DROP TABLE IF EXISTS %s;
		CREATE UNLOGGED TABLE %s AS
		
		SELECT
		    promo_id,
		    %s as scenario_id,
		    product_id,
			discount_filter, offer_identifier, discount_level_value,
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
(select df.*, week_start_date, elasticity, baseline_sales_units from %s_opt_base df
INNER JOIN %s_opt_tmp_simulation sim
using(product_id, s0_id, customer_id) ) sim_df
INNER JOIN %s_opt_tmp_store_split_ratio ssplit
   using(product_id,week_start_date, c0_id,s0_id, s3_id)
INNER JOIN %s_opt_tmp_day_split_ratio dsplit
    using(product_id,week_start_date, c0_id,s0_id)


$sql$, 
temp_table_name, temp_table_name,
var_speed_id,

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
	
		start_time := clock_timestamp();
		RAISE NOTICE 'Query Forecast: %', query2;
		EXECUTE query2; 
		end_time := clock_timestamp();
		RAISE NOTICE 'Time taken for final table : %', end_time - start_time;
			

------------------------------------------------------------------------------------------------------------------------------

start_time := clock_timestamp();

	CALL price_promo_opt.pc_opt_pre_create_discount_filter_finalized_stack(var_promo_id, array[var_speed_id]);

end_time := clock_timestamp();
RAISE NOTICE 'Time taken stacking procedure - finalized_stack : %', end_time - start_time;


start_time := clock_timestamp();

	CALL price_promo_opt.pre_generate_promo_scenario_report_stack(temp_table_name, format('price_promo_opt_temp.simulation_stacked_discounts_table_%s_%s',var_promo_id, var_speed_id));

end_time := clock_timestamp();
RAISE NOTICE 'Time taken stacking procedure - report_stack : %', end_time - start_time;

END;
$procedure$
;
