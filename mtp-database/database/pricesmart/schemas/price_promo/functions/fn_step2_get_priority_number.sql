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
    _store_level_ids integer[]
) RETURNS TABLE(
    label character varying, 
    value integer
) LANGUAGE plpgsql
AS $function$
DECLARE
    min_product_level_id integer;
    min_store_level_id integer;
    query_text text;
BEGIN
    min_product_level_id := (SELECT MIN(id) FROM unnest(_product_level_ids) AS id);
    min_store_level_id := (SELECT MIN(id) FROM unnest(_store_level_ids) AS id);

    query_text := 'SELECT DISTINCT pn.priority_display_name AS label, pn.priority_number AS value 
    FROM price_promo.tb_valid_offers_priority vp 
    JOIN price_promo.tb_priority_number pn 
    ON vp.priority_number = pn.priority_number 
    WHERE vp.product_discount_level_id = ' || min_product_level_id || ' AND vp.store_discount_level_id = ' || min_store_level_id || ' 
    AND pn.is_active = 1;';

    RAISE NOTICE 'Executing query: %', query_text;

    RETURN QUERY EXECUTE query_text;
END;
$function$;
