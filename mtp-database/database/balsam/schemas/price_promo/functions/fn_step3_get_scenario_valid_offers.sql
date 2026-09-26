--liquibase formatted sql
--changeset nikhil.shet@impactanalytics.co:fn_step3_get_scenario_valid_offers runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: Function to return valid offers for a given promotion ID and applicable offer type IDs


DROP FUNCTION IF EXISTS price_promo.fn_step3_get_scenario_valid_offers;

CREATE OR REPLACE FUNCTION price_promo.fn_step3_get_scenario_valid_offers(
    _promo_id integer,
    _applicable_offer_type_ids integer[]
) RETURNS jsonb LANGUAGE plpgsql
AS $function$
-- Purpose: Returns valid offers with pricing constraints for a given promotion ID and applicable offer type IDs.
-- Example: SELECT * FROM price_promo.fn_step3_get_scenario_valid_offers(20, ARRAY[1,2,3]);
-- Tables Used:
--   - price_promo.promo_master: Contains promotion master data
--   - price_promo.product_master: Contains product data with pricing
--   - price_promo.promo_product: Maps products to promotions
--   - metaschema.tb_app_sub_master: Contains metadata for offer types
--   - metaschema.tb_app_master: Contains master metadata for application categories
-- Returns: A JSONB object containing valid offers with pricing constraints for the promotion

DECLARE
    result jsonb;
    query_text text;
BEGIN
    
    query_text := '
    WITH max_price_cte AS (
        WITH product_selection_type_cte AS (
            SELECT product_selection_type 
            FROM price_promo.promo_master 
            WHERE promo_id = ' || _promo_id || '
        )
        SELECT 
            CASE 
                WHEN pst.product_selection_type = 1 THEN 
                    (SELECT 
                        ROUND(MIN(msrp_with_vat::NUMERIC), 2)
                    FROM price_promo.product_master 
                    WHERE is_active = 1)
                ELSE 
                    (SELECT 
                        ROUND(MIN(msrp_with_vat::NUMERIC), 2)
                    FROM price_promo.product_master pm2 
                    WHERE product_id IN (
                        SELECT product_id 
                        FROM price_promo.promo_product 
                        WHERE promo_id = ' || _promo_id || '))
            END AS max_price
        FROM product_selection_type_cte pst
    ),
    offer_types_cte AS (
        SELECT
            tasm.id AS offer_type_id,
            tasm.name AS offer_type,
            tasm.display_name AS offer_display_name,
            NULL AS offer_value,
            NULL::numeric AS effective_discount,
            CASE
                WHEN tasm.name IN (''fixed_price'', ''extra_amount_off'', ''percent_off'', ''bxgy_percent_off'', ''bmsm'', ''upto_x_percent_off'') THEN 0
                ELSE NULL::numeric
            END AS min_price,
            CASE
                WHEN tasm.name IN (''fixed_price'', ''extra_amount_off'') THEN COALESCE(mp.max_price, 0)
                WHEN tasm.name IN (''percent_off'', ''bxgy_percent_off'', ''bmsm'', ''upto_x_percent_off'') THEN 100
                ELSE NULL::numeric
            END AS max_price
        FROM 
            metaschema.tb_app_sub_master tasm
        LEFT JOIN 
            max_price_cte mp ON TRUE
        WHERE
            tasm.id = ANY(ARRAY[' || array_to_string(_applicable_offer_type_ids, ',') || '])
            AND tasm.name IN (''fixed_price'', ''extra_amount_off'', ''percent_off'', ''bxgy'', ''bxgy_percent_off'', ''bmsm'', ''tiered_offer'', ''special_offer_type'', ''upto_x_percent_off'')
            AND tasm.master_id IN (
                SELECT id
                FROM metaschema.tb_app_master
                WHERE name = ''Offer type''
            )
            AND (
                tasm.sub_parent IN (
                    SELECT pm.ad_type AS sub_parent
                    FROM price_promo.promo_master pm
                    WHERE pm.promo_id = ' || _promo_id || '
                )
                OR tasm.sub_parent = 0
            )
            AND tasm.is_active = 1
        ORDER BY offer_type
    )
    SELECT jsonb_build_object(
        ' || _promo_id || ', jsonb_agg(offer_data)
    )
    FROM (
        SELECT
            jsonb_build_object(
                ''offer_type_id'', offer_type_id,
                ''offer_type'', offer_type,
                ''offer_display_name'', offer_display_name,
                ''min_price'', min_price,
                ''max_price'', max_price,
                ''offer_values'', (
                    SELECT jsonb_agg(
                        jsonb_build_object(
                            ''offer_value'', co2.offer_value,
                            ''effective_discount'', co2.effective_discount
                        )
                    )
                    FROM offer_types_cte co2
                    WHERE co2.offer_type = co1.offer_type
                    AND co2.offer_value IS NOT NULL
                    AND co2.effective_discount IS NOT NULL
                )
            ) AS offer_data
        FROM offer_types_cte co1
        GROUP BY offer_type_id, offer_type, offer_display_name, min_price, max_price
    ) subquery';
    
    -- Print the query text for debugging
    RAISE NOTICE 'Query: %', query_text;
    
    -- Execute the query
    EXECUTE query_text INTO result;
    
    -- Return empty array if result is NULL
    result := COALESCE(result, jsonb_build_object(_promo_id, '[]'::jsonb));
    
    RETURN result;
END;
$function$;
