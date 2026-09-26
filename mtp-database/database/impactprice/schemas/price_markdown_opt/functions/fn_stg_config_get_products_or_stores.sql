--liquibase formatted sql
--changeset liquibase:fn_stg_config_get_products_or_stores_1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for fn_stg_config_get_products_or_stores_1

DROP FUNCTION IF EXISTS price_markdown_opt.fn_stg_config_get_products_or_stores(int4, text);


CREATE OR REPLACE FUNCTION price_markdown_opt.fn_stg_config_get_products_or_stores(_strategy_config_id integer, _product_store text)
 RETURNS TABLE(strategy_config_id integer, product_or_store_id bigint)
 LANGUAGE plpgsql
AS $function$
DECLARE
    where_clause TEXT := '';
    record RECORD;
    query_text TEXT;
BEGIN
    IF _product_store = 'product' THEN
        FOR record IN
            SELECT hierarchy_level, array_agg(hierarchy_level_id) AS array_hier_ids
            FROM price_markdown.tb_strategy_config_product_hierarchies a
            WHERE a.strategy_config_id = _strategy_config_id
            GROUP BY hierarchy_level
        LOOP
            IF where_clause != '' THEN
                where_clause := where_clause || ' AND ';
            END IF;

            IF record.hierarchy_level = 100 THEN
                where_clause := where_clause || format('brand_cid IN (%s)',
                                                       array_to_string(record.array_hier_ids, ', '));
            ELSE
                where_clause := where_clause || format('%I IN (%s)',
                                                       'l' || record.hierarchy_level || '_cid',
                                                       array_to_string(record.array_hier_ids, ', '));
            END IF;
        END LOOP;

        -- Construct the full query string for products
        query_text := 'SELECT $1 AS strategy_config_id, product_id AS product_or_store_id FROM
                      pricesmart.product_master WHERE ' || where_clause || '
                      AND  is_active = 1';

    ELSIF _product_store = 'store' THEN
        FOR record IN
            SELECT hierarchy_level, array_agg(hierarchy_level_id) AS array_hier_ids
            FROM price_markdown.tb_strategy_config_store_hierarchies a
            WHERE a.strategy_config_id = _strategy_config_id
            GROUP BY hierarchy_level
        LOOP
            IF where_clause != '' THEN
                where_clause := where_clause || ' AND ';
            END IF;

            where_clause := where_clause || format('s%s_id IN (%s)',
                                                   record.hierarchy_level,
                                                   array_to_string(record.array_hier_ids, ', '));
        END LOOP;

        -- Construct the full query string for stores
        query_text := 'SELECT $1 AS strategy_config_id, store_id::bigint AS product_or_store_id FROM
                      pricesmart.tb_store_master WHERE ' || where_clause || '
                      AND is_active = 1';
    ELSE
        RAISE EXCEPTION 'Invalid value for product_store: %', product_store;
    END IF;

    -- Raise a notice with the query being executed
    RAISE NOTICE 'Executing query: %', query_text;

    -- Execute dynamic SQL query
    RETURN QUERY EXECUTE query_text USING _strategy_config_id;
END;
$function$
;
