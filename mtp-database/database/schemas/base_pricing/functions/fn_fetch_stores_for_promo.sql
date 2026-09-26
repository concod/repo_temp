--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:fn_fetch_stores_for_promo runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for fn_fetch_stores_for_promo


-- DROP FUNCTION base_pricing.fn_fetch_stores_for_promo(int4);
DROP FUNCTION IF EXISTS base_pricing.fn_fetch_stores_for_promo();

CREATE OR REPLACE FUNCTION base_pricing.fn_fetch_stores_for_promo(in_promo_id integer)
 RETURNS TABLE(promo_id integer, store_id integer)
 LANGUAGE plpgsql
AS $function$
DECLARE
    _store_selection_type INT;
BEGIN
    -- Get the store_selection_type
    SELECT pm.store_selection_type
    INTO _store_selection_type
    FROM base_pricing.promo_master pm
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
                base_pricing.promo_store_' || in_promo_id || ' ps
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
                base_pricing.promo_store_' || in_promo_id || ' ps
            WHERE
                ps.promo_id = $1'
        USING in_promo_id;
    END IF;

END;
$function$
;
