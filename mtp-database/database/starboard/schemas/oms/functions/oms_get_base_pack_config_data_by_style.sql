--liquibase formatted sql
--changeset chandranil:pack_config_data_by_style runOnChange:true stripComments:false splitStatements:false context:MTP-57372 labels:MTP-70112_2
--comment: Updated action_oms_orders SP to support order_group_id


DROP FUNCTION IF EXISTS oms.oms_get_pack_config_data_by_style(TEXT);

CREATE OR REPLACE FUNCTION oms.oms_get_pack_config_data_by_style(
    in_style TEXT
)
RETURNS TABLE(size character varying, result JSONB) AS
$$
DECLARE
    dyn_sql TEXT;
BEGIN
    -- Step 1: Build the dynamic SQL using WITH MATERIALIZED
    WITH pack_combos AS MATERIALIZED (
        SELECT DISTINCT pack_id
        FROM oms.oms_pack_config
        WHERE style = in_style
    )
    SELECT INTO dyn_sql
        'SELECT size, ' ||
        string_agg(
            FORMAT(
                'SUM(CASE WHEN pack_id = %L THEN units_in_pack ELSE 0 END) AS "%s"',
                pack_id, pack_id
            ),
            ', '
            ORDER BY pack_id
        ) ||
        ' FROM oms.oms_pack_config
           WHERE style = ' || quote_literal(in_style) ||
        ' GROUP BY size ORDER BY size'
    FROM pack_combos;

    -- Step 2: Return the results as JSON
    RETURN QUERY EXECUTE FORMAT(
        'SELECT size, to_jsonb(t) - ''size'' AS result FROM (%s) t',
        dyn_sql
    );

END;
$$ LANGUAGE plpgsql;
