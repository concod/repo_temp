--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:pc_psdf_create_final_table_from_tier runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: stacking changes for pc_psdf_create_final_table_from_tier

DROP PROCEDURE if exists price_promo_opt.pc_psdf_create_final_table_from_tier;
CREATE OR REPLACE PROCEDURE price_promo_opt.pc_psdf_create_final_table_from_tier(IN temp_table_name character varying, IN temp_disc_changes character varying, IN var_promo_id integer, IN var_scenario_id integer)
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
				    pdm.s1_id, 
				    pdm.c0_id, 
				    1 as phase
				FROM 
				    %s pdm
				),

				
				basket_data AS (
				    SELECT 
				        b.*,
				        COALESCE(( CASE 
				                            WHEN  brp.latest_base_price > %s THEN 100.0
				                            WHEN brp.latest_base_price < %s AND brp.weighted_avg_basket_value < %s THEN 
				                                ((brp.txn_percent * brp.weighted_avg_basket_value) /nullif( %s,0)) * %s
				                            WHEN brp.latest_base_price < %s AND brp.weighted_avg_basket_value > %s THEN 
				                                ((brp.txn_percent * brp.weighted_avg_basket_value) / nullif(%s,0)) * %s
				                            ELSE 50
				                        END
				                    FROM price_promo.tb_basket_redemption_product brp
				                    WHERE brp.product_id = b.product_id
				                      AND brp.s1_id = 1
				                      AND brp.c0_id = 1
				                      AND brp.phase = 1
				                    LIMIT 1
				                ),
				        100.0) * 0.01 AS phase_multiplier
				    FROM base b
				)
				
				SELECT distinct
				    df.promo_id,
				    df.scenario_id,
				    df.product_id,
					df.l3_cid,
				    df.s1_id,
				    df.c0_id,
				    ph.phase_multiplier as sf_penetration_factor
			
				FROM %s df
                INNER JOIN basket_data ph using (product_id, c0_id, s1_id)				
				
				$sql$,
				temp_table_name,       
				temp_table_name,        
				temp_disc_changes,
				
				min_basket_value, 
				min_basket_value, min_basket_value, min_basket_value, offer_value,
				min_basket_value, min_basket_value, min_basket_value, offer_value,
				
				min_basket_value, 
				min_basket_value, min_basket_value, min_basket_value, offer_value,
				min_basket_value, min_basket_value, min_basket_value, offer_value,
				
				temp_disc_changes
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
					    SELECT DISTINCT product_id, s1_id, c0_id, 1 as phase
					    FROM %s
					),
					 
					
					basket_data AS (
					    SELECT 
					        b.*,
					        COALESCE((
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
					                    WHERE brp.product_id = b.product_id
					                      AND brp.s1_id = 1
					                      AND brp.c0_id = 1
					                      AND brp.phase = 1
					                    LIMIT 1
					                ), 100.0) * 0.01 AS phase_multiplier
					    FROM base b
					)
					
					

									SELECT distinct 
									    df.promo_id,
									    df.scenario_id,
									    df.product_id,
										df.l3_cid,
									    df.s1_id,
									    df.c0_id,
									    ph.phase_multiplier as sf_penetration_factor
									
									FROM %s df
					                INNER JOIN basket_data ph using (product_id, c0_id, s1_id)
					
					$sql$,
					temp_table_name,       
					temp_table_name,        
					temp_disc_changes,
					
					min_basket_value, min_basket_value, offer_value,
					min_basket_value, min_basket_value, min_basket_value, offer_value,
					min_basket_value, min_basket_value, min_basket_value, offer_value,
					
					min_basket_value, min_basket_value, offer_value,
					min_basket_value, min_basket_value, min_basket_value, offer_value,
					min_basket_value, min_basket_value, min_basket_value, offer_value,
					
					temp_disc_changes
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
			    pdm.l3_cid, 
			    pdm.s1_id, 
			    pdm.c0_id, 
			    %s AS buy_qty, -- Assign the constant value 2 with an alias
			    1 as phase
			FROM 
			    %s pdm
		),

			redemption_data AS (
			    SELECT base.*,
			                COALESCE( ( SELECT s.final_redemption_qty
				                        FROM price_promo.tb_fixed_qty_redemption_class s
				                        WHERE s.l3_cid = base.l3_cid
				                          AND s.c0_id = 1
				                          AND s.s1_id = base.s1_id
				                          AND s.phase = 1
				                          AND s.qty_bucket = base.buy_qty
				                        LIMIT 1
			                   		  ), 0.2 ) AS phase_multiplier
			    FROM base
			)

			SELECT distinct
			    df.promo_id,
			    df.scenario_id,
			    df.product_id,
				df.l3_cid,
			    df.s1_id,
			    df.c0_id,
			    rd.phase_multiplier as sf_penetration_factor

			FROM %s df
			LEFT JOIN redemption_data rd
			    ON df.product_id = rd.product_id
			   AND df.s1_id = rd.s1_id
			   AND df.c0_id = rd.c0_id
			
			
			$sql$,
			temp_table_name, temp_table_name, buy_qty,
			temp_disc_changes, temp_disc_changes 	
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
			        pdm.product_id, pdm.l3_cid, pdm.s1_id, 
			        pdm.c0_id, 1 as phase, %s AS buy_qty
			    FROM %s pdm
				),
				
			redemption_data AS (
			    SELECT base.*,
			                COALESCE(
                   
                    (
                        SELECT s.final_redemption_qty
                        FROM price_promo.tb_fixed_qty_redemption_subclass s
                        WHERE s.l3_cid = base.l3_cid
						  and s.l2_cid = base.l2_cid and s.l1_cid = base.l1_cid 
						  and s.l0_cid = base.l0_cid
                          AND s.c0_id = 1
                          AND s.s1_id = base.s1_id
                          AND s.phase = base.phase
                          AND s.qty_bucket = base.buy_qty
                        LIMIT 1
                    ),
                    
                    0.2
                ) AS phase_multiplier
	    	FROM base
		)

				SELECT distinct 
				    df.promo_id,
				    df.scenario_id,
				    df.product_id,
					df.l3_cid,
				    df.s1_id,
				    df.c0_id,
				    rd.phase_multiplier as sf_penetration_factor

				FROM %s df
			    LEFT JOIN redemption_data rd
			    ON df.product_id = rd.product_id
			    AND df.s1_id = rd.s1_id
			    AND df.c0_id = rd.c0_id

				$sql$,
				temp_table_name, temp_table_name, buy_qty, temp_disc_changes, 
				temp_disc_changes
				
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

