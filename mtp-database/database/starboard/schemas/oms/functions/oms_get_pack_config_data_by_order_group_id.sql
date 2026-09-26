--liquibase formatted sql
--changeset chandranil.ghosh:pack_config_data_by_order_group_id_5 runOnChange:true stripComments:false splitStatements:false context:MTP-57372 labels:MTP-70112_2
--comment: exclude manual orders


DROP FUNCTION IF EXISTS oms.oms_get_pack_config_data_by_order_group_id(TEXT, TEXT);

CREATE OR REPLACE FUNCTION oms.oms_get_pack_config_data_by_order_group_id(
    in_style TEXT,
    in_order_group_id TEXT
)
RETURNS TABLE(size character varying, result JSONB) AS
$$
DECLARE
    dyn_sql TEXT;
    combo_count INT;
BEGIN
    -- Step 1: Count combos
    SELECT COUNT(*) INTO combo_count
    FROM (
        SELECT DISTINCT loc_code, pack_id
        FROM oms.oms_orders_recommended
        WHERE article = in_style
          AND order_group_id::text = in_order_group_id AND order_gen_type <> 'Manual'
    ) AS pack_combos;

    -- Step 2: Exit early if no combos
    IF combo_count = 0 THEN
        RETURN;
    END IF;

    -- Step 3: Use WITH CTE
    WITH pack_combos AS MATERIALIZED (
        SELECT DISTINCT loc_code, pack_id
        FROM oms.oms_orders_recommended
        WHERE article = in_style
          AND order_group_id::text = in_order_group_id AND order_gen_type <> 'Manual'
    )
    SELECT INTO dyn_sql
        'SELECT size, ' ||
        string_agg(
            FORMAT(
                'SUM(CASE WHEN loc_code = %L AND pack_id = %L THEN order_quantity_eaches ELSE 0 END) AS "%s_%s"',
                loc_code, pack_id, loc_code, pack_id
            ),
            ', '
            ORDER BY pack_id
        ) || ', SUM(order_quantity_eaches) AS total'
        || ' FROM oms.oms_orders_recommended
          WHERE order_gen_type <> ''Manual'' AND article = ' || quote_literal(in_style) ||
        ' AND order_group_id = ' || quote_literal(in_order_group_id) ||
        ' GROUP BY size ORDER BY size'
    FROM pack_combos;

    -- Step 4: Return results
    RETURN QUERY EXECUTE FORMAT(
        'SELECT size, to_jsonb(t) - ''size'' AS result FROM (%s) t',
        dyn_sql
    );
END;

$$ LANGUAGE plpgsql;
