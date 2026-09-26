--liquibase formatted sql
--changeset nikhil.shet@impactanalytics.co:fn_step3_get_optimization_valid_offers runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: Function to return valid offers with optimization applicability for a given promotion ID

DROP FUNCTION IF EXISTS price_promo.fn_step3_get_optimization_valid_offers;

CREATE OR REPLACE FUNCTION price_promo.fn_step3_get_optimization_valid_offers(
    _promo_id integer,
    _applicable_offer_type_ids integer[]
) RETURNS jsonb LANGUAGE plpgsql
AS $function$
-- Purpose: Returns valid offers with pricing constraints for a given promotion ID, filtered for optimization applicability.
-- Example: SELECT * FROM price_promo.fn_step3_get_optimization_valid_offers(20);
-- Other Functions Used:
--   - fn_step2_get_offer_types_by_priority: Gets applicable offer types based on priority and discount levels
-- Tables Used:
--   - price_promo.promo_master: Contains promotion master data
--   - price_promo.product_master: Contains product data with pricing
--   - price_promo.promo_product: Maps products to promotions
--   - price_promo.tb_valid_offers_priority: Contains valid offer types with optimization applicability
-- Returns: A JSONB object containing valid offers with pricing constraints for the promotion, filtered for optimization
--   - price_promo.tb_offer_master: Contains data for offer types

DECLARE
    result jsonb;
    discount_levels record;
    query_text text;
BEGIN

    -- Construct the query text for execution and debugging
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
                         ROUND(MIN(promo_base_price::NUMERIC), 2) 
                    FROM price_promo.product_master 
                    WHERE is_active = 1)
                ELSE 
                    (SELECT 
                        ROUND(MIN(promo_base_price::NUMERIC), 2)
                    FROM price_promo.product_master pm2 
                    WHERE product_id IN (
                        SELECT product_id 
                        FROM price_promo.promo_product 
                        WHERE promo_id = ' || _promo_id || ')
                    )
            END AS max_price
        FROM product_selection_type_cte pst
    ),
    offer_types_cte AS (
        SELECT
            tom.id AS offer_type_id,
            tom.name AS offer_type,
            tom.display_name AS offer_display_name,
            NULL AS offer_value,
            NULL::numeric AS effective_discount,
            tom.min_value::numeric AS min_price,
            CASE
                WHEN tom.take_max_value_from_product_master = true THEN COALESCE(mp.max_price, 0)
                ELSE tom.max_value::numeric
            END AS max_price
        FROM price_promo.tb_offer_master tom
        LEFT JOIN max_price_cte mp ON tom.take_max_value_from_product_master = true
        INNER JOIN price_promo.tb_valid_offers_priority vop ON vop.offer_type_id = tom.id AND vop.optimization_applicability = 1
        WHERE
            tom.is_active = 1
    ),
    upto_x_percent_cte as (
    	SELECT
            tom.id AS offer_type_id,
            tom.name AS offer_type,
            tom.display_name AS offer_display_name,
            pr.discount_type::text,
            NULL::numeric AS effective_discount,
            COALESCE(pr.min_upto_percent, 0) AS min_price,
            COALESCE(pr.max_upto_percent, 100) AS max_price
        FROM price_promo.tb_offer_master tom 
        LEFT JOIN (SELECT discount_type,min_upto_percent,max_upto_percent FROM price_promo.ps_rules WHERE promo_id = ' || _promo_id || ') AS pr ON pr.discount_type = tom.name
        WHERE tom.id = 14
        AND tom.is_active = 1
    ),
    bxgx_cte AS (
        SELECT
            tom.id AS offer_type_id,
            tom.name AS offer_type,
            tom.display_name AS offer_display_name,
            bp.offer_value::text,
            bp.discount_filter AS effective_discount,
            NULL::numeric AS min_price,
            NULL::numeric AS max_price
        FROM price_promo.bxgy_percentage bp
        LEFT JOIN price_promo.tb_offer_master tom ON bp.offer_type::text = tom.name
        WHERE
            tom.is_active = 1
            AND bp.offer_value::text NOT LIKE ''% %''
        GROUP BY
            tom.id, tom.name, tom.display_name, bp.offer_type::text, bp.offer_value::text, bp.discount_filter
    ),
    bxgx_percent_off_cte AS (
        SELECT
            tom.id AS offer_type_id,
            tom.name AS offer_type,
            tom.display_name AS offer_display_name,
            bp.offer_value::text,
            bp.discount_filter AS effective_discount,
            NULL::numeric AS min_price,
            NULL::numeric AS max_price
        FROM price_promo.bxgy_percentage bp
        LEFT JOIN price_promo.tb_offer_master tom ON bp.offer_type::text = tom.name
        WHERE
            tom.is_active = 1
            AND bp.offer_value::text LIKE ''% %''
        GROUP BY
            tom.id, tom.name, tom.display_name, bp.offer_type::text, bp.offer_value::text, bp.discount_filter
        ORDER BY offer_type
    ),
    combined_offers_cte AS (
        SELECT * FROM offer_types_cte
        UNION ALL
        SELECT * FROM bxgx_cte
        UNION ALL
        SELECT * FROM bxgx_percent_off_cte
        UNION ALL
        SELECT * FROM upto_x_percent_cte
    )
    SELECT json_build_object(
     ' || _promo_id || ', json_agg(offer_data)
    ) AS result
    FROM (
        SELECT
            json_build_object(
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
                    FROM combined_offers_cte co2
                    WHERE co2.offer_type = co1.offer_type
                    AND co2.offer_value IS NOT NULL
                    AND co2.effective_discount IS NOT NULL
                )
            ) AS offer_data
        FROM combined_offers_cte co1
        WHERE co1.offer_type_id = ANY(ARRAY[' || array_to_string(_applicable_offer_type_ids, ',') || '])
        GROUP BY offer_type_id, offer_type, offer_display_name, min_price, max_price
    ) subquery;';
    
    -- Print the query text for debugging
    RAISE NOTICE 'Query: %', query_text;
    
    -- Execute the query
    EXECUTE query_text INTO result;
    
    -- Return empty array if result is NULL
    result := COALESCE(result, jsonb_build_object(_promo_id, '[]'::jsonb));
    
    RETURN result;
END;
$function$;