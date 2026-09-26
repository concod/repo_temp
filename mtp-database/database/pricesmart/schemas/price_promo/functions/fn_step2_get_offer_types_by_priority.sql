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
    _priority_number integer
) RETURNS TABLE(
    offer_type_id integer, 
    offer_type character varying, 
    display_name character varying
) LANGUAGE plpgsql
AS $function$
DECLARE
    min_product_level_id integer;
    min_store_level_id integer;
    query_text text;
BEGIN
    min_product_level_id := (SELECT MIN(id) FROM unnest(_product_level_ids) AS id);
    min_store_level_id := (SELECT MIN(id) FROM unnest(_store_level_ids) AS id);

    query_text := 'SELECT tasm.id AS offer_type_id, tasm.name AS offer_type, tasm.display_name 
    FROM price_promo.tb_valid_offers_priority vp 
    JOIN metaschema.tb_app_sub_master tasm 
    ON tasm.id = vp.offer_type_id 
    WHERE vp.product_discount_level_id = ' || min_product_level_id || ' AND vp.store_discount_level_id = ' || min_store_level_id || ' AND vp.priority_number = ' || _priority_number || ' 
    AND tasm.master_id = (SELECT id FROM metaschema.tb_app_master WHERE name = ''Offer type'') 
    AND tasm.is_active = 1 AND tasm.sub_parent = 1 ORDER BY 1;';

    RAISE NOTICE 'Executing query: %', query_text;

    RETURN QUERY EXECUTE query_text;
END;
$function$;
