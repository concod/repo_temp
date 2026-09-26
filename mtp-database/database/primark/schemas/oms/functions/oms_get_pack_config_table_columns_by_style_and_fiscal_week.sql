--liquibase formatted sql
--changeset chandranil.ghosh:pack_config_table_columns_by_style_and_fiscal_week_3 runOnChange:true stripComments:false splitStatements:false context:MTP-57372 labels:MTP-70112_2
--comment: exclude manual orders


DROP FUNCTION IF EXISTS oms.oms_get_pack_config_table_columns_by_style_and_fiscal_week(text, text);

CREATE OR REPLACE FUNCTION oms.oms_get_pack_config_table_columns_by_style_and_fiscal_week(
    in_style TEXT,
    in_fiscal_week TEXT
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
        FROM oms.oms_orders_recommended
        WHERE article = in_style
          AND fiscal_year_week::text = in_fiscal_week AND order_gen_type <> 'Manual'
    ) sub
    ORDER BY pack_id, loc_code;
END;
$$ LANGUAGE plpgsql;