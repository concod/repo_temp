--liquibase formatted sql
--changeset durgaprasad.tulugu@impactanalytics.co:fn_check_inventory_availability_2 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: fn_check_inventory_availability_2
--rollback: SELECT 1

DROP FUNCTION if exists price_markdown.fn_check_inventory_availability;


CREATE OR REPLACE FUNCTION price_markdown.fn_check_inventory_availability(_product_ids integer[] DEFAULT NULL::integer[], _store_ids integer[] DEFAULT NULL::integer[])
 RETURNS boolean
 LANGUAGE plpgsql
AS $function$
DECLARE
    total_inventory bigint;
BEGIN
    IF array_length(_product_ids, 1) IS NULL OR array_length(_store_ids, 1) IS NULL THEN
        RETURN FALSE;
    END IF;

    WITH strategy_sku_store_mapping_cte AS (
        SELECT 
            * 
        FROM 
            (SELECT unnest(_product_ids) AS product_id) t1, 
            (SELECT unnest(_store_ids) AS store_id) t2
    )
    SELECT 
        COALESCE(SUM(tli.total_inventory), 0) INTO total_inventory
    FROM 
        pricesmart.tb_latest_inventory tli
    WHERE 
        (product_id, store_id) IN (
            SELECT DISTINCT product_id, store_id 
            FROM strategy_sku_store_mapping_cte
        );

    RETURN total_inventory > 0;
END;
$function$
;
