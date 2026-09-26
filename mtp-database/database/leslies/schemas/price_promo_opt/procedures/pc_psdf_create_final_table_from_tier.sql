--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:pc_psdf_create_final_table_from_tier runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_psdf_create_final_table_from_tier

DROP PROCEDURE IF EXISTS price_promo_opt.pc_psdf_create_final_table_from_tier ;
CREATE OR REPLACE PROCEDURE price_promo_opt.pc_psdf_create_final_table_from_tier(IN temp_table_name character varying, IN var_promo_id integer, IN var_scenario_id integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
DECLARE

start_time timestamp; end_time timestamp; tier_type1 text; min_basket_value float; offer_value float; tier_txn_type text; 
query3_txn text; query3_others text;  x_type text; y_type text; z_type text; tierid integer; buy_qty integer; query3_fq text; query3 text; 

begin

RAISE NOTICE 'inside the call function';

	    SELECT 
	        (json_element.value->>'tier_id')::float
		into tierid
	    FROM price_promo.ps_scenario_discounts psd
	    CROSS JOIN LATERAL jsonb_each(psd.scenario_data) AS json_element
	    WHERE psd.promo_id = var_promo_id
	      AND (json_element.value->>'scenario_id')::int = var_scenario_id
	    LIMIT 1;

RAISE NOTICE 'Tier calculated %', tierid;

	SELECT offer_x_type
	INTO tier_type1
	FROM price_promo.tier_discounts
	WHERE tier_id IN (
	    SELECT 
	        (json_element.value->>'tier_id')::float
	    FROM price_promo.ps_scenario_discounts psd
	    CROSS JOIN LATERAL jsonb_each(psd.scenario_data) AS json_element
	    WHERE psd.promo_id = var_promo_id
	      AND (json_element.value->>'scenario_id')::int = var_scenario_id
	    LIMIT 1
	)
	limit 1;

RAISE NOTICE 'Tiertype1 calculated %', tier_type1;

RAISE NOTICE 'Checking what the offer is ';

	if tier_type1 = 'dollar' then  -- tier type is transaction discount
	
			    SELECT 
		        MIN(td.offer_x_value),
		        (AVG(td.offer_x_value) + AVG(td.offer_y_value)) / 2,
		        MAX(td.offer_y_type)  
		    INTO 
		        min_basket_value,
		        offer_value,
		        tier_txn_type
		    FROM price_promo.tier_discounts td 
		    WHERE tier_id IN (
		        SELECT 
		            (json_element.value->>'tier_id')::int
		        FROM price_promo.ps_scenario_discounts psd
		        CROSS JOIN LATERAL jsonb_each(psd.scenario_data) AS json_element
		        WHERE psd.promo_id = var_promo_id
		          AND (json_element.value->>'scenario_id')::int = var_scenario_id
		        LIMIT 1
		    );
			
-----------------------------------

		if tier_txn_type = 'percent_off' then  -- transaction discount percent off 
				-- Compose the query
				query3 := format(
				$sql$
				DROP TABLE IF EXISTS %s;
				CREATE UNLOGGED TABLE %s AS
				

				WITH base AS (
				SELECT DISTINCT
				    pdm.product_id, 
				    pdm.s0_id, 
				    pdm.c0_id, 
				    pdm.customer_id,
				    pdm.phase
				FROM 
				    %s_forecast pdm
				),

				
				basket_data AS (
				    SELECT 
				        b.*,
				        COALESCE(
				            CASE 
				                WHEN b.c0_id = 1 THEN (
				                    SELECT 
				                        CASE 
				                            WHEN  brp.latest_base_price > %s THEN 100.0
				                            WHEN brp.latest_base_price < %s AND brp.weighted_avg_basket_value < %s THEN 
				                                ((brp.txn_percent * brp.weighted_avg_basket_value) /nullif( %s,0)) * %s
				                            WHEN brp.latest_base_price < %s AND brp.weighted_avg_basket_value > %s THEN 
				                                ((brp.txn_percent * brp.weighted_avg_basket_value) / nullif(%s,0)) * %s
				                            ELSE 50
				                        END
				                    FROM price_promo.tb_basket_redemption_product brp
				                    WHERE brp.product_code = b.product_id::text
				                      AND brp.s0_id = b.s0_id
				                      AND brp.c0_id = 1
				                      AND brp.phase = b.phase
				                    LIMIT 1
				                )
				
				                WHEN b.c0_id = 2 THEN (
				                    SELECT 
				                        CASE 
				                            WHEN  brp.latest_base_price > %s THEN 100.0
				                            WHEN brp.latest_base_price < %s AND brp.weighted_avg_basket_value < %s THEN 
				                                ((brp.txn_percent * brp.weighted_avg_basket_value) / nullif(%s,0)) * %s
				                            WHEN brp.latest_base_price < %s AND brp.weighted_avg_basket_value > %s THEN 
				                                ((brp.txn_percent * brp.weighted_avg_basket_value) / nullif(%s,0)) * %s
				                            ELSE 50
				                        END
				                    FROM price_promo.tb_basket_redemption_product_commercial brp
				                    WHERE brp.product_code = b.product_id::text
				                      AND brp.c0_id = 2
									  AND brp.c2_id = b.customer_id
				                      AND brp.phase = b.phase
				                    LIMIT 1
				                )
				
				                ELSE 100.0
				            END, 
				        100.0) * 0.01 AS phase_multiplier
				    FROM base b
				)
				
				

								SELECT
								    df.promo_id,
								    df.scenario_id,
								    df.product_id,
								    df.l0_cid,
								    df.l1_cid,
								    df.l2_cid,
								    df.l3_cid,
								    df.s0_id,
								    df.s3_id,
								    CONCAT(df.s0_id, '_', df.s3_id) AS store_hierarchy,
								    df.customer_id,
								    df.c0_id,
								    df.recommendation_date AS date,
								    df.recommendation_date,
								    df.phase,
								    df.week_start_date,
								    df.offer_type_id,
								    df.offer_type,
								    df.c0_id AS customer_type,
								    df.calculated_discount,
									df.elasticity,
								
								    -- derived metrics from first query logic
								    (ph.phase_multiplier * df.calculated_incremental) / NULLIF(df.elasticity * df.baseline_sales * 0.01, 0)
								        AS effective_discount,
								
								    df.cost,
								    df.cost AS original_cost,
								    df.current_price,
								
								    -- discounted_price calculation
								    df.current_price * (100 - ((ph.phase_multiplier * df.calculated_incremental) /
								       NULLIF(df.elasticity * df.baseline_sales * 0.01, 0))) * 0.01 AS discounted_price,
								
								    -- sales_units and baseline_sales_units
								    df.baseline_sales + (df.calculated_incremental * ph.phase_multiplier) AS sales_units,
								    df.baseline_sales AS baseline_sales_units,
								
								    df.rebate,
								    df.shipping_cost,
									df.offer_type_combined_display_name
								FROM %s_forecast df
				                INNER JOIN basket_data ph
				                    ON df.product_id = ph.product_id
				                    AND df.c0_id = ph.c0_id
				                    AND df.customer_id = ph.customer_id
				                    AND df.s0_id = ph.s0_id
				                    AND df.phase = ph.phase

				
				
				$sql$,
				temp_table_name,       
				temp_table_name,        
				temp_table_name,
				
				min_basket_value, 
				min_basket_value, min_basket_value, min_basket_value, offer_value,
				min_basket_value, min_basket_value, min_basket_value, offer_value,
				
				min_basket_value, 
				min_basket_value, min_basket_value, min_basket_value, offer_value,
				min_basket_value, min_basket_value, min_basket_value, offer_value,
				
				temp_table_name
				);
				
				-- Optionally execute it
				RAISE NOTICE 'Executing query3: %', query3;
				EXECUTE query3;
				
				end if; 



-----------------------------------

			if tier_txn_type = 'dollar_off' then  -- transaction discount dollar off
					
					-- Compose the query
					query3 := format(
					$sql$
					DROP TABLE IF EXISTS %s;
					CREATE UNLOGGED TABLE %s AS
					
					WITH base AS (
					    SELECT DISTINCT product_id, s0_id, c0_id, customer_id, phase
					    FROM %s_forecast
					),
					 
					
					basket_data AS (
					    SELECT 
					        b.*,
					        COALESCE(
					            CASE 
					                WHEN b.c0_id = 1 THEN (
					                    SELECT 
					                        CASE 
					                            WHEN  brp.latest_base_price > %s THEN (%s / nullif(brp.weighted_avg_basket_value, 0)) * %s
					                            WHEN brp.latest_base_price < %s AND brp.weighted_avg_basket_value > %s THEN 
					                                (%s/nullif(brp.weighted_avg_basket_value,0)) * %s
					                            WHEN brp.latest_base_price < %s AND brp.weighted_avg_basket_value < %s THEN 
					                                ((brp.txn_percent * brp.weighted_avg_basket_value) / nullif(%s,0)) * %s
					                            ELSE 50
					                        END
					                    FROM price_promo.tb_basket_redemption_product brp
					                    WHERE brp.product_code = b.product_id::text
					                      AND brp.s0_id = b.s0_id
					                      AND brp.c0_id = 1
					                      AND brp.phase = b.phase
					                    LIMIT 1
					                )
					
					                WHEN b.c0_id = 2 THEN (
					                    SELECT 
					                        CASE 
					                            WHEN  brp.latest_base_price > %s THEN (%s / nullif(brp.weighted_avg_basket_value,0)) * %s
					                            WHEN brp.latest_base_price < %s AND brp.weighted_avg_basket_value > %s THEN 
					                                (%s/nullif(brp.weighted_avg_basket_value,0)) * %s
					                            WHEN brp.latest_base_price < %s AND brp.weighted_avg_basket_value < %s THEN 
					                                ((brp.txn_percent * brp.weighted_avg_basket_value) / nullif(%s,0)) * %s
					                            ELSE 50
					                        END
					                    FROM price_promo.tb_basket_redemption_product_commercial brp
					                    WHERE brp.product_code = b.product_id::text
					                      AND brp.c0_id = 2
										  AND brp.c2_id = b.customer_id
					                      AND brp.phase = b.phase
					                    LIMIT 1
					                )
					
					                ELSE 100
					            END, 
					        100.0) * 0.01 AS phase_multiplier
					    FROM base b
					)
					
					

									SELECT
									    df.promo_id,
									    df.scenario_id,
									    df.product_id,
									    df.l0_cid,
									    df.l1_cid,
									    df.l2_cid,
									    df.l3_cid,
									    df.s0_id,
									    df.s3_id,
									    CONCAT(df.s0_id, '_', df.s3_id) AS store_hierarchy,
									    df.customer_id,
									    df.c0_id,
									    df.recommendation_date AS date,
									    df.recommendation_date,
									    df.phase,
									    df.week_start_date,
									    df.offer_type_id,
									    df.offer_type,
									    df.c0_id AS customer_type,
									    df.calculated_discount,
										df.elasticity,
									
									    -- derived metrics from first query logic
									    (ph.phase_multiplier * df.calculated_incremental) / NULLIF(df.elasticity * df.baseline_sales * 0.01, 0)
									        AS effective_discount,
									
									    df.cost,
									    df.cost AS original_cost,
									    df.current_price,
									
									    -- discounted_price calculation
									    df.current_price * (100 - ((ph.phase_multiplier * df.calculated_incremental) /
									       NULLIF(df.elasticity * df.baseline_sales * 0.01, 0))) * 0.01 AS discounted_price,
									
									    -- sales_units and baseline_sales_units
									    df.baseline_sales + (df.calculated_incremental * ph.phase_multiplier) AS sales_units,
									    df.baseline_sales AS baseline_sales_units,
									
									    df.rebate,
									    df.shipping_cost,
    
    									df.offer_type_combined_display_name
									FROM %s_forecast df
					                INNER JOIN basket_data ph
					                    ON df.product_id = ph.product_id
					                    AND df.c0_id = ph.c0_id
					                    AND df.customer_id = ph.customer_id
					                    AND df.s0_id = ph.s0_id
					                    AND df.phase = ph.phase

					
					
					$sql$,
					temp_table_name,       
					temp_table_name,        
					temp_table_name,
					
					min_basket_value, min_basket_value, offer_value,
					min_basket_value, min_basket_value, min_basket_value, offer_value,
					min_basket_value, min_basket_value, min_basket_value, offer_value,
					
					min_basket_value, min_basket_value, offer_value,
					min_basket_value, min_basket_value, min_basket_value, offer_value,
					min_basket_value, min_basket_value, min_basket_value, offer_value,
					
					temp_table_name
					);
					
					-- Optionally execute it
					RAISE NOTICE 'Executing query3: %', query3;
					EXECUTE query3;

					end if; 

else -- bxgx, bxgx percent off and fixed qty

RAISE NOTICE 'offer is of unit type so could be any of bxgx or fixedqty';

	SELECT max(offer_x_type), max(offer_y_type), max(offer_z_type), max(tier_id)
	INTO x_type, y_type, z_type, tierid
	FROM price_promo.tier_discounts
	WHERE tier_id IN (
	    SELECT 
	        (json_element.value->>'tier_id')::float
	    FROM price_promo.ps_scenario_discounts psd
	    CROSS JOIN LATERAL jsonb_each(psd.scenario_data) AS json_element
	    WHERE psd.promo_id = var_promo_id
	      AND (json_element.value->>'scenario_id')::int = var_scenario_id
	    LIMIT 1
	)
	limit 1;

RAISE NOTICE 'Checking x,y,z types % % % ', x_type,y_type, z_type;
-----------------------------------

			select ceil(avg(offer_x_value)) :: int
			into buy_qty
			from price_promo.tier_discounts td
			where td.tier_id = tierid;

		RAISE NOTICE 'Checking buyqty % ', buy_qty;

		
-------------------------------

		if x_type = 'unit' and y_type = 'unit' then  -- bxgx or bxgx percent off


			query3 := format(
			$sql$
			DROP TABLE IF EXISTS %s;
			CREATE UNLOGGED TABLE %s AS

			WITH base AS (
			SELECT DISTINCT
			    pdm.product_id, 
			    pdm.l0_cid, 
			    pdm.l1_cid, 
			    pdm.l2_cid, 
			    pdm.l3_cid, 
			    pdm.s0_id, 
			    pdm.c0_id, 
			    pdm.customer_id,
			    %s AS buy_qty, -- Assign the constant value 2 with an alias
			    pdm.phase
			FROM 
			    %s_forecast pdm
		),

			redemption_data AS (
			    SELECT base.*,
			        CASE 
			            WHEN base.c0_id = 1 THEN (
			                COALESCE(
			                    (
			                        SELECT p.final_redemption_qty
			                        FROM price_promo.tb_fixed_qty_redemption_product p
			                        WHERE p.product_code = base.product_id::text
			                          AND p.c0_id = 1
			                          AND p.s0_id = base.s0_id
			                          AND p.phase = base.phase
			                          AND p.qty_bucket = base.buy_qty
			                        LIMIT 1
			                    ),
			                    (
			                        SELECT s.final_redemption_qty
			                        FROM price_promo.tb_fixed_qty_redemption_subclass s
			                        WHERE s.l3_cid = base.l3_cid
									  and s.l2_cid = base.l2_cid and s.l1_cid = base.l1_cid 
									  and s.l0_cid = base.l0_cid
			                          AND s.c0_id = 1
			                          AND s.s0_id = base.s0_id
			                          AND s.phase = base.phase
			                          AND s.qty_bucket = base.buy_qty
			                        LIMIT 1
			                    ),
			                    (
			                        SELECT o.final_redemption_qty
			                        FROM price_promo.tb_fixed_qty_redemption_overall o
			                        WHERE o.c0_id = 1
			                          AND o.s0_id = base.s0_id
			                          AND o.phase = base.phase
			                          AND o.qty_bucket = base.buy_qty
			                        LIMIT 1
			                    ),
			                    0.2
			                )
			            )
			            WHEN base.c0_id = 2 THEN (
			                COALESCE(
			                    (
			                        SELECT s.final_redemption_qty
			                        FROM price_promo.tb_fixed_qty_redemption_subclass_commercial s
			                        WHERE s.l3_cid = base.l3_cid
									  and s.l2_cid = base.l2_cid and s.l1_cid = base.l1_cid
									  and s.l0_cid = base.l0_cid
			                          AND s.c0_id = 2
			                          AND s.c2_id = base.customer_id
			                          AND s.phase = base.phase
			                          AND s.qty_bucket = base.buy_qty
			                        LIMIT 1
			                    ),
			                    (
			                        SELECT o.final_redemption_qty
			                        FROM price_promo.tb_fixed_qty_redemption_overall_commercial o
			                        WHERE o.c0_id = 2
			                          AND o.phase = base.phase
			                          AND o.qty_bucket = base.buy_qty
			                        LIMIT 1
			                    ),
			                    0.2 
			                )
			            )
			            ELSE 1.0
			        END AS phase_multiplier
			    FROM base
			)

			SELECT
			    df.promo_id,
			    df.scenario_id,
			    df.product_id,
			    df.l0_cid,
			    df.l1_cid,
			    df.l2_cid,
			    df.l3_cid,
			    df.s0_id,
			    df.s3_id,
			    CONCAT(df.s0_id, '_', df.s3_id) AS store_hierarchy,
			    df.customer_id,
			    df.c0_id,
			    df.recommendation_date AS date,
			    df.recommendation_date,
			    df.phase,
			    df.week_start_date,
			    df.offer_type_id,
			    df.offer_type,
			    df.c0_id AS customer_type,
			    df.calculated_discount,
				df.elasticity,
			
			    -- derived metrics from first query logic
			    (rd.phase_multiplier * df.calculated_incremental) / NULLIF(df.elasticity * df.baseline_sales * 0.01, 0)
			        AS effective_discount,
			
			    df.cost,
			    df.cost AS original_cost,
			    df.current_price,
			
			    -- discounted_price calculation
			    df.current_price * (100 - ((rd.phase_multiplier * df.calculated_incremental) /
			       NULLIF(df.elasticity * df.baseline_sales * 0.01, 0))) * 0.01 AS discounted_price,
			
			    -- sales_units and baseline_sales_units
			    df.baseline_sales + (df.calculated_incremental * rd.phase_multiplier) AS sales_units,
			    df.baseline_sales AS baseline_sales_units,
			
			    df.rebate,
			    df.shipping_cost,
				df.offer_type_combined_display_name
			FROM %s_forecast df
			LEFT JOIN redemption_data rd
			    ON df.product_id = rd.product_id
			   AND df.s0_id = rd.s0_id
			   AND df.c0_id = rd.c0_id
			   AND df.customer_id = rd.customer_id
			
			
			$sql$,
			temp_table_name, temp_table_name, buy_qty,
			temp_table_name, temp_table_name 	
			);
						
			RAISE NOTICE 'Executing query3: %', query3;
			EXECUTE query3;	

		else -- the offer is tier fixed qty


--if x_type = 'unit' and y_type in ('dollar_off' , 'percent_off', 'at_dollar') and z_type = null then  -- offer is tier fixed qty 

		RAISE NOTICE 'offer type is tier fixed qty';

		query3 := format($sql$
            DROP TABLE IF EXISTS %s;
            CREATE UNLOGGED TABLE %s AS

			WITH base AS (
			    SELECT DISTINCT 
			        pdm.product_id, pdm.l0_cid, pdm.l1_cid, pdm.l2_cid, pdm.l3_cid, pdm.s0_id, 
			        pdm.c0_id, pdm.customer_id, pdm.phase, %s AS buy_qty
			    FROM %s_forecast pdm
				),
				
			redemption_data AS (
			    SELECT base.*,
			        CASE 
			            WHEN base.c0_id = 1 THEN (
			                COALESCE(
                    (
                        SELECT p.final_redemption_qty
                        FROM price_promo.tb_fixed_qty_redemption_product p
                        WHERE p.product_code = base.product_id::text
                          AND p.c0_id = 1
                          AND p.s0_id = base.s0_id
                          AND p.phase = base.phase
                          AND p.qty_bucket = base.buy_qty
                        LIMIT 1
                    ),
                    (
                        SELECT s.final_redemption_qty
                        FROM price_promo.tb_fixed_qty_redemption_subclass s
                        WHERE s.l3_cid = base.l3_cid
						  and s.l2_cid = base.l2_cid and s.l1_cid = base.l1_cid 
						  and s.l0_cid = base.l0_cid
                          AND s.c0_id = 1
                          AND s.s0_id = base.s0_id
                          AND s.phase = base.phase
                          AND s.qty_bucket = base.buy_qty
                        LIMIT 1
                    ),
                    (
                        SELECT o.final_redemption_qty
                        FROM price_promo.tb_fixed_qty_redemption_overall o
                        WHERE o.c0_id = 1
                          AND o.s0_id = base.s0_id
                          AND o.phase = base.phase
                          AND o.qty_bucket = base.buy_qty
                        LIMIT 1
                    ),
                    0.2
                )
            )
            WHEN base.c0_id = 2 THEN (
                COALESCE(
                    (
                        SELECT s.final_redemption_qty
                        FROM price_promo.tb_fixed_qty_redemption_subclass_commercial s
                        WHERE s.l3_cid = base.l3_cid
						  and s.l2_cid = base.l2_cid and s.l1_cid = base.l1_cid
						  and s.l0_cid = base.l0_cid
                          AND s.c0_id = 2
                          AND s.c2_id = base.customer_id
                          AND s.phase = base.phase
                          AND s.qty_bucket = base.buy_qty
                        LIMIT 1
                    ),
                    (
                        SELECT o.final_redemption_qty
                        FROM price_promo.tb_fixed_qty_redemption_overall_commercial o
                        WHERE o.c0_id = 2
                          AND o.phase = base.phase
                          AND o.qty_bucket = base.buy_qty
                        LIMIT 1
                    ),
                    0.2 
	                )
	            	)
	            	ELSE 1.0
	        	END AS phase_multiplier
	    	FROM base
		)

				SELECT
				    df.promo_id,
				    df.scenario_id,
				    df.product_id,
				    df.l0_cid,
				    df.l1_cid,
				    df.l2_cid,
				    df.l3_cid,
				    df.s0_id,
				    df.s3_id,
				    CONCAT(df.s0_id, '_', df.s3_id) AS store_hierarchy,
				    df.customer_id,
				    df.c0_id,
				    df.recommendation_date AS date,
				    df.recommendation_date,
				    df.phase,
				    df.week_start_date,
				    df.offer_type_id,
				    df.offer_type,
				    df.c0_id AS customer_type,
				    df.calculated_discount,
					df.elasticity,
				
				    -- derived metrics from first query logic
				    (rd.phase_multiplier  * df.calculated_incremental) / NULLIF(df.elasticity * df.baseline_sales * 0.01, 0)
				        AS effective_discount,
				
				    df.cost,
				    df.cost AS original_cost,
				    df.current_price,
				
				    -- discounted_price calculation
				    df.current_price * (100 - ((rd.phase_multiplier * df.calculated_incremental) /
				       NULLIF(df.elasticity * df.baseline_sales * 0.01, 0))) * 0.01 AS discounted_price,
				
				    -- sales_units and baseline_sales_units
				    df.baseline_sales + (df.calculated_incremental * rd.phase_multiplier) AS sales_units,
				    df.baseline_sales AS baseline_sales_units,
				
				    df.rebate,
				    df.shipping_cost,
					df.offer_type_combined_display_name
				FROM %s_forecast df
			    LEFT JOIN redemption_data rd
			    ON df.product_id = rd.product_id
			    AND df.s0_id = rd.s0_id
			    AND df.c0_id = rd.c0_id
				and df.customer_id = rd.customer_id
				$sql$,
				temp_table_name, temp_table_name, buy_qty, temp_table_name, 
				temp_table_name
				
				);
				
				RAISE NOTICE 'Executing query3: %', query3;
				EXECUTE query3;


		end if;
--------------------------

	end if; 
--------------------------------------------------------------------------------------------------



end;
$procedure$
;