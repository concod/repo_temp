--liquibase formatted sql
--changeset chandranil:pack_config_table_columns_by_style_2 runOnChange:true stripComments:false splitStatements:false context:MTP-57372 labels:MTP-70112_2
--comment: Updated action_oms_orders SP to support order_group_id


DROP FUNCTION IF EXISTS oms.oms_get_base_pack_config_table_columns_by_style(text);
CREATE OR REPLACE FUNCTION oms.oms_get_base_pack_config_table_columns_by_style(in_style TEXT)
RETURNS TABLE(column_name TEXT, label TEXT) AS
$$
BEGIN
    RETURN QUERY
    SELECT 
        pack_id::TEXT AS column_name,
        CONCAT('Pack ', pack_id) AS label
    FROM oms.oms_pack_config
    WHERE style = in_style
    GROUP BY pack_id
    ORDER BY pack_id;
END;
$$ LANGUAGE plpgsql;