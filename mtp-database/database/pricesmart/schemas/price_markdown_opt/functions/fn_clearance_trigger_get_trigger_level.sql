--liquibase formatted sql
--changeset liquibase:fn_clearance_trigger_get_trigger_level runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for fn_clearance_trigger_get_trigger_level

DROP FUNCTION IF EXISTS price_markdown_opt.fn_clearance_trigger_get_trigger_level;

CREATE OR REPLACE FUNCTION price_markdown_opt.fn_clearance_trigger_get_trigger_level(_trigger_id integer)
RETURNS TABLE (
    product_trigger_level_col text,
    store_trigger_level_col text
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        CASE
            WHEN tctim.product_trigger_level = -200 THEN '-200'
            WHEN tctim.product_trigger_level = 0 THEN 'l0_cid'
            WHEN tctim.product_trigger_level = 1 THEN 'l1_cid'
            WHEN tctim.product_trigger_level = 2 THEN 'l2_cid'
            WHEN tctim.product_trigger_level = 3 THEN 'l3_cid'
            WHEN tctim.product_trigger_level = 4 THEN 'l4_cid'
            WHEN tctim.product_trigger_level = 6 THEN 'product_id'
            ELSE NULL
        END AS product_trigger_level_col,
        CASE
            WHEN tctim.store_trigger_level = -200 THEN '-200'
            WHEN tctim.store_trigger_level = 0 THEN 's0_id'
            WHEN tctim.store_trigger_level = 1 THEN 's1_id'
            WHEN tctim.store_trigger_level = 6 THEN 'store_id'
            ELSE NULL
        END AS store_trigger_level_col
    FROM price_markdown.tb_clearance_trigger_info_master tctim
    WHERE tctim.trigger_id = _trigger_id;
END;
$$ LANGUAGE plpgsql;