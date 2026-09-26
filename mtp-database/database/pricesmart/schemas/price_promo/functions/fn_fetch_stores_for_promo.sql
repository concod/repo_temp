--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:fn_fetch_stores_for_promo_24052025 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for fn_fetch_stores_for_promo

-- Purpose: Retrieves store IDs associated with a promotion based on the store selection type
--
-- Example:
-- SELECT * FROM price_promo.fn_fetch_stores_for_promo(123);
--
-- Other Functions or procedures Used:
-- * None
--
-- Tables Used:
-- * promo_master - Reads store selection type for the given promo
-- * tb_store_master - Reads store information based on selection type
-- * promo_store_{promo_id} - Reads store mappings for specific promo types
--
-- Returns:
-- Table with columns:
-- * promo_id (integer) - The input promotion ID
-- * store_id (integer) - Associated store ID based on selection type

-- DROP FUNCTION price_promo.fn_fetch_stores_for_promo(int4);
DROP FUNCTION IF EXISTS price_promo.fn_fetch_stores_for_promo();

CREATE OR REPLACE FUNCTION price_promo.fn_fetch_stores_for_promo(in_promo_id integer)
 RETURNS TABLE(promo_id integer, store_id integer)
 LANGUAGE plpgsql
AS $function$
DECLARE
    _store_selection_type INT;
BEGIN
    -- Get the store_selection_type
    SELECT pm.store_selection_type
    INTO _store_selection_type
    FROM price_promo.promo_master pm
    WHERE pm.promo_id = in_promo_id
    LIMIT 1;

    -- Check if store_selection_type is valid
    IF _store_selection_type IS NULL THEN
        RAISE NOTICE 'No store selection type found for Promo ID %', in_promo_id;
        RETURN QUERY
        SELECT
        NULL::INT AS promo_id,
        NULL::INT AS store_id limit 0;
    ELSIF _store_selection_type NOT IN (1, 2, 3, 4, 5, 6, 7) THEN
        RAISE NOTICE 'Promo ID % does not have a valid store selection type', in_promo_id;
        RETURN QUERY
        SELECT
            in_promo_id::INT AS promo_id,
            NULL::INT AS store_id limit 0;

    -- Conditional logic based on store_selection_type
    ELSIF _store_selection_type = 1 THEN
        -- Fetch store data directly
        RETURN QUERY
        SELECT
            in_promo_id::INT AS promo_id,
            tsm.store_id::INT AS store_id
        FROM 
            global.tb_store_master tsm
        WHERE 
            tsm.is_active = 1;

    ELSIF _store_selection_type IN (2, 3) THEN
        -- Fetch store data using dynamic SQL and EXECUTE with USING
        RETURN QUERY EXECUTE '
            SELECT
                $1::INT AS promo_id,
                tsm.store_id::INT AS store_id
            FROM
                global.tb_store_master tsm
            WHERE
                tsm.s1_id = CASE $2
                    WHEN 2 THEN 2
                    WHEN 3 THEN 1
                    ELSE NULL
                END and tsm.is_active = 1'
        USING in_promo_id, _store_selection_type;

    ELSIF _store_selection_type IN (4, 5, 6) THEN
        -- Fetch store data from the promo_store partitioned table using EXECUTE with USING
        RETURN QUERY EXECUTE '
            SELECT
                $1::INT AS promo_id,
                ps.store_id::INT AS store_id
            FROM
                price_promo.promo_store_' || in_promo_id || ' ps
            WHERE
                ps.promo_id = $1'
        USING in_promo_id;

    ELSIF _store_selection_type = 7 THEN
        -- Fetch store data from the promo_store partitioned table using EXECUTE with USING
        RETURN QUERY EXECUTE '
            SELECT
                $1::INT AS promo_id,
                ps.store_id::INT AS store_id
            FROM
                price_promo.promo_store_' || in_promo_id || ' ps
            WHERE
                ps.promo_id = $1'
        USING in_promo_id;
    END IF;

END;
$function$
;
