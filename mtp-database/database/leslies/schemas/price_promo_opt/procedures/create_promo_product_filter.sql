--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:create_promo_product_filter runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: stacking changes for create_promo_product_filter

DROP PROCEDURE if exists price_promo_opt.create_promo_product_filter;
CREATE OR REPLACE PROCEDURE price_promo_opt.create_promo_product_filter(IN var_promo_id integer, IN var_scenario_id integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
DECLARE
    offer_type text;
    temp_table_name text := format('price_promo_opt_temp.promo_product_filter_resim_%s_%s', var_promo_id, var_scenario_id);
    query1 text; query text; query2 text; query1_bxgy text; avg_Xslot_price int8; order_id int8; query_opt text; 
	psd_kit_id int4; psd_bxgy_id int4;

    query_create_table varchar;
    query_create_index_l3 varchar;
    query_create_index_l2 varchar;
    query_create_index_product varchar;
    table_name varchar := format('promo_product_filter_resim_%s_%s', var_promo_id, var_scenario_id);


BEGIN

----------------------------------------------------------

-- RAISE NOTICE 'Before enable_nestloop=%', current_setting('enable_nestloop', true);
-- --PERFORM set_config('enable_nestloop', 'off', true);
-- SET LOCAL enable_nestloop to off;
-- RAISE NOTICE 'enable_nestloop=%', current_setting('enable_nestloop', true);


---------------------------------------------------------------------------------

    -- Get the offer_type from scenario_discounts
    SELECT DISTINCT NULLIF(json_element.value->>'offer_type', 'null')
    INTO offer_type
    FROM price_promo.ps_scenario_discounts psd
    LEFT JOIN LATERAL jsonb_each(psd.scenario_data) AS json_element ON 1=1
    WHERE psd.promo_id = var_promo_id
      AND NULLIF(json_element.value->>'scenario_id', 'null')::int = var_scenario_id
    LIMIT 1;




SELECT scenario_order_id  
INTO order_id 
FROM price_promo.scenario_master
WHERE promo_id = var_promo_id 
  AND scenario_id = var_scenario_id;


if order_id is not null then 
--     Drop the output table if it exists
--    query := format('DROP TABLE IF EXISTS %I;', temp_table_name);
--    EXECUTE query;
---------
    -- Build the creation query only if offer_type is 'kit_offer'
    IF offer_type = 'kit_offer' THEN


    SELECT DISTINCT NULLIF(json_element.value->>'kit_offer_id', 'null')
    INTO psd_kit_id
    FROM price_promo.ps_scenario_discounts psd
    LEFT JOIN LATERAL jsonb_each(psd.scenario_data) AS json_element ON 1=1
    WHERE psd.promo_id = var_promo_id
      AND NULLIF(json_element.value->>'scenario_id', 'null')::int = var_scenario_id
    LIMIT 1;


        query1 := format($sql$
			DROP TABLE IF EXISTS %s;
            CREATE UNLOGGED TABLE %s AS
            
		  with customers AS (
                select cm.c0_id, cm.c2_id
                FROM price_promo.tb_promo_customers tpc
                INNER JOIN global.customer_master cm ON tpc.customer_id = cm.c2_id
				where tpc.promo_id = %s 
            ),

	        store_segments AS (
	             SELECT DISTINCT sm.s0_id, sm.s3_id
	             FROM price_promo.fn_fetch_stores_for_promo(%s) fsp
	             JOIN global.tb_store_master sm ON sm.store_id = fsp.store_id
            ),

			filtered_customer_store as (
				 select c.*, s.* 
				 from customers c 
				 LEFT join store_segments s ON 1=1
				 inner join global.customer_channel_master  ccm 
				 on ccm.c0_id = c.c0_id and ccm.s0_id = s.s0_id
			),

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

            kit_data AS (
                SELECT
                    tko.promo_id, 
                    74 AS offer_type_id, 
                    'kit_offer' AS offer_type, 
                    tkot.kit_offer_type_id,
                    tkoup.product_id, tkou.unit_name, tkou.units_count,
                    tko.discount_value,
                    pdm.l0_cid, pdm.l1_cid, pdm.l2_cid, pdm.l3_cid,
                    pdm.current_bnm_price, pdm.current_comm_price, pdm.current_ecom_its_price, pdm.current_c8_price, pdm.current_c9_price,
					coalesce(pdm.shipping_cost,0) as shipping_cost, coalesce(pdm.rebate,0) as rebate, 
                    pdm.current_ecom_lesl_price, pdm.current_price, pdm.cost
                FROM price_promo.tb_kit_offer tko
                JOIN price_promo.tb_kit_offer_type tkot ON tko.kit_offer_type_id = tkot.kit_offer_type_id
                JOIN price_promo.tb_kit_offer_units tkou ON tko.kit_offer_id = tkou.kit_offer_id
                JOIN price_promo.tb_kit_offer_unit_products tkoup ON tkou.kit_offer_units_id = tkoup.kit_offer_units_id
                JOIN price_promo.product_master pdm ON tkoup.product_id = pdm.product_id
                WHERE tko.promo_id = %s and tko.kit_offer_id = %s
            ),

            final_data as (
            SELECT 
                kd.promo_id, %s as scenario_id, kd.offer_type_id, kd.offer_type,kd.kit_offer_type_id, 
                kd.product_id, kd.unit_name, kd.units_count, kd.discount_value, kd.l0_cid, kd.l1_cid, kd.l2_cid, kd.l3_cid, kd.cost,
				kd.shipping_cost, kd.rebate, cd.*,
                s.s0_id, s.s3_id, s.c0_id, s.c2_id as customer_id,
                COALESCE(
                    dp.price,
                    CASE
                        -- Residential Cust (c0_id = 1, c2_id = 1)
                        WHEN s.c0_id = 1 AND s.c2_id = 1 AND s.s0_id = 1 THEN kd.current_bnm_price
                        WHEN s.c0_id = 1 AND s.c2_id = 1 AND s.s0_id = 3 THEN kd.current_ecom_its_price
                        WHEN s.c0_id = 1 AND s.c2_id = 1 AND s.s0_id = 4 THEN kd.current_ecom_lesl_price
                        -- Commercial Cust C1 to C7 (c0_id = 2, c2_id IN 5-11)
                        WHEN s.c0_id = 2 AND s.c2_id IN (5,6,7,8,9,10,11) AND s.s0_id IN (1,2) THEN kd.current_bnm_price
                        -- Commercial Cust C8 to C9 (c0_id = 2, c2_id = 12 or 13)
                        WHEN s.c0_id = 2 AND s.c2_id = 12 AND s.s0_id IN (1,2) THEN kd.current_c8_price
                        WHEN s.c0_id = 2 AND s.c2_id = 13 AND s.s0_id IN (1,2) THEN kd.current_c9_price
                        ELSE kd.current_price
                    END, kd.current_price
                ) AS current_price

            FROM kit_data kd
            LEFT JOIN filtered_customer_store s ON 1=1
			LEFT JOIN price_promo.deviated_pricing dp 
				ON dp.product_id = kd.product_id 
				AND dp.c0_id = s.c0_id 
				AND dp.c2_id = s.c2_id 
				AND dp.s0_id = s.s0_id 
				AND dp.s3_id = s.s3_id
			LEFT JOIN coupon_data cd on 1=1
			inner join price_promo.tb_product_eligibility pe on kd.product_id = pe.product_id::integer and s.c0_id = pe.c0_id
			),
			
			kit_disc as (
			select *, (calculated_discount1/max_slot_price)*100 as calculated_discount
			from 
			(
			SELECT *,discount_value * max_slot_price / SUM(max_slot_price) OVER () AS calculated_discount1
			from 
				(
				select fd.unit_name, max(units_count)*max(current_price) as max_slot_price, max(discount_value) as discount_value
				from final_data fd
				group by fd.unit_name  
				) foo
			) foo2
			),

			scenario_discounts AS (
                SELECT 
                    psd.promo_id,
					NULLIF(json_element.value->>'tier_id', 'null')::int AS tier_id,
                    NULLIF(json_element.value->>'offer_type', 'null') AS offer_type,
                    NULLIF(json_element.value->>'offer_x_type', 'null') AS offer_x_type,
                    NULLIF(json_element.value->>'offer_y_type', 'null') AS offer_y_type,
                    NULLIF(json_element.value->>'offer_z_type', 'null') AS offer_z_type,
                    NULLIF(json_element.value->>'offer_value', 'null')::varchar AS direct_offer_value,
                    NULLIF(json_element.value->>'offer_x_value', 'null')::float AS offer_x_value,
                    NULLIF(json_element.value->>'offer_y_value', 'null')::float AS offer_y_value,
                    NULLIF(json_element.value->>'offer_z_value', 'null')::float AS offer_z_value,
                    NULLIF(json_element.value->>'special_offer_data', 'null') AS special_offer_data,
					NULLIF(json_element.value->>'kit_offer_id', 'null')::float AS kit_offer_id
                FROM price_promo.ps_scenario_discounts psd
                LEFT JOIN LATERAL jsonb_each(psd.scenario_data) AS json_element ON 1=1
                WHERE psd.promo_id = %s 
				AND NULLIF(json_element.value->>'scenario_id', 'null')::int = %s
            )

            SELECT 
                fd.*, 
				CASE
                    WHEN fd.kit_offer_type_id = 1 THEN fd.discount_value
                    WHEN fd.kit_offer_type_id = 2 THEN kd.calculated_discount
                    WHEN fd.kit_offer_type_id = 3 THEN 100 - kd.calculated_discount
                    ELSE 35 
                END AS calculated_discount,
                CASE
                    WHEN psd.offer_type IN ('percent_off', 'extra_amount_off')
                        THEN psd.offer_x_value::varchar
                    WHEN psd.offer_type IN ('bxgx', 'bxgx_percent_off')
                        THEN psd.direct_offer_value::varchar
                    ELSE
                        price_promo.get_offer_description_v2(
                            psd.offer_type::text,
                            psd.kit_offer_id::numeric,
                            psd.offer_x_type::text,
                            psd.offer_y_value::numeric,
                            psd.offer_y_type::text,
                            psd.offer_z_value::numeric,
                            psd.tier_id::numeric,
                            psd.special_offer_data::jsonb
                        )::varchar
                END AS offer_type_combined_display_name
            FROM final_data fd
			LEFT JOIN scenario_discounts psd ON 1=1
            Inner JOIN kit_disc kd on fd.unit_name = kd.unit_name

        $sql$,
        temp_table_name,temp_table_name, 
		var_promo_id, var_promo_id, var_promo_id, var_promo_id, 
		psd_kit_id, var_scenario_id, var_promo_id, var_scenario_id);

        RAISE NOTICE 'Executing query1: %', query1;
        EXECUTE query1;

------------
ELSIF offer_type = 'bxgy_offer' THEN

    SELECT DISTINCT NULLIF(json_element.value->>'bxgy_offer_id', 'null')
    INTO psd_bxgy_id
    FROM price_promo.ps_scenario_discounts psd
    LEFT JOIN LATERAL jsonb_each(psd.scenario_data) AS json_element ON 1=1
    WHERE psd.promo_id = var_promo_id
      AND NULLIF(json_element.value->>'scenario_id', 'null')::int = var_scenario_id
    LIMIT 1;

    query1_bxgy := format(
        $sql$
        DROP TABLE IF EXISTS %s;
        CREATE UNLOGGED TABLE %s AS
        WITH customers AS (
                select cm.c0_id, cm.c2_id
                FROM price_promo.tb_promo_customers tpc
                INNER JOIN global.customer_master cm ON tpc.customer_id = cm.c2_id
				where tpc.promo_id = %s 
            ),

	        store_segments AS (
	             SELECT DISTINCT sm.s0_id, sm.s3_id
	             FROM price_promo.fn_fetch_stores_for_promo(%s) fsp
	             JOIN global.tb_store_master sm ON sm.store_id = fsp.store_id
            ),

			filtered_customer_store as (
				 select c.*, s.* 
				 from customers c 
				 LEFT join store_segments s ON 1=1
				 inner join global.customer_channel_master  ccm 
				 on ccm.c0_id = c.c0_id and ccm.s0_id = s.s0_id
			),


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

        bxgy_data AS (
            select foo.*, 
			case 
				when bxgy_offer_type_id = 1 then unit_y_count::numeric/NULLIF(unit_x_count,0)  
				else 0
			end as value_to_spend_ratio
            from 
            (
            SELECT
                tko.promo_id, 
                75 AS offer_type_id, 
                'bxgy_offer' AS offer_type, 
                tkot.bxgy_offer_type_id,
                tkoup.product_id, tkou.unit_name, tkou.units_count,
                tko.discount_value,
                pdm.l0_cid, pdm.l1_cid, pdm.l2_cid, pdm.l3_cid,

                MAX(CASE WHEN tkou.unit_name = 'Y' THEN tkou.units_count END) 
			      OVER (PARTITION BY tko.promo_id) as unit_y_count, 
			      
			    MAX(CASE WHEN tkou.unit_name = 'X' THEN tkou.units_count END) 
			        OVER (PARTITION BY tko.promo_id) as unit_x_count,

                pdm.current_bnm_price, pdm.current_comm_price, pdm.current_ecom_its_price, pdm.current_c8_price, pdm.current_c9_price,
 				coalesce(pdm.shipping_cost,0) as shipping_cost, coalesce(pdm.rebate,0) as rebate, 
                pdm.current_ecom_lesl_price, pdm.current_price, pdm.cost
            FROM price_promo.tb_bxgy_offer tko
            JOIN price_promo.tb_bxgy_offer_type tkot ON tko.bxgy_offer_type_id = tkot.bxgy_offer_type_id
            JOIN price_promo.tb_bxgy_offer_units tkou ON tko.bxgy_offer_id = tkou.bxgy_offer_id
            JOIN price_promo.tb_bxgy_offer_unit_products tkoup ON tkou.bxgy_offer_units_id = tkoup.bxgy_offer_units_id
            JOIN price_promo.product_master pdm ON tkoup.product_id = pdm.product_id
            WHERE tko.promo_id = %s and tko.bxgy_offer_id = %s) foo
        ),

		scenario_discounts AS (
                SELECT 
                    psd.promo_id,
					NULLIF(json_element.value->>'tier_id', 'null')::int AS tier_id,
                    NULLIF(json_element.value->>'offer_type', 'null') AS offer_type,
                    NULLIF(json_element.value->>'offer_x_type', 'null') AS offer_x_type,
                    NULLIF(json_element.value->>'offer_y_type', 'null') AS offer_y_type,
                    NULLIF(json_element.value->>'offer_z_type', 'null') AS offer_z_type,
                    NULLIF(json_element.value->>'offer_value', 'null')::varchar AS direct_offer_value,
                    NULLIF(json_element.value->>'offer_x_value', 'null')::float AS offer_x_value,
                    NULLIF(json_element.value->>'offer_y_value', 'null')::float AS offer_y_value,
                    NULLIF(json_element.value->>'offer_z_value', 'null')::float AS offer_z_value,
                    NULLIF(json_element.value->>'special_offer_data', 'null') AS special_offer_data,
					NULLIF(json_element.value->>'bxgy_offer_id', 'null')::float AS bxgy_offer_id
                FROM price_promo.ps_scenario_discounts psd
                LEFT JOIN LATERAL jsonb_each(psd.scenario_data) AS json_element ON 1=1
                WHERE psd.promo_id = %s 
				AND NULLIF(json_element.value->>'scenario_id', 'null')::int = %s
            )

        SELECT 
            kd.promo_id, %s AS scenario_id, kd.offer_type_id, kd.offer_type, kd.discount_value,
            kd.product_id, kd.unit_name, kd.l0_cid, kd.l1_cid, kd.l2_cid, kd.l3_cid, kd.cost, 
			kd.shipping_cost, kd.rebate, kd.units_count, kd.value_to_spend_ratio,
            s.s0_id, s.s3_id, s.c0_id, s.c2_id as customer_id, cd.*,
            COALESCE(
                    dp.price,
                    CASE
                        -- Residential Cust (c0_id = 1, c2_id = 1)
                        WHEN s.c0_id = 1 AND s.c2_id = 1 AND s.s0_id = 1 THEN kd.current_bnm_price
                        WHEN s.c0_id = 1 AND s.c2_id = 1 AND s.s0_id = 3 THEN kd.current_ecom_its_price
                        WHEN s.c0_id = 1 AND s.c2_id = 1 AND s.s0_id = 4 THEN kd.current_ecom_lesl_price
                        -- Commercial Cust C1 to C7 (c0_id = 2, c2_id IN 5-11)
                        WHEN s.c0_id = 2 AND s.c2_id IN (5,6,7,8,9,10,11) AND s.s0_id IN (1,2) THEN kd.current_bnm_price
                        -- Commercial Cust C8 to C9 (c0_id = 2, c2_id = 12 or 13)
                        WHEN s.c0_id = 2 AND s.c2_id = 12 AND s.s0_id IN (1,2) THEN kd.current_c8_price
                        WHEN s.c0_id = 2 AND s.c2_id = 13 AND s.s0_id IN (1,2) THEN kd.current_c9_price
                        ELSE kd.current_price
                    END, kd.current_price
        
                ) AS current_price,

           CASE
                WHEN kd.bxgy_offer_type_id = 1 AND kd.unit_name = 'X' THEN 0
                WHEN kd.bxgy_offer_type_id = 2 AND kd.unit_name = 'X' THEN 0
                WHEN kd.bxgy_offer_type_id = 1 AND kd.unit_name = 'Y' THEN 100
                WHEN kd.bxgy_offer_type_id = 2 AND kd.unit_name = 'Y' THEN kd.discount_value
                ELSE 0
            END AS calculated_discount,
                CASE
                    WHEN psd.offer_type IN ('percent_off', 'extra_amount_off')
                        THEN psd.offer_x_value::varchar
                    WHEN psd.offer_type IN ('bxgx', 'bxgx_percent_off')
                        THEN psd.direct_offer_value::varchar
                    ELSE
                        price_promo.get_offer_description_v2(
                            psd.offer_type::text,
                            psd.bxgy_offer_id::numeric,
                            psd.offer_x_type::text,
                            psd.offer_y_value::numeric,
                            psd.offer_y_type::text,
                            psd.offer_z_value::numeric,
                            psd.tier_id::numeric,
                            psd.special_offer_data::jsonb
                        )::varchar
                END AS offer_type_combined_display_name
        FROM bxgy_data kd
        LEFT JOIN filtered_customer_store s ON 1=1
			LEFT JOIN price_promo.deviated_pricing dp 
				ON dp.product_id = kd.product_id 
				AND dp.c0_id = s.c0_id 
				AND dp.c2_id = s.c2_id 
				AND dp.s0_id = s.s0_id 
				AND dp.s3_id = s.s3_id
			LEFT JOIN scenario_discounts psd ON 1=1
			LEFT JOIN coupon_data cd on 1=1
			inner join price_promo.tb_product_eligibility pe on kd.product_id = pe.product_id::integer and s.c0_id = pe.c0_id
        $sql$,
        temp_table_name, temp_table_name, var_promo_id, var_promo_id, var_promo_id, 
		var_promo_id, psd_bxgy_id,var_promo_id, var_scenario_id, var_scenario_id
    );

    RAISE NOTICE 'Executing query1_bxgy: %', query1_bxgy;
    EXECUTE query1_bxgy;

------------
ELSE
        query2 := format($sql$
			DROP TABLE IF EXISTS %s;
            CREATE UNLOGGED TABLE %s AS
            WITH scenario_discounts AS (
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
                    NULLIF(json_element.value->>'offer_value', 'null')::varchar AS direct_offer_value, --
                    NULLIF(json_element.value->>'offer_x_value', 'null')::float AS offer_x_value,
                    NULLIF(json_element.value->>'offer_y_value', 'null')::float AS offer_y_value,
                    NULLIF(json_element.value->>'offer_z_value', 'null')::float AS offer_z_value,
                    NULLIF(json_element.value->>'special_offer_data', 'null') AS special_offer_data, --
                    NULLIF(json_element.value->>'scenario_type', 'null') AS scenario_type,
                    NULLIF(json_element.value->>'scenario_order_id', 'null')::int AS scenario_order_id,
                    NULLIF(json_element.value->>'qty', 'null')::int AS qty,
                    NULLIF(json_element.value->>'min_basket_value', 'null')::int AS min_basket_value
                FROM price_promo.ps_scenario_discounts psd
                LEFT JOIN LATERAL jsonb_each(psd.scenario_data) AS json_element ON 1=1
                WHERE psd.promo_id = %s 
				AND NULLIF(json_element.value->>'scenario_id', 'null')::int = %s
            ),

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
 	
            products AS (
                SELECT pp.product_id, pdm.l0_cid, pdm.l1_cid, pdm.l2_cid, pdm.l3_cid,
                       pdm.current_bnm_price, pdm.current_comm_price, pdm.current_ecom_its_price, pdm.current_c8_price, pdm.current_c9_price,
					   coalesce(pdm.shipping_cost,0) as shipping_cost, coalesce(pdm.rebate,0) as rebate, 
                       pdm.current_ecom_lesl_price, pdm.current_price, pdm.cost
                FROM price_promo.promo_product_%s pp
                INNER JOIN price_promo.product_master pdm ON pp.product_id = pdm.product_id
            ),

            customers AS (
                select cm.c0_id, cm.c2_id
                FROM price_promo.tb_promo_customers tpc
                INNER JOIN global.customer_master cm ON tpc.customer_id = cm.c2_id
				where tpc.promo_id = %s 
            ),

	        store_segments AS (
	             SELECT DISTINCT sm.s0_id, sm.s3_id
	             FROM price_promo.fn_fetch_stores_for_promo(%s) fsp
	             JOIN global.tb_store_master sm ON sm.store_id = fsp.store_id
            ),

			filtered_customer_store as (
				 select c.*, s.* 
				 from customers c 
				 LEFT join store_segments s ON 1=1
				 inner join global.customer_channel_master  ccm 
				 on ccm.c0_id = c.c0_id and ccm.s0_id = s.s0_id
			)

            SELECT 
                psd.promo_id, psd.scenario_id, psd.offer_type_id, psd.offer_type,
                p.product_id, 'A' as unit_name, p.l0_cid, p.l1_cid, p.l2_cid, p.l3_cid, p.cost,
                p.shipping_cost, p.rebate, 
                s.s0_id, s.s3_id, s.c0_id, s.c2_id as customer_id,
				cd.*,
                COALESCE(
                    dp.price,
                    CASE
                        -- Residential Cust (c0_id = 1, c2_id = 1)
                        WHEN s.c0_id = 1 AND s.c2_id = 1 AND s.s0_id = 1 THEN p.current_bnm_price
                        WHEN s.c0_id = 1 AND s.c2_id = 1 AND s.s0_id = 3 THEN p.current_ecom_its_price
                        WHEN s.c0_id = 1 AND s.c2_id = 1 AND s.s0_id = 4 THEN p.current_ecom_lesl_price
                        -- Commercial Cust C1 to C7 (c0_id = 2, c2_id IN 5-11)
                        WHEN s.c0_id = 2 AND s.c2_id IN (5,6,7,8,9,10,11) AND s.s0_id IN (1,2) THEN p.current_bnm_price
                        -- Commercial Cust C8 to C9 (c0_id = 2, c2_id = 12 or 13)
                        WHEN s.c0_id = 2 AND s.c2_id = 12 AND s.s0_id IN (1,2) THEN p.current_c8_price
                        WHEN s.c0_id = 2 AND s.c2_id = 13 AND s.s0_id IN (1,2) THEN p.current_c9_price
                        ELSE p.current_price
                    END, p.current_price
                ) AS current_price,
                LEAST( 
                    GREATEST(
                        CASE
                            WHEN psd.offer_type IN ('percent_off', 'upto_x_percent_off', 'free_installation') THEN psd.offer_x_value
                            WHEN psd.offer_type = 'extra_amount_off' THEN ((psd.offer_x_value / current_price) * 100)
                            WHEN psd.offer_type = 'fixed_price' THEN ((current_price - psd.offer_x_value) / current_price) * 100
                            WHEN psd.offer_type = 'bxgx' AND psd.offer_x_type = 'unit' AND psd.offer_y_type = 'unit' THEN (psd.offer_y_value*100)/(psd.offer_x_value + psd.offer_y_value)
                            WHEN psd.offer_type = 'bxgx_percent_off' AND psd.offer_x_type = 'unit' AND psd.offer_y_type = 'unit' 
							THEN ( (psd.offer_y_value*psd.offer_z_value)/(psd.offer_x_value + psd.offer_y_value) )
							WHEN psd.offer_type = 'bmsm_fixed_quantity' AND psd.offer_x_type = 'unit' AND psd.offer_y_type = 'percent_off'
							THEN (psd.offer_y_value)
							WHEN psd.offer_type = 'bmsm_fixed_quantity' AND psd.offer_x_type = 'unit' AND psd.offer_y_type = 'dollar_off'
							THEN (psd.offer_y_value / (psd.offer_x_value * current_price)) * 100
							WHEN psd.offer_type = 'bmsm_fixed_quantity' AND psd.offer_x_type = 'unit' AND psd.offer_y_type = 'at_dollar'
							THEN ((current_price - (psd.offer_y_value / psd.offer_x_value)) / current_price) * 100
							WHEN psd.offer_type = 'bmsm_transaction_discount' AND psd.offer_x_type = 'dollar' AND psd.offer_y_type = 'percent_off'
							THEN psd.offer_y_value
							WHEN psd.offer_type = 'bmsm_transaction_discount' AND psd.offer_x_type = 'dollar' AND psd.offer_y_type = 'dollar_off'
							THEN (psd.offer_y_value / psd.offer_x_value) * 100
							

							WHEN psd.offer_type = 'tiered_offer' THEN (
							SELECT
							-- handles transaction discount
							    COALESCE((
							        SUM(td.offer_x_value * td.offer_y_value) FILTER (
							            WHERE td.offer_x_type = 'dollar'
							              AND td.offer_y_type = 'percent_off'
							              AND td.offer_z_type IS NULL
							        ) * 0.01
							    ) / NULLIF(SUM(td.offer_x_value) FILTER (
							            WHERE td.offer_x_type = 'dollar'
							              AND td.offer_y_type = 'percent_off'
							              AND td.offer_z_type IS NULL
							        ), 0), 0) * 100
							
							    +

							    COALESCE((
							        SUM(td.offer_y_value) FILTER (
							            WHERE td.offer_x_type = 'dollar'
							              AND td.offer_y_type = 'dollar_off'
							              AND td.offer_z_type IS NULL
							        ) 
							    ) / NULLIF(SUM(td.offer_x_value) FILTER (
							            WHERE td.offer_x_type = 'dollar'
							              AND td.offer_y_type = 'dollar_off'
							              AND td.offer_z_type IS NULL
							        ), 0), 0) * 100
								+ 
							-- handles bxgx
							    COALESCE((
							        (1.0 / NULLIF(COUNT(*) FILTER (
							            WHERE td.offer_x_type = 'unit'
							              AND td.offer_y_type = 'unit'
							              AND td.offer_z_type IS NULL
							        ), 0)) *
							        SUM(td.offer_y_value::float / NULLIF(td.offer_x_value + td.offer_y_value, 0)) FILTER (
							            WHERE td.offer_x_type = 'unit'
							              AND td.offer_y_type = 'unit'
							              AND td.offer_z_type IS NULL
							        )
							    ), 0) * 100 
							
							    +
							-- handles bxgx percent off
							    COALESCE((
							        (1.0 / NULLIF(COUNT(*) FILTER (
							            WHERE td.offer_x_type = 'unit'
							              AND td.offer_y_type = 'unit'
							              AND td.offer_z_type = 'percent_off'
							        ), 0)) *
							        SUM(td.offer_y_value * td.offer_z_value * 0.01 / NULLIF(td.offer_x_value + td.offer_y_value, 0)) FILTER (
							            WHERE td.offer_x_type = 'unit'
							              AND td.offer_y_type = 'unit'
							              AND td.offer_z_type = 'percent_off'
							        )
							    ), 0) * 100
							
							    +
							-- handles multiple levels of fixed qty
							    COALESCE(AVG(td.offer_y_value) FILTER (
							        WHERE td.offer_x_type = 'unit'
							          AND td.offer_y_type = 'percent_off'
							          AND td.offer_z_type IS NULL
							    ), 0)

								+
							    
							    COALESCE(
							    (
							        SUM(td.offer_y_value) FILTER (
							            WHERE td.offer_x_type = 'unit'
							              AND td.offer_y_type = 'dollar_off'
							              AND td.offer_z_type IS NULL
							        )
							    ) / NULLIF(
							        current_price * SUM(td.offer_x_value) FILTER (
							            WHERE td.offer_x_type = 'unit'
							              AND td.offer_y_type = 'dollar_off'
							              AND td.offer_z_type IS NULL
							        )::numeric
							    , 0)
							, 0) * 100
							
							+
							
							COALESCE((
						    SUM(td.offer_x_value * current_price) - sum(td.offer_y_value) FILTER (
						        WHERE td.offer_x_type = 'unit'
						          AND td.offer_y_type = 'at_dollar'
						          AND td.offer_z_type IS NULL
						    )
						) / NULLIF(
						    SUM(td.offer_x_value * current_price) FILTER (
						        WHERE td.offer_x_type = 'unit'
						          AND td.offer_y_type = 'at_dollar'
						          AND td.offer_z_type IS NULL
						    ), 0
						) * 100, 0)
							
							AS calculated_discount
							FROM price_promo.tier_discounts td
							WHERE td.tier_id = psd.tier_id

							)


							ELSE 0
                        END,
                    0),
                100
                ) AS calculated_discount,
                CASE
                    WHEN psd.offer_type IN ('percent_off', 'extra_amount_off')
                        THEN psd.offer_x_value::varchar
                    WHEN psd.offer_type IN ('bxgx', 'bxgx_percent_off')
                        THEN psd.direct_offer_value::varchar
                    ELSE
                        price_promo.get_offer_description_v2(
                            psd.offer_type::text,
                            psd.offer_x_value::numeric,
                            psd.offer_x_type::text,
                            psd.offer_y_value::numeric,
                            psd.offer_y_type::text,
                            psd.offer_z_value::numeric,
                            psd.tier_id::numeric,
                            psd.special_offer_data::jsonb
                        )::varchar
                END AS offer_type_combined_display_name
            FROM products p
            LEFT JOIN filtered_customer_store s ON 1=1
			LEFT JOIN price_promo.deviated_pricing dp 
				ON dp.product_id = p.product_id 
				AND dp.c0_id = s.c0_id 
				AND dp.c2_id = s.c2_id 
				AND dp.s0_id = s.s0_id 
				AND dp.s3_id = s.s3_id
            LEFT JOIN scenario_discounts psd ON 1=1
			LEFT JOIN coupon_data cd on 1=1
			inner join price_promo.tb_product_eligibility pe on p.product_id = pe.product_id::integer and s.c0_id = pe.c0_id
        $sql$, temp_table_name,temp_table_name, var_promo_id,var_scenario_id,
		var_promo_id, var_promo_id,
		var_promo_id, var_promo_id);

        RAISE NOTICE 'Executing query2: %', query2;
        EXECUTE query2;
    END IF;


EXECUTE format('DROP INDEX IF EXISTS idx_pfr_resim_%s_%s', var_promo_id,var_scenario_id);
EXECUTE format('DROP INDEX IF EXISTS idx_pfr_resim_%s_%s_2', var_promo_id,var_scenario_id);
EXECUTE format('CREATE INDEX idx_pfr_resim_%s_%s ON %s using btree(s3_id, l0_cid)',
               var_promo_id,var_scenario_id, temp_table_name);
EXECUTE format('CREATE INDEX idx_pfr_resim_%s_%s_2 ON %s using btree(s0_id)',
               var_promo_id,var_scenario_id, temp_table_name);

------------------------------------------------------------------------------------------------------------------------------------------------------

-- for the optimization flow 
Else 

    -- Construct the query for table creation
        query_opt := format($sql$
			DROP TABLE IF EXISTS %s;
            CREATE UNLOGGED TABLE %s AS

           with products AS (
                SELECT pp.promo_id, pp.product_id, pdm.l0_cid, pdm.l1_cid, pdm.l2_cid, pdm.l3_cid,
                       pdm.current_bnm_price, pdm.current_comm_price, pdm.current_ecom_its_price, pdm.current_c8_price, pdm.current_c9_price,
					   coalesce(pdm.shipping_cost,0) as shipping_cost, coalesce(pdm.rebate,0) as rebate, 
                       pdm.current_ecom_lesl_price, pdm.current_price, pdm.cost
                FROM price_promo.promo_product_%s pp
                INNER JOIN price_promo.product_master pdm ON pp.product_id = pdm.product_id
            ),

            customers AS (
                select cm.c0_id, cm.c2_id
                FROM price_promo.tb_promo_customers tpc
                INNER JOIN global.customer_master cm ON tpc.customer_id = cm.c2_id
				where tpc.promo_id = %s 
            ),

	            store_segments AS (
	                SELECT DISTINCT sm.s0_id, sm.s3_id
	                FROM price_promo.fn_fetch_stores_for_promo(%s) fsp
	                JOIN global.tb_store_master sm ON sm.store_id = fsp.store_id
            ),

			filtered_customer_store as (
				 select c.*, s.* 
				 from customers c 
				 cross join store_segments s 
				 inner join global.customer_channel_master  ccm 
				 on ccm.c0_id = c.c0_id and ccm.s0_id = s.s0_id
			),


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

			ia_reco_details AS (
                SELECT 
                    psd.promo_id,
					NULLIF(json_element.value->>'tier_id', 'null')::int AS tier_id,
                    NULLIF(json_element.value->>'offer_type', 'null') AS offer_type,
                    NULLIF(json_element.value->>'offer_x_type', 'null') AS offer_x_type,
                    NULLIF(json_element.value->>'offer_y_type', 'null') AS offer_y_type,
                    NULLIF(json_element.value->>'offer_z_type', 'null') AS offer_z_type,
                    NULLIF(json_element.value->>'offer_value', 'null')::varchar AS direct_offer_value,
                    NULLIF(json_element.value->>'offer_x_value', 'null')::float AS offer_x_value,
                    NULLIF(json_element.value->>'offer_y_value', 'null')::float AS offer_y_value,
                    NULLIF(json_element.value->>'offer_z_value', 'null')::float AS offer_z_value,
                    NULLIF(json_element.value->>'special_offer_data', 'null') AS special_offer_data
                FROM price_promo.ps_scenario_discounts psd
                LEFT JOIN LATERAL jsonb_each(psd.ia_recommended_data) AS json_element ON 1=1
                WHERE psd.promo_id = %s
            )

            SELECT 
                
                p.promo_id, p.product_id, p.l0_cid, p.l1_cid, p.l2_cid, p.l3_cid, p.cost,
                p.shipping_cost, p.rebate, 
                s.s0_id, s.s3_id,  s.c0_id, s.c2_id as customer_id, cd.*,
                COALESCE(
                    dp.price,
                    CASE
                        -- Residential Cust (c0_id = 1, c2_id = 1)
                        WHEN s.c0_id = 1 AND s.c2_id = 1 AND s.s0_id = 1 THEN p.current_bnm_price
                        WHEN s.c0_id = 1 AND s.c2_id = 1 AND s.s0_id = 3 THEN p.current_ecom_its_price
                        WHEN s.c0_id = 1 AND s.c2_id = 1 AND s.s0_id = 4 THEN p.current_ecom_lesl_price
                        -- Commercial Cust C1 to C7 (c0_id = 2, c2_id IN 5-11)
                        WHEN s.c0_id = 2 AND s.c2_id IN (5,6,7,8,9,10,11) AND s.s0_id IN (1,2) THEN p.current_bnm_price
                        -- Commercial Cust C8 to C9 (c0_id = 2, c2_id = 12 or 13)
                        WHEN s.c0_id = 2 AND s.c2_id = 12 AND s.s0_id IN (1,2) THEN p.current_c8_price
                        WHEN s.c0_id = 2 AND s.c2_id = 13 AND s.s0_id IN (1,2) THEN p.current_c9_price
                        ELSE p.current_price
                    END, p.current_price
                    
                ) AS current_price,
				CASE
                    WHEN psd.offer_type IN ('percent_off', 'extra_amount_off')
                        THEN psd.offer_x_value::varchar
                    WHEN psd.offer_type IN ('bxgx', 'bxgx_percent_off')
                        THEN psd.direct_offer_value::varchar
                    ELSE
                        price_promo.get_offer_description_v2(
                            psd.offer_type::text,
                            psd.offer_x_value::numeric,
                            psd.offer_x_type::text,
                            psd.offer_y_value::numeric,
                            psd.offer_y_type::text,
                            psd.offer_z_value::numeric,
                            psd.tier_id::numeric,
                            psd.special_offer_data::jsonb
                        )::varchar
                END AS offer_type_combined_display_name

            FROM products p
            LEFT JOIN filtered_customer_store s ON 1=1
			LEFT JOIN price_promo.deviated_pricing dp 
				ON dp.product_id = p.product_id 
				AND dp.c0_id = s.c0_id 
				AND dp.c2_id = s.c2_id 
				AND dp.s0_id = s.s0_id 
				AND dp.s3_id = s.s3_id
			LEFT JOIN ia_reco_details psd ON 1=1
			LEFT join coupon_data cd ON 1=1
			inner join price_promo.tb_product_eligibility pe on p.product_id = pe.product_id::integer and s.c0_id = pe.c0_id
        $sql$, temp_table_name,temp_table_name, var_promo_id,var_promo_id, 
var_promo_id, var_promo_id, var_promo_id);

        RAISE NOTICE 'Executing query_opt: %', query_opt;
        EXECUTE query_opt;

END IF;


END;
$procedure$
;