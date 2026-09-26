--liquibase formatted sql
--changeset chandranil.ghosh:pack_config_table_columns_by_order_group_id_3 runOnChange:true stripComments:false splitStatements:false context:MTP-57372 labels:MTP-70112_2
--comment: exclude manual orders


DROP function if EXISTS inventory_smart.oms_get_pack_config_table_columns_by_order_group_id(text, text);


CREATE OR REPLACE FUNCTION inventory_smart.oms_get_pack_config_table_columns_by_order_group_id(
    in_style TEXT,
    in_order_group_id TEXT
)
RETURNS TABLE(column_name TEXT, label TEXT) AS
$$
BEGIN
    RETURN QUERY
    SELECT 
        CONCAT(loc_code, '_', pack_id) AS column_name,
        CONCAT('DC: ',loc_code, ' - ','Pack ID: ', pack_id) AS "label"
    FROM (
        SELECT DISTINCT pack_id, loc_code
        FROM inventory_smart.oms_orders_recommended
        WHERE article = in_style
          AND order_group_id = in_order_group_id AND order_gen_type <> 'Manual'
    ) sub
    ORDER BY pack_id, loc_code;
END;
$$ LANGUAGE plpgsql;