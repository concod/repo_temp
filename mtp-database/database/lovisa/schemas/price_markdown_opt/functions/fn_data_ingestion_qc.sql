--liquibase formatted sql
--changeset keerthana.reddy@impactanalytics.co:fn_data_ingestion_qc_16032026 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for fn_data_ingestion_qc

DROP FUNCTION IF EXISTS price_markdown_opt.fn_data_ingestion_qc;

CREATE OR REPLACE FUNCTION price_markdown_opt.fn_data_ingestion_qc(table_names text[] DEFAULT NULL::text[])
 RETURNS TABLE (
    _table_name   varchar(255),
    _check_name   varchar(255),
    _count        int4,
    _description  varchar(255),
    _qc_timestamp timestamp
)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    start_time timestamp;
    end_message text;
    failed_tables_count integer;
    sql_query text;
BEGIN
    start_time := current_timestamp;
    RAISE NOTICE 'Start time: %', start_time;
    RAISE NOTICE 'Table filter: %', COALESCE(array_to_string(table_names, ', '), 'ALL TABLES');
    
    -- Set work_mem and other performance parameters for this session
    -- This helps with large sorts and hash joins
    EXECUTE 'SET LOCAL work_mem = ''256MB''';
    EXECUTE 'SET LOCAL enable_hashjoin = on';
    EXECUTE 'SET LOCAL enable_mergejoin = on';

    -- 1. CLEANUP: Ensure no old temp tables exist
    DROP TABLE IF EXISTS price_markdown_opt_temp.fiscal_date_qc;
    DROP TABLE IF EXISTS price_markdown_opt_temp.prod_master_qc;
    DROP TABLE IF EXISTS price_markdown_opt_temp.product_store_price_qc;
    DROP TABLE IF EXISTS price_markdown_opt_temp.store_master_qc;
    DROP TABLE IF EXISTS price_markdown_opt_temp.global_tables_checks;
    DROP TABLE IF EXISTS price_markdown_opt_temp.forex_tables_qc;
    DROP TABLE IF EXISTS price_markdown_opt_temp.latest_inventory_qc;
    DROP TABLE IF EXISTS price_markdown_opt_temp.transaction_latest_qc;
    DROP TABLE IF EXISTS price_markdown_opt_temp.simulation_week_qc;
    DROP TABLE IF EXISTS price_markdown_opt_temp.day_split_qc;
    DROP TABLE IF EXISTS price_markdown_opt_temp.store_split_qc;
    DROP TABLE IF EXISTS price_markdown_opt_temp.applicable_mkd_price_points_qc;
    DROP TABLE IF EXISTS price_markdown_opt_temp.all_count_check_qc;

    -- 2. FISCAL DATE CHECKS
    IF table_names IS NULL OR 'global.tb_fiscal_date_mapping' = ANY(table_names) THEN
        EXECUTE '
        CREATE UNLOGGED TABLE price_markdown_opt_temp.fiscal_date_qc AS (
            SELECT 
                ''global.tb_fiscal_date_mapping'' AS table_name,
                ''date_validity_check'' AS check_name, 
                COUNT(1) AS count, 
                ''counts number of invalid calendar dates'' AS description
            FROM global.tb_fiscal_date_mapping
            WHERE date IS NULL
               OR date < ''1900-01-01''::date
               OR date > ''2100-12-31''::date
        )';
    ELSE
        EXECUTE '
        CREATE UNLOGGED TABLE price_markdown_opt_temp.fiscal_date_qc AS (
            SELECT 
                ''global.tb_fiscal_date_mapping''::text AS table_name,
                ''date_validity_check''::text AS check_name,
                0::bigint AS count,
                ''skipped''::text AS description
            WHERE 1=0
        )';
    END IF;

    -- 3. PRODUCT MASTER CHECKS
    IF table_names IS NULL OR 'price_markdown.product_master' = ANY(table_names) THEN
		EXECUTE '
		CREATE UNLOGGED TABLE price_markdown_opt_temp.prod_master_qc AS (
			WITH base_prod_master AS (
				SELECT * FROM price_markdown.product_master WHERE is_active = 1
			),
			nulls_check_1 AS (
				SELECT 
					''nulls_check_1'' AS check_name, 
					COUNT(1) AS count, 
					''nulls in cost/msrp/msrp_with_vat'' AS description
				FROM base_prod_master 
				WHERE cost IS NULL OR msrp IS NULL OR msrp_with_vat IS NULL OR age_month_bucket IS NULL
			),
			nulls_check_2 AS (
				SELECT 
					''nulls_check_2'' AS check_name, 
					COUNT(1) AS count,
					''counts number of products have nulls in product_id, hirerachy cids'' AS description
				FROM base_prod_master 
				WHERE product_id IS NULL
				   OR l0_cid IS NULL
				   OR l1_cid IS NULL
				   OR l2_cid IS NULL
				   OR l3_cid IS NULL
				   OR l4_cid IS NULL

			),
			nulls_check_3 AS (
				SELECT 
					''nulls_check_3'' AS check_name, 
					COUNT(1) AS count, 
					''counts number of products have nulls in hirerachy cuqs'' AS description
				FROM base_prod_master 
				WHERE l0_cuq IS NULL
				   OR l1_cuq IS NULL
				   OR l2_cuq IS NULL
				   OR l3_cuq IS NULL
				   OR l4_cuq IS NULL

			),
			nulls_check_4 AS(
				SELECT 
					''nulls_check_4'' AS check_name, 
					COUNT(1) AS count, 
					''nulls in age_month_bucket/clearance_indicator'' AS description
				FROM base_prod_master
				WHERE age_month_bucket IS NULL 
					OR clearance_indicator IS NULL 
					--OR lifecycle_indicator IS NULL 
			),
			hirerachy_one_to_one_mapping_check_1 AS(
				SELECT 
					''hirerachy_mapping_check_1'' AS check_name,
					COALESCE(COUNT(distinct map_check), 0) AS count,
					''counts number of hirerachies with one to one mapping issue from cid to id till l4'' AS description
				FROM (
					-- one cid should have one id only
					SELECT l0_cid AS key_val, ''l0_cid → l0_id'' AS map_check, COUNT(DISTINCT l0_id) AS id_count FROM base_prod_master GROUP BY l0_cid
					UNION ALL
					SELECT l1_cid, ''l1_cid → l1_id'', COUNT(DISTINCT l1_id) FROM base_prod_master GROUP BY l1_cid
					UNION ALL
					SELECT l2_cid, ''l2_cid → l2_id'', COUNT(DISTINCT l2_id) FROM base_prod_master GROUP BY l2_cid
					UNION ALL
					SELECT l3_cid, ''l3_cid → l3_id'', COUNT(DISTINCT l3_id) FROM base_prod_master GROUP BY l3_cid
					UNION ALL
					SELECT l4_cid, ''l4_cid → l4_id'', COUNT(DISTINCT l4_id) FROM base_prod_master GROUP BY l4_cid
				) t
				WHERE id_count > 1
			),
			hirerachy_one_to_one_mapping_check_2 AS(
				SELECT 
					''hirerachy_mapping_check_2'' AS check_name,
					COALESCE(COUNT(distinct map_check), 0) AS count,
					''counts number of hirerachies with one to one mapping issue from cuq to name till l4'' AS description
				FROM (
					-- one cuq should have one name only
					SELECT l0_cuq AS key_val, ''l0_cuq → l0_name'' AS map_check, COUNT(DISTINCT l0_name) AS id_count FROM base_prod_master GROUP BY l0_cuq
					UNION ALL
					SELECT l1_cuq, ''l1_cuq → l1_name'', COUNT(DISTINCT l1_name) FROM base_prod_master GROUP BY l1_cuq
					UNION ALL
					SELECT l2_cuq, ''l2_cuq → l2_name'', COUNT(DISTINCT l2_name) FROM base_prod_master GROUP BY l2_cuq
					UNION ALL
					SELECT l3_cuq, ''l3_cuq → l3_name'', COUNT(DISTINCT l3_name) FROM base_prod_master GROUP BY l3_cuq
					UNION ALL
					SELECT l4_cuq, ''l4_cuq → l4_name'', COUNT(DISTINCT l4_name) FROM base_prod_master GROUP BY l4_cuq
				) t
				WHERE id_count > 1
			),
			hirerachy_one_to_one_mapping_check_3 AS(
				SELECT 
					''hirerachy_mapping_check_3'' AS check_name,
					COALESCE(COUNT(distinct map_check), 0) AS count,
					''counts number of hirerachies with one to one mapping issue from cuq to cid till l4'' AS description
				FROM (
					-- one cuq should have one name only
					SELECT l0_cuq AS key_val, ''l0_cuq → l0_cid'' AS map_check, COUNT(DISTINCT l0_cid) AS id_count FROM base_prod_master GROUP BY l0_cuq
					UNION ALL
					SELECT l1_cuq, ''l1_cuq → l1_cid'', COUNT(DISTINCT l1_cid) FROM base_prod_master GROUP BY l1_cuq
					UNION ALL
					SELECT l2_cuq, ''l2_cuq → l2_cid'', COUNT(DISTINCT l2_cid) FROM base_prod_master GROUP BY l2_cuq
					UNION ALL
					SELECT l3_cuq, ''l3_cuq → l3_cid'', COUNT(DISTINCT l3_cid) FROM base_prod_master GROUP BY l3_cuq
					UNION ALL
					SELECT l4_cuq, ''l4_cuq → l4_cid'', COUNT(DISTINCT l4_cid) FROM base_prod_master GROUP BY l4_cuq
				) t
				WHERE id_count > 1
			),
			currency_mapping_check AS (
				SELECT 
					''currency_mapping_check'' AS check_name, 
					COUNT(*) AS count, 
					''row counts of mismatched mapping from currency master'' AS description
				FROM (
					SELECT pm.currency_id
					FROM base_prod_master pm
					LEFT JOIN global.tb_currency_master cm ON pm.currency_id = cm.currency_id
					WHERE pm.currency_id IS NOT NULL 
					  AND cm.currency_id IS NULL
				) a
			),
			price_validity_check AS (
				SELECT 
					''price_validity_check'' AS check_name, 
					COUNT(1) AS count, 
					''negative prices'' AS description
				FROM base_prod_master 
				WHERE msrp < 0 
				   OR current_price < 0 
				   OR msrp_with_vat < 0
				UNION ALL
				SELECT 
					''cost_validity_check'' AS check_name, 
					COUNT(1) AS count, 
					''non positive cost'' AS description
				FROM base_prod_master 
				WHERE cost <= 0
			),
			msrp_cost_check AS (
				SELECT 
					''msrp_cost_check'' AS check_name, 
					COUNT(1) AS count, 
					''msrp less than cost'' AS description
				FROM base_prod_master 
				WHERE msrp IS NOT NULL 
				  AND cost IS NOT NULL
				  AND msrp < cost
			)
			SELECT ''price_markdown.product_master'' AS table_name, * FROM nulls_check_1
			UNION ALL 
			SELECT ''price_markdown.product_master'' AS table_name, * FROM nulls_check_2
			UNION ALL 
			SELECT ''price_markdown.product_master'' AS table_name, * FROM nulls_check_3
			UNION ALL 
			SELECT ''price_markdown.product_master'' AS table_name, * FROM nulls_check_4
			UNION ALL 
			SELECT ''price_markdown.product_master'' AS table_name, * FROM hirerachy_one_to_one_mapping_check_1
			UNION ALL
			SELECT ''price_markdown.product_master'' AS table_name, * FROM hirerachy_one_to_one_mapping_check_2
			UNION ALL 
			SELECT ''price_markdown.product_master'' AS table_name, * FROM hirerachy_one_to_one_mapping_check_3
			UNION ALL 
			SELECT ''price_markdown.product_master'' AS table_name, * FROM currency_mapping_check
			UNION ALL 
			SELECT ''price_markdown.product_master'' AS table_name, * FROM price_validity_check
			UNION ALL 
			SELECT ''price_markdown.product_master'' AS table_name, * FROM msrp_cost_check
		)';
  
    ELSE
        -- Create empty table if not included
        EXECUTE '
        CREATE UNLOGGED TABLE price_markdown_opt_temp.prod_master_qc AS (
            SELECT 
                ''price_markdown.product_master''::text AS table_name,
                ''nulls_check''::text AS check_name,
                0::bigint AS count,
                ''skipped''::text AS description
            WHERE 1=0
        )';
    END IF;

    -- 4. PRODUCT STORE PRICE CHECKS
    IF table_names IS NULL OR 'price_markdown.tb_product_store_price' = ANY(table_names) THEN
        EXECUTE '
        CREATE UNLOGGED TABLE price_markdown_opt_temp.product_store_price_qc AS (
            WITH price_validity_check AS (
                SELECT
                    ''price_markdown.tb_product_store_price'' AS table_name,
                    ''price_validity_check'' AS check_name,
                    COUNT(1)::int4 AS count,
                    ''non-positive msrp or current_price or cost'' AS description
                FROM price_markdown.tb_product_store_price
                WHERE msrp <= 0 OR current_price <= 0 OR cost <= 0
            ),
            forex_rates AS (
                SELECT * FROM global.planned_forex_rate
                WHERE date = current_date
            ),
            product_store_price AS (
                SELECT DISTINCT 
                    product_id, currency_id, msrp_with_vat, 
                    territory_currency_id, msrp_territory_with_vat,
                    default_currency_id, msrp_default_with_vat
                FROM price_markdown.tb_product_store_price
            ),
            expected_prices AS (
                SELECT 
                    product_id, currency_id, msrp_with_vat, 
                    territory_currency_id, default_currency_id,
                    msrp_with_vat * f1.planned_conversion_multiplier AS calculated_terri_msrp, 
                    msrp_territory_with_vat,
                    msrp_with_vat * f2.planned_conversion_multiplier AS calculated_default_msrp, 
                    msrp_default_with_vat
                FROM product_store_price
                INNER JOIN forex_rates f1
                    ON f1.source_currency_id = currency_id
                    AND f1.target_currency_id = territory_currency_id
                INNER JOIN forex_rates f2
                    ON f2.source_currency_id = currency_id
                    AND f2.target_currency_id = default_currency_id
            ),
            forex_territory_check AS (
                SELECT
                    ''price_markdown.tb_product_store_price'' AS table_name,
                    ''forex_territory_conversion_check'' AS check_name,
                    COUNT(DISTINCT product_id)::int4 AS count,
                    ''products where calculated territory msrp differs by more than 1 from msrp_territory_with_vat'' AS description
                FROM expected_prices
                WHERE ABS(calculated_terri_msrp - msrp_territory_with_vat) > 1
            ),
            forex_default_check AS (
                SELECT
                    ''price_markdown.tb_product_store_price'' AS table_name,
                    ''forex_default_conversion_check'' AS check_name,
                    COUNT(DISTINCT product_id)::int4 AS count,
                    ''products where calculated default msrp differs by more than 1 from msrp_default_with_vat'' AS description
                FROM expected_prices
                WHERE ABS(calculated_default_msrp - msrp_default_with_vat) > 1
            )
            SELECT * FROM price_validity_check
            UNION ALL
            SELECT * FROM forex_territory_check
            UNION ALL
            SELECT * FROM forex_default_check
        )';
    ELSE
        EXECUTE '
        CREATE UNLOGGED TABLE price_markdown_opt_temp.product_store_price_qc AS (
            SELECT
                NULL::text  AS table_name,
                NULL::text  AS check_name,
                0::int4     AS count,
                NULL::text  AS description
            WHERE 1=0
        )';
    END IF;

    -- 5. STORE MASTER CHECKS
    IF table_names IS NULL OR 'price_markdown.tb_store_master' = ANY(table_names) THEN
        EXECUTE '
        CREATE UNLOGGED TABLE price_markdown_opt_temp.store_master_qc AS (
        WITH base_store_master AS (
            SELECT * 
            FROM price_markdown.tb_store_master 
            WHERE is_active = 1
        ),
        nulls_check_1 AS (
            SELECT 
                ''price_markdown.tb_store_master'' AS table_name,
                ''nulls_check'' AS check_name, 
                COUNT(1) AS count, 
                ''counts number of stores with nulls in store_id, s0_id, s1_id'' AS description
            FROM base_store_master 
            WHERE store_id IS NULL
               OR s0_id IS NULL
               OR s1_id IS NULL
        ),
        nulls_check_2 AS (
            SELECT 
                ''price_markdown.tb_store_master'' AS table_name,
                ''nulls_check'' AS check_name, 
                COUNT(1) AS count, 
                ''counts number of stores with nulls in store_name, store_code'' AS description
            FROM base_store_master 
            WHERE store_name IS NULL
               OR store_code IS NULL
        ),
        duplicate_store_id_check AS (
            SELECT 
                ''price_markdown.tb_store_master'' AS table_name,
                ''duplicates_check'' AS check_name, 
                COUNT(*) AS count, 
                ''counts number of duplicate store_id entries'' AS description
            FROM (
                SELECT store_id, COUNT(*) AS cnt
                FROM price_markdown.tb_store_master
                GROUP BY store_id
                HAVING COUNT(*) > 1
            ) duplicates
        )
        SELECT * FROM nulls_check_1
        UNION ALL
        SELECT * FROM nulls_check_2
        UNION ALL
        SELECT * FROM duplicate_store_id_check
        )';
    ELSE
        EXECUTE '
        CREATE UNLOGGED TABLE price_markdown_opt_temp.store_master_qc AS (
            SELECT 
                ''price_markdown.tb_store_master''::text AS table_name,
                ''nulls_check''::text AS check_name,
                0::bigint AS count,
                ''skipped''::text AS description
            WHERE 1=0
        )';
    END IF;

    -- 6. GLOBAL TABLES CHECKS
    IF table_names IS NULL 
    OR 'global.tb_country_master' = ANY(table_names) 
    OR 'global.tb_currency_master' = ANY(table_names) 
    OR 'global.tb_vat_master' = ANY(table_names)
    OR 'global.tb_country_currency_mapping' = ANY(table_names) THEN

        EXECUTE '
        CREATE UNLOGGED TABLE price_markdown_opt_temp.global_tables_checks AS (
            WITH country_master_counts_check AS (
                SELECT 
                    ''global.tb_country_master'' AS table_name,
                    ''count_check_countries'' AS check_name, 
                    COUNT(DISTINCT country_id)::int4 AS count, 
                    ''counts number of countries present'' AS description
                FROM global.tb_country_master
            ),
            currency_master_counts_check AS (
                SELECT 
                    ''global.tb_currency_master'' AS table_name,
                    ''count_check_currencies'' AS check_name, 
                    COUNT(DISTINCT currency_id)::int4 AS count, 
                    ''counts number of currencies present'' AS description
                FROM global.tb_currency_master
            ),
            vat_master_counts_check AS (
                SELECT 
                    ''global.tb_vat_master'' AS table_name,
                    ''count_check_s1_id'' AS check_name, 
                    COUNT(DISTINCT s1_id)::int4 AS count, 
                    ''counts number of s1_id present'' AS description
                FROM global.tb_vat_master
            ),
            vat_master_nulls_check AS (
                SELECT 
                    ''global.tb_vat_master'' AS table_name,
                    ''nulls_check'' AS check_name, 
                    COUNT(1)::int4 AS count, 
                    ''counts number of vat_percentage col with nulls'' AS description
                FROM global.tb_vat_master
                WHERE vat_percentage IS NULL
            ),
            territory_currency AS (
                SELECT DISTINCT territory_id, dominating_currency_id 
                FROM global.tb_country_currency_mapping
            ),
            local_currency AS (
                SELECT DISTINCT country_id, currency_id AS local_currency_id 
                FROM global.tb_country_currency_mapping
            ),
            currency_discrepancy_pm AS (
                SELECT 
                    ''price_markdown.product_master'' AS table_name,
                    ''currency_discrepancy_check'' AS check_name,
                    COUNT(DISTINCT l0_name)::int4 AS count,
                    ''products where dominating_currency_id != currency_id'' AS description
                FROM price_markdown.product_master
                INNER JOIN territory_currency
                    ON l0_id = territory_id
                WHERE dominating_currency_id != currency_id
            ),
            currency_discrepancy_sm AS (
                SELECT 
                    ''price_markdown.tb_store_master'' AS table_name,
                    ''currency_discrepancy_check'' AS check_name,
                    COUNT(DISTINCT s1_name)::int4 AS count,
                    ''stores where local_currency_id != currency_id'' AS description
                FROM price_markdown.tb_store_master
                INNER JOIN local_currency
                    ON s1_id = country_id
                WHERE local_currency_id != currency_id
            ),
            country_discrepancy_check AS (
                SELECT 
                    ''price_markdown.tb_store_master'' AS table_name,
                    ''country_discrepancy_check'' AS check_name,
                    COUNT(DISTINCT s1_id)::int4 AS count,
                    ''stores with missing country mapping in tb_country_currency_mapping or tb_country_master'' AS description
                FROM price_markdown.tb_store_master sm
                LEFT JOIN global.tb_country_currency_mapping tccm
                    ON sm.s1_id = tccm.country_id
                LEFT JOIN global.tb_country_master tcm
                    ON sm.s1_id = tcm.country_id
                WHERE tccm.country_id IS NULL 
                OR s1_id IS NULL 
                OR tcm.country_id IS NULL
            )
            SELECT * FROM country_master_counts_check
            UNION ALL
            SELECT * FROM currency_master_counts_check
            UNION ALL
            SELECT * FROM vat_master_counts_check
            UNION ALL
            SELECT * FROM vat_master_nulls_check
            UNION ALL
            SELECT * FROM currency_discrepancy_pm
            UNION ALL
            SELECT * FROM currency_discrepancy_sm
            UNION ALL
            SELECT * FROM country_discrepancy_check
        )';
    ELSE
        EXECUTE '
        CREATE UNLOGGED TABLE price_markdown_opt_temp.global_tables_checks AS (
            SELECT 
                NULL::text  AS table_name,
                NULL::text  AS check_name,
                0::int4     AS count,
                NULL::text  AS description
            WHERE 1=0
        )';
    END IF;

    -- 7. FOREX TABLES CHECKS
    IF table_names IS NULL 
       OR 'global.planned_forex_rate' = ANY(table_names) 
       OR 'global.actual_forex_rate' = ANY(table_names) THEN
        EXECUTE '
        CREATE UNLOGGED TABLE price_markdown_opt_temp.forex_tables_qc AS (
        WITH planned_forex_table_combinations_count AS (
            SELECT 
                ''global.planned_forex_rate'' AS table_name,
                ''count_check_currency_combinations'' AS check_name, 
                COUNT(DISTINCT (source_currency_id, target_currency_id)) AS count, 
                ''counts number of distinct currency combinations present'' AS description
            FROM global.planned_forex_rate
        ),
        planned_forex_table_nulls_check AS (
            SELECT 
                ''global.planned_forex_rate'' AS table_name,
                ''nulls_check'' AS check_name, 
                COUNT(1) AS count, 
                ''counts number of nulls in planned_forex_rates'' AS description
            FROM global.planned_forex_rate
            WHERE source_currency_id IS NULL
               OR target_currency_id IS NULL
               OR planned_conversion_multiplier IS NULL
        ),
        planned_forex_table_duplicates_check AS (
            SELECT 
                ''global.planned_forex_rate'' AS table_name,
                ''duplicates_check'' AS check_name, 
                COUNT(*) AS count, 
                ''counts number of duplicates combinations in planned_forex_rates'' AS description
            FROM (
                SELECT COUNT(*) AS count
                FROM global.planned_forex_rate
                GROUP BY source_currency_id, target_currency_id, date, planned_conversion_multiplier
                HAVING COUNT(*) > 1
            ) a
        ),
        planned_forex_table_dates_required_check AS (
            SELECT 
                ''global.planned_forex_rate'' AS table_name,
                ''count_check_dates_forex_required'' AS check_name, 
                COUNT(DISTINCT date) AS count, 
                ''counts number of distinct dates in planned_forex_rates'' AS description
            FROM global.planned_forex_rate
            WHERE date BETWEEN current_date - 180 AND current_date + 180
        ),
        planned_forex_table_date_combinations_check AS (
            SELECT 
                ''global.planned_forex_rate'' AS table_name,
                ''count_check_currency_date_combinations'' AS check_name, 
                COUNT(date) AS count,
                ''counts number of dates with not 10 distinct currency combinations'' AS description
            FROM (
                SELECT 
                    date, 
                    COUNT(DISTINCT (source_currency_id, target_currency_id)) AS count
                FROM global.planned_forex_rate    
                WHERE date BETWEEN current_date - 180 AND current_date + 180
                GROUP BY date
            ) a
            WHERE count != 10
        ),
        actual_forex_table_combinations_check AS (
            SELECT 
                ''global.actual_forex_rate'' AS table_name,
                ''count_check_currency_combinations'' AS check_name, 
                COUNT(DISTINCT (source_currency_id, target_currency_id)) AS count, 
                ''counts number of distinct currency combinations present'' AS description
            FROM global.actual_forex_rate
        ),
        actual_forex_table_nulls_check AS (
            SELECT 
                ''global.actual_forex_rate'' AS table_name,
                ''nulls_check'' AS check_name, 
                COUNT(1) AS count, 
                ''counts number of nulls in actual_forex_rates'' AS description
            FROM global.actual_forex_rate
            WHERE source_currency_id IS NULL
               OR target_currency_id IS NULL
               OR planned_conversion_multiplier IS NULL
        ),
        actual_forex_table_duplicates_check AS (
            SELECT 
                ''global.actual_forex_rate'' AS table_name,
                ''duplicates_check'' AS check_name, 
                COUNT(*) AS count, 
                ''counts number of duplicates combinations in actual_forex_rates'' AS description
            FROM (
                SELECT COUNT(*) AS count
                FROM global.actual_forex_rate
                GROUP BY source_currency_id, target_currency_id, date, planned_conversion_multiplier
                HAVING COUNT(*) > 1
            ) a
        ),
        actual_forex_table_dates_required_check AS (
            SELECT 
                ''global.actual_forex_rate'' AS table_name,
                ''count_check_dates_forex_required'' AS check_name, 
                COUNT(DISTINCT date) AS count, 
                ''counts number of distinct dates in actual_forex_rates'' AS description
            FROM global.actual_forex_rate
            WHERE date BETWEEN current_date - 180 AND current_date + 180
        ),
        actual_forex_table_date_combinations_check AS (
            SELECT 
                ''global.actual_forex_rate'' AS table_name,
                ''count_check_currency_date_combinations'' AS check_name, 
                COUNT(date) AS count,
                ''counts number of dates with not 10 distinct currency combinations'' AS description
            FROM (
                SELECT 
                    date, 
                    COUNT(DISTINCT (source_currency_id, target_currency_id)) AS count
                FROM global.actual_forex_rate    
                WHERE date BETWEEN current_date - 180 AND current_date + 180
                GROUP BY date
            ) a
            WHERE count != 10
        ),
        planned_rate_validity_check AS (
            SELECT 
                ''global.planned_forex_rate'' AS table_name,
                ''rate_validity_check'' AS check_name, 
                COUNT(1) AS count,
                ''multiplier <= 0 or null'' AS description
            FROM global.planned_forex_rate
            WHERE planned_conversion_multiplier IS NULL OR planned_conversion_multiplier <= 0
        ),
        actual_rate_validity_check AS (
            SELECT 
                ''global.actual_forex_rate'' AS table_name,
                ''rate_validity_check'' AS check_name, 
                COUNT(1) AS count,
                ''multiplier <= 0 or null'' AS description
            FROM global.actual_forex_rate
            WHERE planned_conversion_multiplier IS NULL OR planned_conversion_multiplier <= 0
        )
        SELECT * FROM planned_forex_table_combinations_count
        UNION ALL
        SELECT * FROM planned_forex_table_nulls_check
        UNION ALL
        SELECT * FROM planned_forex_table_duplicates_check
        UNION ALL
        SELECT * FROM planned_forex_table_dates_required_check
        UNION ALL
        SELECT * FROM planned_forex_table_date_combinations_check
        UNION ALL
        SELECT * FROM planned_rate_validity_check
        UNION ALL
        SELECT * FROM actual_forex_table_combinations_check
        UNION ALL
        SELECT * FROM actual_forex_table_nulls_check
        UNION ALL
        SELECT * FROM actual_forex_table_duplicates_check
        UNION ALL
        SELECT * FROM actual_forex_table_dates_required_check
        UNION ALL
        SELECT * FROM actual_forex_table_date_combinations_check
        UNION ALL
        SELECT * FROM actual_rate_validity_check
        ORDER BY 1
        )';
    ELSE
        EXECUTE '
        CREATE UNLOGGED TABLE price_markdown_opt_temp.forex_tables_qc AS (
            SELECT 
                ''global.planned_forex_rate''::text AS table_name,
                ''count_check_currency_combinations''::text AS check_name,
                0::bigint AS count,
                ''skipped''::text AS description
            WHERE 1=0
        )';
    END IF;

    -- 8. LATEST INVENTORY CHECKS (Verified: oh, it, oo exist)
    IF table_names IS NULL OR 'global.tb_latest_inventory' = ANY(table_names) THEN
        EXECUTE '
        CREATE UNLOGGED TABLE price_markdown_opt_temp.latest_inventory_qc AS (
        WITH base_latest_inventory AS (
            SELECT distinct product_id 
            FROM global.tb_latest_inventory li
            WHERE clearance_eligible = 1 and total_inventory <=0
        ),
        latest_inventory_count_check AS (
            SELECT 
                ''global.tb_latest_inventory'' AS table_name,
                ''count_check_inv'' AS check_name, 
                COUNT(1) AS count,   
                ''counts clr eligible products with no inventory'' AS description
            FROM base_latest_inventory
        ),
        nulls_count_check AS (
            SELECT 
                ''global.tb_latest_inventory'' AS table_name,
                ''nulls_check'' AS check_name, 
                COUNT(1) AS count,   
                ''count of rows for nulls in clr_eligible, clr_ind, tot_inv'' AS description
            FROM global.tb_latest_inventory
            WHERE clearance_eligible is null 
             OR clearance_indicator is null
             OR total_inventory is null
        ),
        non_negative_values_check AS (
            SELECT 
                ''global.tb_latest_inventory'' AS table_name,
                ''non_negative_values_check'' AS check_name, 
                COUNT(1) AS count, 
                ''negative inventory values'' AS description
            FROM global.tb_latest_inventory
            WHERE oh < 0 OR it < 0 OR oo < 0 OR total_inventory < 0
        )
        SELECT * FROM latest_inventory_count_check
        UNION ALL
        SELECT * FROM non_negative_values_check
        UNION ALL
        SELECT * FROM nulls_count_check
        ORDER BY 1
        )';
    ELSE
        EXECUTE '
        CREATE UNLOGGED TABLE price_markdown_opt_temp.latest_inventory_qc AS (
            SELECT 
                ''global.tb_latest_inventory''::text AS table_name,
                ''nulls_check''::text AS check_name,
                0::bigint AS count,
                ''skipped''::text AS description
            WHERE 1=0
        )';
    END IF;

    -- 9. TRANSACTION CHECKS
    IF table_names IS NULL OR 'price_markdown_opt.tb_transaction_latest_mkd' = ANY(table_names) THEN
        EXECUTE '
        CREATE UNLOGGED TABLE price_markdown_opt_temp.transaction_latest_qc AS (
        WITH null_check_1 AS (
            SELECT 
                ''price_markdown_opt.tb_transaction_latest_mkd'' AS table_name,
                ''nulls_check_1'' AS check_name, 
                COUNT(DISTINCT product_id) AS count, 
                ''counts number of distinct products with null product_id'' AS description
            FROM price_markdown_opt.tb_transaction_latest_mkd tl
            WHERE product_id IS NULL
        ),
        null_check_2 AS (
            SELECT 
                ''price_markdown_opt.tb_transaction_latest_mkd'' AS table_name,
                ''nulls_check_2'' AS check_name, 
                COUNT(DISTINCT product_id) AS count, 
                ''counts number of distinct products with null values in price related columns'' AS description
            FROM price_markdown_opt.tb_transaction_latest_mkd tl
            WHERE product_id IS NOT NULL 
              AND (cost IS NULL 
                OR gross_revenue IS NULL 
                OR gross_margin IS NULL 
                OR gross_sp IS NULL 
                OR gross_dis_amount IS NULL 
                OR final_amount IS NULL 
                OR aur IS NULL 
                OR aum IS NULL
                OR gross_revenue_with_vat IS NULL
                OR gross_margin_with_vat IS NULL
                OR gross_sp_with_vat IS NULL
                OR gross_dis_amount_with_vat IS NULL
                OR final_amount_with_vat IS NULL
                OR aur_with_vat IS NULL
                OR aum_with_vat IS NULL)
        ),
        null_check_3 AS (
            SELECT 
                ''price_markdown_opt.tb_transaction_latest_mkd'' AS table_name,
                ''nulls_check_3'' AS check_name, 
                COUNT(DISTINCT product_id) AS count, 
                ''counts number of distinct products with null values in vat, total_inv'' AS description
            FROM price_markdown_opt.tb_transaction_latest_mkd tl
            WHERE product_id IS NOT NULL 
              AND (vat_rate_per IS NULL OR total_inv IS NULL)
        ),
        null_check_4 AS (
            SELECT 
                ''price_markdown_opt.tb_transaction_latest_mkd'' AS table_name,
                ''nulls_check_4'' AS check_name, 
                COUNT(DISTINCT product_id) AS count, 
                ''counts number of distinct products with null values in currency, currency_id'' AS description
            FROM price_markdown_opt.tb_transaction_latest_mkd tl
            WHERE product_id IS NOT NULL 
              AND (currency IS NULL OR currency_id IS NULL)
        ),
        currency_mapping_check AS (
            SELECT 
                ''price_markdown_opt.tb_transaction_latest_mkd'' AS table_name,
                ''currency_mapping_check'' AS check_name, 
                COUNT(DISTINCT tl.product_id) AS count, 
                ''counts number of distinct products with mismatched currency_id'' AS description
            FROM price_markdown_opt.tb_transaction_latest_mkd tl
            LEFT JOIN price_markdown.product_master pm ON pm.product_id = tl.product_id
            WHERE tl.product_id IS NOT NULL 
              AND pm.currency_id IS NOT NULL
              AND tl.currency_id IS NOT NULL
              AND pm.currency_id != tl.currency_id
        ),
        date_validity_check AS (
            SELECT 
                ''price_markdown_opt.tb_transaction_latest_mkd'' AS table_name,
                ''date_validity_check_1'' AS check_name, 
                COUNT(DISTINCT product_id) AS count, 
                ''future dates or null dates'' AS description
            FROM price_markdown_opt.tb_transaction_latest_mkd
            WHERE date_id IS NULL OR date_id > CURRENT_DATE
        ),
        dates_count_check AS (
            SELECT 
                ''price_markdown_opt.tb_transaction_latest_mkd'' AS table_name,
                ''dates_count_check'' AS check_name, 
                COUNT(DISTINCT date_id) AS count, 
                ''count number of date_ids present'' AS description
            FROM price_markdown_opt.tb_transaction_latest_mkd
            WHERE date_id >= CURRENT_DATE-365 AND date_id <= CURRENT_DATE
        ),
        clearance_combination_check AS (
            SELECT 
                ''price_markdown_opt.tb_transaction_latest_mkd'' AS table_name,
                ''count_check_clearance_combinations'' AS check_name, 
                COUNT(DISTINCT (product_id, store_id)) AS count, 
                ''counts number of distinct product-store combinations with clearance_indicator=1 in last 14 days'' AS description
            FROM price_markdown_opt.tb_transaction_latest_mkd
            WHERE clearance_indicator = 1
              AND date_id >= CURRENT_DATE - 14
              AND date_id <= CURRENT_DATE
        )
        SELECT * FROM null_check_1
        UNION ALL
        SELECT * FROM null_check_2
        UNION ALL
        SELECT * FROM null_check_3
        UNION ALL
        SELECT * FROM null_check_4
        UNION ALL
        SELECT * FROM currency_mapping_check
        UNION ALL
        SELECT * FROM date_validity_check
        UNION ALL
        SELECT * FROM clearance_combination_check
		UNION ALL
		SELECT * FROM dates_count_check
        ORDER BY 1
        )';
    ELSE
        EXECUTE '
        CREATE UNLOGGED TABLE price_markdown_opt_temp.transaction_latest_qc AS (
            SELECT 
                ''price_markdown_opt.tb_transaction_latest_mkd''::text AS table_name,
                ''nulls_check''::text AS check_name,
                0::bigint AS count,
                ''skipped''::text AS description
            WHERE 1=0
        )';
    END IF;

