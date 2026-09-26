--liquibase formatted sql
--changeset nikhil.shet@impactanalytics.co:fn_step2_get_priority_number stripComments:false runOnChange:true splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for fn_step2_get_priority_number

-- Purpose: Calculates and returns the priority number for a given offer type based on the minimum product and store discount levels.
-- Example: SELECT * FROM price_promo.fn_step2_get_priority_number(1, ARRAY[100, 101], ARRAY[200, 201]);
-- Other Functions Used:
--   - None
-- Tables Used:
--   - tb_valid_offers_priority: Stores valid offers with associated priority numbers.
--   - tb_priority_number: Contains priority numbers and their display names.
-- Returns: A table with columns:
--   - label: Varchar, display name of the priority.
--   - value: Integer, the priority number.

DROP FUNCTION IF EXISTS price_promo.fn_step2_get_priority_number;
CREATE OR REPLACE FUNCTION price_promo.fn_step2_get_priority_number(
    _promo_id integer, 
    _product_level_ids integer[], 
    _store_level_ids integer[],
    _offer_type_id integer DEFAULT NULL
) RETURNS TABLE(
    label character varying, 
    value integer
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

    query_text := 'SELECT DISTINCT pn.priority_display_name AS label, pn.priority_number AS value 
    FROM price_promo.tb_valid_offers_priority vp 
    JOIN price_promo.tb_priority_number pn 
    ON vp.priority_number = pn.priority_number 
    WHERE pn.is_active = 1';

    IF max_product_level_id IS NOT NULL THEN
        query_text := query_text || ' AND vp.product_discount_level_id = ' || max_product_level_id;
    END IF;

    IF max_store_level_id IS NOT NULL THEN
        query_text := query_text || ' AND vp.store_discount_level_id = ' || max_store_level_id;
    END IF;

    IF _offer_type_id IS NOT NULL THEN
        query_text := query_text || ' AND vp.offer_type_id = ' || _offer_type_id;
    END IF;

    RAISE NOTICE 'Executing query: %', query_text;

    RETURN QUERY EXECUTE query_text;
END;
$function$; 