--liquibase formatted sql
--changeset liquibase:fn_refresh_promo_stores_3 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: function_change_2 fn_refresh_promo_stores_3
--rollback: SELECT 1
DROP FUNCTION if exists price_promo.fn_refresh_promo_stores;
CREATE OR REPLACE FUNCTION price_promo.fn_refresh_promo_stores(_promo_id integer, _store_ids integer[] DEFAULT ARRAY[]::integer[])
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
DECLARE
BEGIN
    -- Delete Promo Stores.
    DELETE FROM price_promo.promo_store ps WHERE ps.promo_id = _promo_id;

    -- Insert New Promo Stores.
    IF array_length(_store_ids, 1) > 0 then
    	execute format('create table if not exists price_promo.promo_store_%1$s PARTITION OF price_promo.promo_store FOR VALUES IN (%1$s)', _promo_id);
        WITH promo_stores_info_cte AS (
            SELECT 
                _promo_id AS promo_id,
                store_id,
                store_name
            FROM 
                pricesmart.tb_store_master sm 
            WHERE 
                sm.store_id = ANY(_store_ids)
        )
        INSERT INTO price_promo.promo_store(promo_id, store_id, store_name)
        SELECT 
            promo_id, store_id, store_name
        FROM 
            promo_stores_info_cte;
    END IF;

    -- Update New Promo Stores Count.
    UPDATE price_promo.promo_master 
    SET stores_count = (SELECT count(distinct store_id) FROM price_promo.promo_store WHERE promo_id = _promo_id)
    WHERE promo_id = _promo_id;

    RETURN 1;
END;
$function$
;
