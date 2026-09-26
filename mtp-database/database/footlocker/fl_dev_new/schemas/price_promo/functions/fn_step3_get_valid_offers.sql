--liquibase formatted sql
--changeset nikhil.shet@impactanalytics.co:fn_step3_get_valid_offers runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for fn_step3_get_valid_offers


DROP FUNCTION IF EXISTS price_promo.fn_step3_get_valid_offers;
CREATE OR REPLACE FUNCTION price_promo.fn_step3_get_valid_offers(
    _promo_id integer,
    _optimization_flag integer DEFAULT 0
) RETURNS jsonb LANGUAGE plpgsql
AS $function$

-- Purpose: Returns valid offers with pricing constraints for a given promotion ID.
-- Example: SELECT * FROM price_promo.fn_step3_get_valid_offers(20);
-- Other Functions Used:
--   - fn_step2_get_offer_types_by_priority: Gets applicable offer types based on priority and discount levels
-- Tables Used:
--   - price_promo.promo_master: Contains promotion master data
--   - price_promo.product_master: Contains product data with pricing
--   - price_promo.promo_product: Maps products to promotions
--   - metaschema.tb_app_sub_master: Contains metadata for offer types
--   - metaschema.tb_app_master: Contains master metadata for application categories
-- Returns: A JSONB object containing valid offers with pricing constraints for the promotion

DECLARE
    result jsonb;
    discount_levels record;
    _applicable_offer_type_ids integer[];
    query_text text;
BEGIN
    -- Get the first priority number and discount levels for the promotion directly from ps_rules
    SELECT 
        priority_number,
        product_discount_level,
        COALESCE(store_discount_level, ARRAY[-200]::integer[]) AS store_discount_level
    INTO discount_levels 
    FROM price_promo.ps_rules
    WHERE promo_id = _promo_id
    ORDER BY priority_number
    LIMIT 1;
    
    -- If no discount levels found, return empty result
    IF discount_levels IS NULL THEN
        RETURN jsonb_build_object(_promo_id, '[]'::jsonb);
    END IF;
    
    -- Get applicable offer types using fn_step2_get_offer_types_by_priority
    SELECT 
        array_agg(offer_type_id) INTO _applicable_offer_type_ids
    FROM 
        price_promo.fn_step2_get_offer_types_by_priority(
            _promo_id, 
            discount_levels.product_discount_level, 
            discount_levels.store_discount_level, 
            discount_levels.priority_number,
            _optimization_flag
        );

    -- If no applicable offer types, return empty result
    IF _applicable_offer_type_ids IS NULL OR array_length(_applicable_offer_type_ids, 1) IS NULL THEN
        RETURN jsonb_build_object(_promo_id, '[]'::jsonb);
    END IF;
    
    -- Based on optimization flag, call the appropriate function
    IF _optimization_flag = 1 THEN
        -- Call the optimization-specific function
        RETURN price_promo.fn_step3_get_optimization_valid_offers(_promo_id, _applicable_offer_type_ids);
    ELSE
        -- Call the scenario function with applicable offer types
        RETURN price_promo.fn_step3_get_scenario_valid_offers(_promo_id, _applicable_offer_type_ids);
    END IF;
END;
$function$;