-- 10. STORE SPLIT CHECKS
    IF table_names IS NULL OR 'price_markdown_opt.tb_store_split_mkd' = ANY(table_names) THEN
        EXECUTE '
        CREATE UNLOGGED TABLE price_markdown_opt_temp.store_split_qc AS (
            WITH active_products AS (
                SELECT DISTINCT product_id
                FROM price_markdown.product_master
                WHERE is_active = 1
            ),
            active_stores AS (
                SELECT DISTINCT store_id
                FROM price_markdown.tb_store_master
                WHERE is_active = 1
            ),
            store_distinct AS (
                SELECT DISTINCT store_id
                FROM price_markdown_opt.tb_store_split_mkd
            ),
            product_distinct AS (
                SELECT DISTINCT product_id
                FROM price_markdown_opt.tb_store_split_mkd
            ),
            consider_week_start_dates AS (
                SELECT 
                    MIN(week_start_date) AS min_date,
                    MAX(week_start_date) AS max_date
                FROM price_markdown_opt.tb_store_split_mkd
                WHERE week_start_date BETWEEN current_date - 14 AND current_date + 90
            ),
            store_split_products_check AS (
                SELECT 
                    ''price_markdown_opt.tb_store_split_mkd'' AS table_name,
                    ''count_check_store_split_products'' AS check_name,
                    COUNT(1)::int4 AS count, 
                    ''counts number of active products not present in store_split_mkd'' AS description
                FROM active_products ap
                LEFT JOIN product_distinct ssm 
                    ON ap.product_id = ssm.product_id
                WHERE ssm.product_id IS NULL
            ),
            store_split_stores_check AS (
                SELECT 
                    ''price_markdown_opt.tb_store_split_mkd'' AS table_name,
                    ''count_check_store_split_stores'' AS check_name,
                    COUNT(1)::int4 AS count, 
                    ''counts number of active stores not present in store_split_mkd'' AS description
                FROM active_stores ast
                LEFT JOIN store_distinct ssm 
                    ON ast.store_id = ssm.store_id
                WHERE ssm.store_id IS NULL
            ),
            store_split_timeframe_check AS (
                SELECT 
                    ''price_markdown_opt.tb_store_split_mkd'' AS table_name,
                    ''count_check_timeframe_presence'' AS check_name,
                    COUNT(DISTINCT a.product_id)::int4 AS count, 
                    ''counts number of active products with insufficient timeframe coverage less than 12 weeks'' AS description
                FROM (
                    SELECT ssm.product_id, COUNT(DISTINCT ssm.week_start_date) AS weeks_count
                    FROM price_markdown_opt.tb_store_split_mkd ssm
                    INNER JOIN active_products ap
                        ON ap.product_id = ssm.product_id
                    INNER JOIN consider_week_start_dates wd
                        ON ssm.week_start_date BETWEEN wd.min_date AND wd.max_date
                    GROUP BY ssm.product_id
                ) a
                WHERE weeks_count < 12
            ),
            ratio_range_check AS (
                SELECT 
                    ''price_markdown_opt.tb_store_split_mkd'' AS table_name,
                    ''ratio_range_check'' AS check_name, 
                    COUNT(1)::int4 AS count, 
                    ''ratio < 0 or > 1'' AS description
                FROM price_markdown_opt.tb_store_split_mkd
                WHERE store_ratio < 0 OR store_ratio > 1
            )
            SELECT * FROM store_split_products_check
            UNION ALL
            SELECT * FROM store_split_stores_check
            UNION ALL
            SELECT * FROM store_split_timeframe_check
            UNION ALL
            SELECT * FROM ratio_range_check
        )';
    ELSE
        EXECUTE '
        CREATE UNLOGGED TABLE price_markdown_opt_temp.store_split_qc AS (
            SELECT
                NULL::text AS table_name,
                NULL::text AS check_name,
                0::int4    AS count,
                NULL::text AS description
            WHERE 1=0
        )';
    END IF;

