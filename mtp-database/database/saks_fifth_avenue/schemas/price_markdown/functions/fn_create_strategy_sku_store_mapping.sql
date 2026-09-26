--liquibase formatted sql
--changeset vamsi.balaga@impactanalytics.co:fn_create_strategy_sku_store_mapping_6 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: updated function to include only products with inventory based on _allow_only_with_inv flag
--rollback: SELECT 1

DROP FUNCTION if exists price_markdown.fn_create_strategy_sku_store_mapping;
CREATE OR REPLACE FUNCTION price_markdown.fn_create_strategy_sku_store_mapping(
    p_strategy_id integer,
    p_product_ids bigint[],
    p_store_ids bigint[],
    p_selected_all_flag boolean,
    p_selected_sku_store_ids jsonb,
    p_unselected_sku_store_ids jsonb,
    _allow_only_with_inv boolean DEFAULT true
)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
    DECLARE
        query text;
    BEGIN
        RAISE NOTICE 'strategy_id :%', p_strategy_id;

        -- Partition creation
        query := format('CREATE TABLE IF NOT EXISTS price_markdown.tb_strategy_sku_store_mapping_%1$s PARTITION OF price_markdown.tb_strategy_sku_store_mapping FOR VALUES IN (%1$L)', p_strategy_id);
        RAISE NOTICE 'partition query ----   %', query;
        EXECUTE query;

        query := format('CREATE INDEX IF NOT EXISTS strategy_sku_store_mapping_%1$s_idx ON price_markdown.tb_strategy_sku_store_mapping_%1$s USING btree
            (strategy_id ASC NULLS LAST, product_id ASC NULLS LAST, store_id ASC NULLS LAST)', p_strategy_id);
        RAISE NOTICE 'index query ----   %', query;
        EXECUTE query;

        IF p_selected_all_flag IS TRUE THEN
            RAISE NOTICE 'Inserting all mappings';

            IF _allow_only_with_inv THEN
                INSERT INTO price_markdown.tb_strategy_sku_store_mapping (strategy_id, product_id, store_id, channel_info, price, "cost")
                SELECT p_strategy_id AS strategy_id,
                    pm.product_id,
                    sm.store_id,
                    'Omni',
                    COALESCE(
                        tpsp.last_reg_price,
                        CASE WHEN sm.s1_name = 'Ecom' THEN pm.last_reg_price_ecom ELSE pm.last_reg_price_bnm END
                    ) AS current_price,
                    pm."cost"
                FROM (SELECT unnest(p_product_ids) AS product_id) AS products
                CROSS JOIN (SELECT unnest(p_store_ids) AS store_id) AS stores
                INNER JOIN global.tb_store_master sm ON sm.store_id = stores.store_id
                INNER JOIN price_markdown.product_master pm ON pm.product_id = products.product_id
                LEFT JOIN price_markdown.tb_product_store_price tpsp ON tpsp.product_id = products.product_id AND tpsp.store_id = stores.store_id
                INNER JOIN global.tb_latest_inventory inv ON inv.product_id = pm.product_id
                    AND inv.store_id = sm.store_id
                    AND inv.oh > 0;
            ELSE
                INSERT INTO price_markdown.tb_strategy_sku_store_mapping (strategy_id, product_id, store_id, channel_info, price, "cost")
                SELECT p_strategy_id AS strategy_id,
                    pm.product_id,
                    sm.store_id,
                    'Omni',
                    COALESCE(
                        tpsp.last_reg_price,
                        CASE WHEN sm.s1_name = 'Ecom' THEN pm.last_reg_price_ecom ELSE pm.last_reg_price_bnm END
                    ) AS current_price,
                    pm."cost"
                FROM (SELECT unnest(p_product_ids) AS product_id) AS products
                CROSS JOIN (SELECT unnest(p_store_ids) AS store_id) AS stores
                INNER JOIN global.tb_store_master sm ON sm.store_id = stores.store_id
                INNER JOIN price_markdown.product_master pm ON pm.product_id = products.product_id
                LEFT JOIN price_markdown.tb_product_store_price tpsp ON tpsp.product_id = products.product_id AND tpsp.store_id = stores.store_id;
            END IF;

        ELSE
            IF p_selected_sku_store_ids IS NOT NULL THEN
                IF _allow_only_with_inv THEN
                    INSERT INTO price_markdown.tb_strategy_sku_store_mapping (strategy_id, product_id, store_id, channel_info, price, "cost")
                    SELECT p_strategy_id AS strategy_id,
                        sku_stores.product_id,
                        sm.store_id,
                        'Omni',
                        COALESCE(
                            tpsp.last_reg_price,
                            CASE WHEN sm.s1_name = 'Ecom' THEN pm.last_reg_price_ecom ELSE pm.last_reg_price_bnm END
                        ) AS current_price,
                        pm."cost"
                    FROM jsonb_to_recordset(p_selected_sku_store_ids) AS sku_stores(product_id integer, store_id integer)
                    INNER JOIN global.tb_store_master sm ON sm.store_id = sku_stores.store_id
                    INNER JOIN price_markdown.product_master pm ON pm.product_id = sku_stores.product_id
                    LEFT JOIN price_markdown.tb_product_store_price tpsp ON tpsp.product_id = sku_stores.product_id AND tpsp.store_id = sku_stores.store_id
                    INNER JOIN global.tb_latest_inventory inv ON inv.product_id = sku_stores.product_id
                        AND inv.store_id = sku_stores.store_id
                        AND inv.oh > 0;
                ELSE
                    INSERT INTO price_markdown.tb_strategy_sku_store_mapping (strategy_id, product_id, store_id, channel_info, price, "cost")
                    SELECT p_strategy_id AS strategy_id,
                        sku_stores.product_id,
                        sm.store_id,
                        'Omni',
                        COALESCE(
                            tpsp.last_reg_price,
                            CASE WHEN sm.s1_name = 'Ecom' THEN pm.last_reg_price_ecom ELSE pm.last_reg_price_bnm END
                        ) AS current_price,
                        pm."cost"
                    FROM jsonb_to_recordset(p_selected_sku_store_ids) AS sku_stores(product_id integer, store_id integer)
                    INNER JOIN global.tb_store_master sm ON sm.store_id = sku_stores.store_id
                    INNER JOIN price_markdown.product_master pm ON pm.product_id = sku_stores.product_id
                    LEFT JOIN price_markdown.tb_product_store_price tpsp ON tpsp.product_id = sku_stores.product_id AND tpsp.store_id = sku_stores.store_id;
                END IF;

            ELSE
                IF _allow_only_with_inv THEN
                    INSERT INTO price_markdown.tb_strategy_sku_store_mapping (strategy_id, product_id, store_id, channel_info, price, "cost")
                    SELECT p_strategy_id AS strategy_id,
                        pm.product_id,
                        sm.store_id,
                        'Omni',
                        COALESCE(
                            tpsp.last_reg_price,
                            CASE WHEN sm.s1_name = 'Ecom' THEN pm.last_reg_price_ecom ELSE pm.last_reg_price_bnm END
                        ) AS current_price,
                        pm."cost"
                    FROM (SELECT unnest(p_product_ids) AS product_id) AS products
                    CROSS JOIN (SELECT unnest(p_store_ids) AS store_id) AS stores
                    INNER JOIN global.tb_store_master sm ON sm.store_id = stores.store_id
                    INNER JOIN price_markdown.product_master pm ON pm.product_id = products.product_id
                    LEFT JOIN price_markdown.tb_product_store_price tpsp ON tpsp.product_id = products.product_id AND tpsp.store_id = stores.store_id
                    INNER JOIN global.tb_latest_inventory inv ON inv.product_id = pm.product_id
                        AND inv.store_id = sm.store_id
                        AND inv.oh > 0
                    WHERE (pm.product_id, sm.store_id) NOT IN (
                        SELECT product_id, store_id
                        FROM jsonb_to_recordset(p_unselected_sku_store_ids) AS sku_stores(product_id integer, store_id integer)
                    );
                ELSE
                    INSERT INTO price_markdown.tb_strategy_sku_store_mapping (strategy_id, product_id, store_id, channel_info, price, "cost")
                    SELECT p_strategy_id AS strategy_id,
                        pm.product_id,
                        sm.store_id,
                        'Omni',
                        COALESCE(
                            tpsp.last_reg_price,
                            CASE WHEN sm.s1_name = 'Ecom' THEN pm.last_reg_price_ecom ELSE pm.last_reg_price_bnm END
                        ) AS current_price,
                        pm."cost"
                    FROM (SELECT unnest(p_product_ids) AS product_id) AS products
                    CROSS JOIN (SELECT unnest(p_store_ids) AS store_id) AS stores
                    INNER JOIN global.tb_store_master sm ON sm.store_id = stores.store_id
                    INNER JOIN price_markdown.product_master pm ON pm.product_id = products.product_id
                    LEFT JOIN price_markdown.tb_product_store_price tpsp ON tpsp.product_id = products.product_id AND tpsp.store_id = stores.store_id
                    WHERE (pm.product_id, sm.store_id) NOT IN (
                        SELECT product_id, store_id
                        FROM jsonb_to_recordset(p_unselected_sku_store_ids) AS sku_stores(product_id integer, store_id integer)
                    );
                END IF;
            END IF;
        END IF;

        -- Insert into tb_strategy_sku_store_count
        INSERT INTO price_markdown.tb_strategy_sku_store_count
        SELECT strategy_id, COUNT(DISTINCT product_id) AS sku_count, COUNT(DISTINCT store_id) AS store_count
        FROM price_markdown.tb_strategy_sku_store_mapping
        WHERE strategy_id = p_strategy_id
        GROUP BY strategy_id;

        -- Insert/update SKU and store hierarchy in tb_strategy_hierarchy
        CALL price_markdown.pc_insert_product_store_hierarchy(p_strategy_id::integer);

        RETURN p_strategy_id;
    END;
$function$
;
