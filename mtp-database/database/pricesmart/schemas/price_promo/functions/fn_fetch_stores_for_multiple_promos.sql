--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:fn_fetch_stores_for_multiple_promos runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for fn_fetch_stores_for_multiple_promos

DROP FUNCTION IF EXISTS price_promo.fn_fetch_stores_for_multiple_promos;

CREATE OR REPLACE FUNCTION price_promo.fn_fetch_stores_for_multiple_promos(
    var_promo_ids INT[]
)
RETURNS TABLE (promo_id INT, store_id INT) AS
$$
DECLARE
    p_id INT;
BEGIN
    FOREACH p_id IN ARRAY var_promo_ids
    LOOP
        RETURN QUERY
        SELECT result.promo_id, result.store_id
        FROM price_promo.fn_fetch_stores_for_promo(p_id) AS result;
    END LOOP;
END;
$$
LANGUAGE plpgsql;