-- 11. DAY SPLIT CHECKS
    IF table_names IS NULL OR 'price_markdown_opt.tb_day_split_mkd' = ANY(table_names) THEN
        EXECUTE '
        CREATE UNLOGGED TABLE price_markdown_opt_temp.day_split_qc AS (
            WITH active_products AS (
                SELECT DISTINCT l3_cid, product_id
                FROM price_markdown.product_master
                WHERE is_active = 1
            ),
            day_split_l3_cid_check AS (
                SELECT 
                    ''price_markdown_opt.tb_day_split_mkd'' AS table_name,
                    ''count_check_l3_cid'' AS check_name,
                    COUNT(DISTINCT ap.l3_cid)::int4 AS count, 
                    ''counts number of active l3_cid not present in day_split_mkd'' AS description
                FROM active_products ap
                LEFT JOIN (SELECT DISTINCT l3_cid FROM price_markdown_opt.tb_day_split_mkd) dsm 
                    ON ap.l3_cid = dsm.l3_cid
                WHERE dsm.l3_cid IS NULL
            ),
            consider_week_start_dates AS (
                SELECT 
                    MIN(week_start_date) AS min_date,
                    MAX(week_start_date) AS max_date
                FROM price_markdown_opt.tb_day_split_mkd
                WHERE date BETWEEN current_date - 14 AND current_date + 90
            ),
            day_split_base AS (
                SELECT 
                    dsm.l3_cid,
                    dsm.week_start_date,
                    SUM(COALESCE(dsm.day_ratio_bnm, 0)) AS bnm_total_ratio,
                    SUM(COALESCE(dsm.day_ratio_ecom, 0)) AS ecom_total_ratio,
                    COUNT(DISTINCT date) AS days_count
                FROM price_markdown_opt.tb_day_split_mkd dsm
                INNER JOIN consider_week_start_dates wd
                    ON dsm.week_start_date BETWEEN wd.min_date AND wd.max_date
                INNER JOIN (SELECT DISTINCT l3_cid FROM active_products) ap 
                    ON ap.l3_cid = dsm.l3_cid
                GROUP BY dsm.l3_cid, dsm.week_start_date
            ),
            day_split_weeks_count_check AS (
                SELECT 
                    ''price_markdown_opt.tb_day_split_mkd'' AS table_name,
                    ''count_check_weeks_count'' AS check_name,
                    COUNT(1)::int4 AS count,
                    ''counts number of l3_cid combinations with less than 12 Weeks'' AS description
                FROM (
                    SELECT l3_cid, COUNT(DISTINCT week_start_date) AS weeks_count
                    FROM day_split_base
                    GROUP BY l3_cid
                ) a
                WHERE weeks_count < 12
            ),
            day_split_days_count_check AS (
                SELECT 
                    ''price_markdown_opt.tb_day_split_mkd'' AS table_name,
                    ''count_check_days_count'' AS check_name,
                    COUNT(1)::int4 AS count,
                    ''counts number of active l3_cid, week_start_date combinations with not 7 days'' AS description
                FROM day_split_base
                WHERE days_count != 7
            ),
            day_split_bnm_total_check AS (
                SELECT 
                    ''price_markdown_opt.tb_day_split_mkd'' AS table_name,
                    ''count_check_bnm_total'' AS check_name,
                    COUNT(1)::int4 AS count,
                    ''count of combinations of active l3_cid, week_start_date with sum of day_ratio_bnm less than 0.999 or greater than 1'' AS description
                FROM day_split_base
                WHERE bnm_total_ratio < 0.999 OR bnm_total_ratio > 1
            ),
            day_split_ecom_total_check AS (
                SELECT 
                    ''price_markdown_opt.tb_day_split_mkd'' AS table_name,
                    ''count_check_ecom_total'' AS check_name,
                    COUNT(1)::int4 AS count,
                    ''count of combinations of active l3_cid, week_start_date with sum of day_ratio_ecom less than 0.999 or greater than 1'' AS description
                FROM day_split_base
                WHERE ecom_total_ratio < 0.999 OR ecom_total_ratio > 1
            ),
            day_split_bnm_ratio_range_check AS (
                SELECT 
                    ''price_markdown_opt.tb_day_split_mkd'' AS table_name,
                    ''bnm_ratio_range_check'' AS check_name,
                    COUNT(1)::int4 AS count,
                    ''day_ratio_bnm < 0 or > 1'' AS description
                FROM price_markdown_opt.tb_day_split_mkd dsm
                INNER JOIN (SELECT DISTINCT l3_cid FROM active_products) ap 
                    ON ap.l3_cid = dsm.l3_cid
                INNER JOIN consider_week_start_dates wd
                    ON dsm.week_start_date BETWEEN wd.min_date AND wd.max_date
                WHERE day_ratio_bnm < 0 OR day_ratio_bnm > 1
            ),
            day_split_ecom_ratio_range_check AS (
                SELECT 
                    ''price_markdown_opt.tb_day_split_mkd'' AS table_name,
                    ''ecom_ratio_range_check'' AS check_name,
                    COUNT(1)::int4 AS count,
                    ''day_ratio_ecom < 0 or > 1'' AS description
                FROM price_markdown_opt.tb_day_split_mkd dsm
                INNER JOIN (SELECT DISTINCT l3_cid FROM active_products) ap 
                    ON ap.l3_cid = dsm.l3_cid
                INNER JOIN consider_week_start_dates wd
                    ON dsm.week_start_date BETWEEN wd.min_date AND wd.max_date
                WHERE day_ratio_ecom < 0 OR day_ratio_ecom > 1
            )
            SELECT * FROM day_split_l3_cid_check
            UNION ALL
            SELECT * FROM day_split_weeks_count_check
            UNION ALL
            SELECT * FROM day_split_days_count_check
            UNION ALL
            SELECT * FROM day_split_bnm_total_check
            UNION ALL
            SELECT * FROM day_split_ecom_total_check
            UNION ALL
            SELECT * FROM day_split_bnm_ratio_range_check
            UNION ALL
            SELECT * FROM day_split_ecom_ratio_range_check
        )';
    ELSE
        EXECUTE '
        CREATE UNLOGGED TABLE price_markdown_opt_temp.day_split_qc AS (
            SELECT
                NULL::text AS table_name,
                NULL::text AS check_name,
                0::int4    AS count,
                NULL::text AS description
            WHERE 1=0
        )';
    END IF;
