--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:pc_psdf_create_forecast runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_psdf_create_forecast

DROP PROCEDURE IF EXISTS price_promo_opt.pc_psdf_create_forecast ;
CREATE OR REPLACE PROCEDURE price_promo_opt.pc_psdf_create_forecast(IN temp_table_name character varying)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
DECLARE

start_time timestamp; end_time timestamp; query2 Text; 

begin
query2 := format(
		$sql$
		
		DROP TABLE IF EXISTS %s_forecast;
		CREATE UNLOGGED TABLE %s_forecast AS
		
		SELECT
		    df.*,
		    sim.baseline_sales_units,
		    sim.elasticity,
		    dsplit.day_split_ratio,
		    ssplit.store_split_ratio,
		    sim.baseline_sales_units * dsplit.day_split_ratio * ssplit.store_split_ratio AS baseline_sales,
		    df.current_price * (1 - (df.calculated_discount * 0.01)) AS calculated_effective_price,
		
			(sim.baseline_sales_units * dsplit.day_split_ratio * ssplit.store_split_ratio) + 
			((sim.baseline_sales_units * dsplit.day_split_ratio * ssplit.store_split_ratio) * 
			(0.01*df.calculated_discount) * sim.elasticity) as calculated_sales,
		
			((sim.baseline_sales_units * dsplit.day_split_ratio * ssplit.store_split_ratio) * 
			(0.01*df.calculated_discount) * sim.elasticity) as calculated_incremental_without_coupon,
		
		
			((sim.baseline_sales_units * dsplit.day_split_ratio * ssplit.store_split_ratio) * 
			(0.01*df.calculated_discount) * sim.elasticity) * df.coupon_redemption_percentage * 0.01 * df.residential_customer_redemption as calculated_incremental
		
		
		FROM %s_base df
		
		inner JOIN %s_tmp_simulation sim
		    ON df.product_id = sim.product_id
		    AND df.s0_id = sim.s0_id
		    AND df.week_start_date = sim.week_start_date
		    AND df.customer_id = sim.customer_id
		
		
		inner JOIN %s_tmp_day_split_ratio dsplit
		    ON df.product_id = dsplit.product_id
		    AND df.s0_id = dsplit.s0_id
		    AND df.c0_id = dsplit.c0_id
		    AND df.recommendation_date = dsplit.recommendation_date
		
		
		inner JOIN %s_tmp_store_split_ratio ssplit
		    ON df.product_id = ssplit.product_id
		    AND df.week_start_date = ssplit.week_start_date
		    AND df.c0_id = ssplit.c0_id
		    AND df.s0_id = ssplit.s0_id
		    AND df.s3_id = ssplit.s3_id
		
		
		$sql$,
		
		temp_table_name, -- forecast table name
		temp_table_name,
		
		temp_table_name,
		temp_table_name,
		temp_table_name,
		temp_table_name
		);
		
		RAISE NOTICE 'Query Forecast: %', query2;
		EXECUTE query2; 



end;
$procedure$
;
