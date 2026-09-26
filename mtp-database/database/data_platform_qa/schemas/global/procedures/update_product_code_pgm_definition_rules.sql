--liquibase formatted sql
--changeset srishti.kumari:update_product_code_pgm_definition_rules runOnChange:true stripComments:false splitStatements:false context:MTP-57431 labels:MTP-57431
--comment: update_product_code_pgm_definition_rules for lB
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS "global".update_product_code_pgm_definition_rules();
CREATE OR REPLACE PROCEDURE "global".update_product_code_pgm_definition_rules()
LANGUAGE plpgsql
AS $procedure$
	declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := '"global".update_product_code_pgm_definition_rules';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
BEGIN
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
    RAISE NOTICE '-------------------------------------------------------------';

    -- Step 1: Fetch valid products
    WITH combined_rules AS (
        SELECT
            pgdrm.pg_code,
            string_agg(DISTINCT '(' || pgd.pseudo_code || ')', ' OR ') AS combined_pseudo_rules,
            array_agg(DISTINCT pgr.pgr_code) AS combined_rules_code
        FROM global.product_group_definitions pgd
        JOIN global.product_group_definitions_rules_mapping pgdrm
            ON pgd.pgd_code = pgdrm.pgd_code
        JOIN global.product_group_rules pgr
            ON pgdrm.pgr_code = pgr.pgr_code
        WHERE pgr.is_deleted = false
        AND pgdrm.pg_code IS NOT NULL
        GROUP BY pgdrm.pg_code
    ),

    valid_products AS (
        SELECT DISTINCT
            cr.pg_code,
            product_subquery.product_code
        FROM combined_rules cr
        CROSS JOIN LATERAL global.execute_dynamic_query(
            cr.combined_pseudo_rules,
            cr.combined_rules_code
        ) AS product_subquery
    ),

    -- Step 2: Delete obsolete or inactive products
    deleted_rows AS (
    DELETE FROM global.product_groups_mapping pgm
    WHERE pgm.pg_code IN (
        SELECT DISTINCT pg_code 
        FROM global.product_group_definitions_rules_mapping 
        WHERE pg_code IS NOT NULL
        AND pg_code NOT IN (SELECT DISTINCT pg_code FROM valid_products)
    )
    OR (
        pgm.pg_code IN (SELECT DISTINCT pg_code FROM valid_products)
        AND NOT EXISTS (
            SELECT 1 FROM valid_products vp
            WHERE vp.pg_code = pgm.pg_code
            AND vp.product_code = pgm.product_code
        )
    )
    RETURNING pgm.*
	)

    -- Step 3: Insert valid products into product_groups_mapping
    INSERT INTO global.product_groups_mapping (pg_code, product_code)
    SELECT pg_code, product_code
    FROM valid_products
    ON CONFLICT (pg_code, product_code) DO NOTHING;

    RAISE NOTICE 'Product groups mapping updated successfully';

EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error updating product groups mapping: %', SQLERRM;
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
END;
$procedure$;