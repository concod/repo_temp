--liquibase formatted sql
--changeset nikhil.shet@impactanalytics.co:fn_step2_get_offer_types_by_priority stripComments:false runOnChange:true splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for fn_step2_get_offer_types_by_priority

-- Purpose: Retrieves offer types by priority for a given promotion, product level, and store level.
-- Example: SELECT * FROM price_promo.fn_step2_get_offer_types_by_priority(1, ARRAY[100, 101], ARRAY[200, 201], 3);
-- Other Functions Used:
--   - None
-- Tables Used:
--   - tb_valid_offers_priority: Stores valid offers with associated priority numbers.
--   - tb_app_sub_master: Contains metadata for application subcategories, including offer types.
--   - tb_app_master: Holds master metadata for application categories.
-- Returns: A table with columns:
--   - offer_type_id: Integer, ID of the offer type.
--   - offer_type: Varchar, name of the offer type.
--   - display_name: Varchar, display name of the offer type.

DROP FUNCTION IF EXISTS price_promo.fn_step2_get_offer_types_by_priority;

CREATE OR REPLACE FUNCTION price_promo.fn_step2_get_offer_types_by_priority(
    _promo_id integer, 
    _product_level_ids integer[], 
    _store_level_ids integer[], 
    _priority_number integer,
    _optimization_flag integer DEFAULT 0
) RETURNS TABLE(
    offer_type_id integer, 
    offer_type character varying, 
    display_name character varying
) LANGUAGE plpgsql
AS $function$
DECLARE
    max_product_level_id integer;
    max_store_level_id integer;
    query_text text;
BEGIN
    IF _product_level_ids IS NOT NULL AND array_length(_product_level_ids, 1) > 0 THEN
        max_product_level_id := (SELECT dlc.discount_level_id 
            FROM price_promo.discount_level_config dlc
            WHERE dlc.discount_level_id = ANY(_product_level_ids)
            AND dlc.category = 'product'
            ORDER BY dlc.sort_order DESC
            LIMIT 1
        );

    END IF;

    IF _store_level_ids IS NOT NULL AND array_length(_store_level_ids, 1) > 0 THEN
        max_store_level_id := (SELECT dlc.discount_level_id 
            FROM price_promo.discount_level_config dlc
            WHERE dlc.discount_level_id = ANY(_store_level_ids)
            AND dlc.category = 'store'
            ORDER BY dlc.sort_order DESC
            LIMIT 1
        );
    END IF;

    query_text := 'SELECT DISTINCT tom.id AS offer_type_id, tom.name::varchar AS offer_type, tom.display_name::varchar
    FROM price_promo.tb_valid_offers_priority vp 
    JOIN price_promo.tb_offer_master tom 
    ON tom.id = vp.offer_type_id 
    WHERE True';

    IF max_product_level_id IS NOT NULL THEN
        query_text := query_text || ' AND vp.product_discount_level_id = ' || max_product_level_id;
    END IF;

    IF max_store_level_id IS NOT NULL THEN
        query_text := query_text || ' AND vp.store_discount_level_id = ' || max_store_level_id;
    END IF;

    IF _priority_number IS NOT NULL THEN
        query_text := query_text || ' AND vp.priority_number = ' || _priority_number;
    END IF;
    
    -- Add optimization filter if optimization flag is set to 1
    IF _optimization_flag = 1 THEN
        query_text := query_text || ' AND vp.optimization_applicability = 1';
    END IF;
    
    -- Add the remaining conditions
    query_text := query_text || ' AND tom.is_active = 1 ORDER BY 1;';

    RAISE NOTICE 'Executing query: %', query_text;

    RETURN QUERY EXECUTE query_text;
END;
$function$; 