-- 12. SIMULATION WEEK CHECKS
    IF table_names IS NULL OR 'price_markdown_opt.tb_simulation_week_mkd' = ANY(table_names) THEN
        EXECUTE '
        CREATE UNLOGGED TABLE price_markdown_opt_temp.simulation_week_qc AS (
            WITH active_products AS (
                SELECT DISTINCT l3_cid, product_id
                FROM price_markdown.product_master
                WHERE is_active = 1
            ),
            consider_week_start_dates AS (
                SELECT 
                    MIN(week_start_date) AS min_date,
                    MAX(week_start_date) AS max_date
                FROM price_markdown_opt.tb_simulation_week_mkd
                WHERE week_start_date BETWEEN current_date - 14 AND current_date + 90
            ),
            sim_products_check AS (
                SELECT 
                    ''price_markdown_opt.tb_simulation_week_mkd'' AS table_name,
                    ''count_check_sim_products'' AS check_name,
                    COUNT(DISTINCT ap.product_id)::int4 AS count, 
                    ''counts number of active products not present in simulation_week_mkd'' AS description
                FROM active_products ap
                LEFT JOIN (SELECT DISTINCT product_id FROM price_markdown_opt.tb_simulation_week_mkd) swm 
                    ON ap.product_id = swm.product_id
                WHERE swm.product_id IS NULL
            ),
            sim_weeks_count_check AS (
                SELECT 
                    ''price_markdown_opt.tb_simulation_week_mkd'' AS table_name,
                    ''count_check_weeks_count'' AS check_name,
                    COUNT(1)::int4 AS count,
                    ''counts number of active products present with less than 12 weeks'' AS description
                FROM (
                    SELECT swm.product_id, COUNT(DISTINCT swm.week_start_date) AS weeks_count
                    FROM price_markdown_opt.tb_simulation_week_mkd swm
                    INNER JOIN active_products ap 
                        ON ap.product_id = swm.product_id
                    INNER JOIN consider_week_start_dates wd
                        ON swm.week_start_date BETWEEN wd.min_date AND wd.max_date
                    GROUP BY swm.product_id
                ) a
                WHERE weeks_count < 12
            ),
            non_negative_sales_check AS (
                SELECT 
                    ''price_markdown_opt.tb_simulation_week_mkd'' AS table_name,
                    ''non_negative_sales_check'' AS check_name,
                    COUNT(DISTINCT swm.product_id)::int4 AS count, 
                    ''negative sales units (bnm or ecom)'' AS description
                FROM price_markdown_opt.tb_simulation_week_mkd swm
                INNER JOIN consider_week_start_dates wd
                    ON swm.week_start_date BETWEEN wd.min_date AND wd.max_date
                WHERE bnm_sales_units < 0 
                   OR bnm_baseline_sales_units < 0
                   OR ecom_sales_units < 0 
                   OR ecom_baseline_sales_units < 0
            )
            SELECT * FROM sim_products_check
            UNION ALL
            SELECT * FROM sim_weeks_count_check
            UNION ALL
            SELECT * FROM non_negative_sales_check
        )';
    ELSE
        EXECUTE '
        CREATE UNLOGGED TABLE price_markdown_opt_temp.simulation_week_qc AS (
            SELECT
                NULL::text AS table_name,
                NULL::text AS check_name,
                0::int4    AS count,
                NULL::text AS description
            WHERE 1=0
        )';
    END IF;

    -- 13. APPLICABLE MKD PRICE POINTS CHECKS
    IF table_names IS NULL OR 'price_markdown.tb_applicable_mkd_price_points' = ANY(table_names) THEN
        EXECUTE '
        CREATE UNLOGGED TABLE price_markdown_opt_temp.applicable_mkd_price_points_qc AS (
            WITH possible_currencies AS (
                SELECT country_id, COUNT(DISTINCT currency_id) AS possible_cnt
                FROM (
                    SELECT country_id, UNNEST(ARRAY[currency_id, dominating_currency_id, default_currency_id]) AS currency_id
                    FROM global.tb_country_currency_mapping
                ) t
                GROUP BY 1
            ),
            capped_final AS (
                SELECT product_id, country_id, stat_id, COUNT(DISTINCT currency_id) AS real_cnt
                FROM price_markdown.tb_applicable_mkd_price_points
                GROUP BY 1, 2, 3
            ),
            filter_comb AS (
                SELECT product_id, ft.country_id, stat_id
                FROM capped_final ft
                LEFT JOIN possible_currencies tcm
                    ON tcm.country_id = ft.country_id
                WHERE possible_cnt = real_cnt
            ),
            price_points_final AS (
                SELECT ap.*
                FROM price_markdown.tb_applicable_mkd_price_points ap
                INNER JOIN filter_comb f
                    ON f.product_id = ap.product_id
                    AND f.country_id = ap.country_id
                    AND f.stat_id = ap.stat_id
            )
            SELECT
                ''price_markdown.tb_applicable_mkd_price_points'' AS table_name,
                ''currency_coverage_check'' AS check_name,
                COUNT(DISTINCT product_id)::int4 AS count,
                ''products not having all possible currencies'' AS description
            FROM price_markdown.tb_applicable_mkd_price_points
            WHERE CONCAT(product_id, ''_'', country_id) NOT IN (
                SELECT DISTINCT CONCAT(product_id, ''_'', country_id)
                FROM price_points_final
            )
        )';
    ELSE
        EXECUTE '
        CREATE UNLOGGED TABLE price_markdown_opt_temp.applicable_mkd_price_points_qc AS (
            SELECT
                ''price_markdown.tb_applicable_mkd_price_points''::text AS table_name,
                ''currency_coverage_check''::text AS check_name,
                0::int4 AS count,
                ''skipped''::text AS description
            WHERE 1=0
        )';
    END IF;
    --14. ALL COUNT CHECK -- only runs when 'all_count_check' is explicitly passed
        IF 'all_count_check' = ANY(table_names) THEN
            EXECUTE '
            CREATE UNLOGGED TABLE price_markdown_opt_temp.all_count_check_qc AS (
                SELECT ''price_markdown.product_master'' AS table_name, ''count_check'' AS check_name, COUNT(*)::int4 AS count, ''total row count as of current date'' AS description FROM price_markdown.product_master
                UNION ALL
                SELECT ''price_markdown.tb_store_master'', ''count_check'', COUNT(*)::int4, ''total row count as of current date'' FROM price_markdown.tb_store_master
                UNION ALL
                SELECT ''global.tb_latest_inventory'', ''count_check'', COUNT(*)::int4, ''total row count as of current date'' FROM global.tb_latest_inventory
                UNION ALL
                SELECT ''global.tb_fiscal_date_mapping'', ''count_check'', COUNT(*)::int4, ''total row count as of current date'' FROM global.tb_fiscal_date_mapping
                UNION ALL
                SELECT ''global.tb_calendar_date_mapping'', ''count_check'', COUNT(*)::int4, ''total row count as of current date'' FROM global.tb_calendar_date_mapping
                UNION ALL
                SELECT ''price_markdown_opt.tb_transaction_latest_mkd'', ''count_check'', COUNT(*)::int4, ''total row count as of current date'' FROM price_markdown_opt.tb_transaction_latest_mkd
                UNION ALL
                SELECT ''price_markdown_opt.tb_simulation_week_mkd'', ''count_check'', COUNT(*)::int4, ''total row count as of current date'' FROM price_markdown_opt.tb_simulation_week_mkd
                UNION ALL
                SELECT ''price_markdown_opt.tb_day_split_mkd'', ''count_check'', COUNT(*)::int4, ''total row count as of current date'' FROM price_markdown_opt.tb_day_split_mkd
                UNION ALL
                SELECT ''price_markdown_opt.tb_store_split_mkd'', ''count_check'', COUNT(*)::int4, ''total row count as of current date'' FROM price_markdown_opt.tb_store_split_mkd
                UNION ALL
                SELECT ''price_markdown.tb_product_store_price'', ''count_check'', COUNT(*)::int4, ''total row count as of current date'' FROM price_markdown.tb_product_store_price
                UNION ALL
                SELECT ''global.tb_vat_master'', ''count_check'', COUNT(*)::int4, ''total row count as of current date'' FROM global.tb_vat_master
                UNION ALL
                SELECT ''global.tb_country_master'', ''count_check'', COUNT(*)::int4, ''total row count as of current date'' FROM global.tb_country_master
                UNION ALL
                SELECT ''global.tb_currency_master'', ''count_check'', COUNT(*)::int4, ''total row count as of current date'' FROM global.tb_currency_master
                UNION ALL
                SELECT ''global.tb_country_currency_mapping'', ''count_check'', COUNT(*)::int4, ''total row count as of current date'' FROM global.tb_country_currency_mapping
                UNION ALL
                SELECT ''global.actual_forex_rate'', ''count_check'', COUNT(*)::int4, ''total row count as of current date'' FROM global.actual_forex_rate
                UNION ALL
                SELECT ''global.planned_forex_rate'', ''count_check'', COUNT(*)::int4, ''total row count as of current date'' FROM global.planned_forex_rate
                UNION ALL
                SELECT ''pricesmart.product_master'', ''count_check'', COUNT(*)::int4, ''total row count as of current date'' FROM pricesmart.product_master
                UNION ALL
                SELECT ''pricesmart.tb_store_master'', ''count_check'', COUNT(*)::int4, ''total row count as of current date'' FROM pricesmart.tb_store_master
                UNION ALL
                SELECT ''price_markdown.tb_applicable_mkd_price_points_base'', ''count_check'', COUNT(*)::int4, ''total row count as of current date'' FROM price_markdown.tb_applicable_mkd_price_points_base
                UNION ALL
                SELECT ''price_markdown.tb_applicable_mkd_price_points'', ''count_check'', COUNT(*)::int4, ''total row count as of current date'' FROM price_markdown.tb_applicable_mkd_price_points
            )';
        ELSE
            EXECUTE '
            CREATE UNLOGGED TABLE price_markdown_opt_temp.all_count_check_qc AS (
                SELECT
                    NULL::text  AS table_name,
                    NULL::text  AS check_name,
                    0::int4     AS count,
                    NULL::text  AS description
                WHERE 1=0
            )';
        END IF;
    -- 15. FINAL DATA CONSOLIDATION
    EXECUTE format('
    INSERT INTO price_markdown_opt.mkd_data_ingestion_qc (table_name, check_name, count, description, qc_timestamp)
    SELECT a.table_name, a.check_name, a.count, a.description, %L AS qc_timestamp 
    FROM (
        SELECT table_name, check_name, count, description FROM price_markdown_opt_temp.fiscal_date_qc
        UNION ALL SELECT table_name, check_name, count, description FROM price_markdown_opt_temp.prod_master_qc
        UNION ALL SELECT table_name, check_name, count, description FROM price_markdown_opt_temp.product_store_price_qc
        UNION ALL SELECT table_name, check_name, count, description FROM price_markdown_opt_temp.store_master_qc
        UNION ALL SELECT table_name, check_name, count, description FROM price_markdown_opt_temp.global_tables_checks
        UNION ALL SELECT table_name, check_name, count, description FROM price_markdown_opt_temp.forex_tables_qc
        UNION ALL SELECT table_name, check_name, count, description FROM price_markdown_opt_temp.latest_inventory_qc
        UNION ALL SELECT table_name, check_name, count, description FROM price_markdown_opt_temp.transaction_latest_qc
        UNION ALL SELECT table_name, check_name, count, description FROM price_markdown_opt_temp.day_split_qc
        UNION ALL SELECT table_name, check_name, count, description FROM price_markdown_opt_temp.simulation_week_qc
        UNION ALL SELECT table_name, check_name, count, description FROM price_markdown_opt_temp.store_split_qc
        UNION ALL SELECT table_name, check_name, count, description FROM price_markdown_opt_temp.applicable_mkd_price_points_qc
        UNION ALL SELECT table_name, check_name, count, description FROM price_markdown_opt_temp.all_count_check_qc

    ) a', start_time);

    -- Cleanup temp tables (silently handle any errors)
    BEGIN
        EXECUTE 'DROP TABLE IF EXISTS price_markdown_opt_temp.fiscal_date_qc';
        EXECUTE 'DROP TABLE IF EXISTS price_markdown_opt_temp.prod_master_qc';
        EXECUTE 'DROP TABLE IF EXISTS price_markdown_opt_temp.product_store_price_qc';
        EXECUTE 'DROP TABLE IF EXISTS price_markdown_opt_temp.store_master_qc';
        EXECUTE 'DROP TABLE IF EXISTS price_markdown_opt_temp.global_tables_checks';
        EXECUTE 'DROP TABLE IF EXISTS price_markdown_opt_temp.forex_tables_qc';
        EXECUTE 'DROP TABLE IF EXISTS price_markdown_opt_temp.latest_inventory_qc';
        EXECUTE 'DROP TABLE IF EXISTS price_markdown_opt_temp.transaction_latest_qc';
        EXECUTE 'DROP TABLE IF EXISTS price_markdown_opt_temp.simulation_week_qc';
        EXECUTE 'DROP TABLE IF EXISTS price_markdown_opt_temp.store_split_qc';
        EXECUTE 'DROP TABLE IF EXISTS price_markdown_opt_temp.day_split_qc';
        EXECUTE 'DROP TABLE IF EXISTS price_markdown_opt_temp.applicable_mkd_price_points_qc';
        EXECUTE 'DROP TABLE IF EXISTS price_markdown_opt_temp.all_count_check_qc';
    EXCEPTION WHEN OTHERS THEN
        -- Silently ignore cleanup errors - tables may not exist or may have been cleaned up already
        NULL;
    END;

    RETURN QUERY
    SELECT q.table_name, q.check_name, q.count, q.description, q.qc_timestamp 
    FROM price_markdown_opt.mkd_data_ingestion_qc q
    WHERE q.qc_timestamp = start_time;

EXCEPTION WHEN OTHERS THEN
    -- Attempt cleanup on error
    BEGIN
        EXECUTE 'DROP TABLE IF EXISTS price_markdown_opt_temp.fiscal_date_qc';
        EXECUTE 'DROP TABLE IF EXISTS price_markdown_opt_temp.prod_master_qc';
        EXECUTE 'DROP TABLE IF EXISTS price_markdown_opt_temp.product_store_price_qc';
        EXECUTE 'DROP TABLE IF EXISTS price_markdown_opt_temp.store_master_qc';
        EXECUTE 'DROP TABLE IF EXISTS price_markdown_opt_temp.global_tables_checks';
        EXECUTE 'DROP TABLE IF EXISTS price_markdown_opt_temp.forex_tables_qc';
        EXECUTE 'DROP TABLE IF EXISTS price_markdown_opt_temp.latest_inventory_qc';
        EXECUTE 'DROP TABLE IF EXISTS price_markdown_opt_temp.transaction_latest_qc';
        EXECUTE 'DROP TABLE IF EXISTS price_markdown_opt_temp.simulation_week_qc';
        EXECUTE 'DROP TABLE IF EXISTS price_markdown_opt_temp.store_split_qc';
        EXECUTE 'DROP TABLE IF EXISTS price_markdown_opt_temp.day_split_qc';
        EXECUTE 'DROP TABLE IF EXISTS price_markdown_opt_temp.applicable_mkd_price_points_qc';
        EXECUTE 'DROP TABLE IF EXISTS price_markdown_opt_temp.all_count_check_qc';

    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;
    RAISE EXCEPTION 'QC Function failed with error: %', SQLERRM;
END;
$function$
;
