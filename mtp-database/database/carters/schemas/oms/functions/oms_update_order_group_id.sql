--liquibase formatted sql
--changeset raja.duraisamy:update_order_group_id_2 runOnChange:true stripComments:false splitStatements:false context:MTP-54660 labels:update_order_group_id
--comment: Created update_order_group_id_2
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.oms_update_order_group_id(success_orders INT[]);

CREATE OR REPLACE FUNCTION inventory_smart.oms_update_order_group_id(success_orders INT[])
RETURNS VOID AS
$$
BEGIN
    UPDATE inventory_smart.oms_orders_recommended oor
    SET order_group_id = MD5(
    CONCAT(
            COALESCE(paf.style, ''),
            COALESCE(order_placement_date::text, ''),
            COALESCE(order_placement_recom_date::text, ''),
            CASE WHEN order_status_id = 0 THEN 'True' ELSE 'False' END
        )
    )
    FROM global.product_attributes_filter paf
    WHERE oor.id = ANY(success_orders)
    AND oor.style = paf.style;
END;
$$
LANGUAGE plpgsql;