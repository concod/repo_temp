--liquibase formatted sql
--changeset kailash.k:oms_update_order_group_id_store runOnChange:true stripComments:false splitStatements:false context:MTP-107837 labels:MTP-107837
--comment: MTP-107837
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.oms_update_order_group_id_store(success_orders integer[]);

CREATE OR REPLACE FUNCTION inventory_smart.oms_update_order_group_id_store(success_orders integer[])
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
    UPDATE inventory_smart.oms_orders_recommended_store oors
    SET order_group_id = MD5(
    CONCAT(
            COALESCE(paf.article, ''),
            COALESCE(order_placement_date::text, ''),
            COALESCE(order_placement_recom_date::text, ''),
            COALESCE(order_status_id::text, '')
        )
    )
    FROM global.product_attributes_filter paf
    WHERE oors.id = ANY(success_orders)
    AND oors.article = paf.article;
END;
$function$
;