--liquibase formatted sql
--changeset chandranil.ghosh:pack_config_data_by_style_and_fiscal_week_5 runOnChange:true stripComments:false splitStatements:false context:MTP-57372 labels:MTP-70112_2
--comment: exclude manual orders


DROP FUNCTION IF EXISTS inventory_smart.oms_get_pack_config_data_by_style_and_fiscal_week(TEXT, TEXT);

CREATE OR REPLACE FUNCTION inventory_smart.oms_get_pack_config_data_by_style_and_fiscal_week(
    in_style TEXT,
    in_fiscal_week TEXT
)
RETURNS TABLE(size character varying, result JSONB) AS
$$
DECLARE
    dyn_sql TEXT;
BEGIN
    -- Step 1: Build dynamic SQL using WITH MATERIALIZED CTE
    WITH pack_combos AS MATERIALIZED (
        SELECT DISTINCT loc_code, pack_id
        FROM inventory_smart.oms_orders_recommended
        WHERE article = in_style
          AND fiscal_year_week::text = in_fiscal_week AND order_gen_type <> 'Manual'
    )
    SELECT INTO dyn_sql
        'SELECT size, ' ||
        string_agg(
            FORMAT(
                'CASE WHEN loc_code = %L AND pack_id = %L THEN MAX(order_quantity_eaches) ELSE 0 END AS "%s_%s"',
                loc_code, pack_id, loc_code, pack_id
            ),
            ', '
            ORDER BY pack_id
        ) || ', MAX(order_quantity_eaches) AS total'
        || ' FROM inventory_smart.oms_orders_recommended
          WHERE order_gen_type <> ''Manual'' AND article = ' || quote_literal(in_style) ||
        ' AND fiscal_year_week = ' || quote_literal(in_fiscal_week) ||
        ' GROUP BY size, loc_code, pack_id ORDER BY size'
    FROM pack_combos;

    -- Step 2: Return the result
    RETURN QUERY EXECUTE FORMAT(
        'SELECT size, to_jsonb(t) - ''size'' AS result FROM (%s) t',
        dyn_sql
    );
END;
$$ LANGUAGE plpgsql;
