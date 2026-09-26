--liquibase formatted sql
--changeset keerthana.reddy@impactanalytics.co:fn_data_ingestion_qc_050725 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for fn_data_ingestion_qc

DROP FUNCTION IF EXISTS price_markdown_opt.fn_data_ingestion_qc;

CREATE OR REPLACE FUNCTION price_markdown_opt.fn_data_ingestion_qc()
RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    start_time timestamp;
    end_message text;
    failed_tables_count integer;
    product_master_qc text;
    global_tables_checks text;
    forex_tables_qc text;
    latest_inventory_qc text;
    transaction_latest_qc text;
    forecast_tables_qc text;
    mkd_data_ingestion_qc text;

BEGIN
    start_time := current_timestamp;
    RAISE NOTICE 'start time : %', start_time;

    -- product_master checks
    product_master_qc := '
    CREATE UNLOGGED TABLE price_markdown_opt_temp.prod_master_qc AS (
        WITH base_prod_master AS (
            SELECT * 
            FROM pricesmart.product_master 
            WHERE is_active = 1
        ),
        nulls_check_1 AS (
            SELECT 
                ''nulls_check'' AS check_name, 
                COUNT(1) AS count, 
                ''counts number of products have nulls in cost, msrp, age_month_bucket, vat'' AS description
            FROM base_prod_master 
            WHERE cost IS NULL
               OR msrp IS NULL
               OR msrp_with_vat IS NULL
               OR age_month_bucket IS NULL
               OR vat_rate_per IS NULL
        ),
        nulls_check_2 AS (
            SELECT 
                ''nulls_check'' AS check_name, 
                COUNT(1) AS count,
                ''counts number of products have nulls in product_id, hirerachy cids'' AS description
            FROM base_prod_master 
            WHERE product_id IS NULL
               OR l0_cid IS NULL
               OR l1_cid IS NULL
               OR l2_cid IS NULL
               OR l3_cid IS NULL
               OR l4_cid IS NULL
               OR l5_cid IS NULL
               OR l6_cid IS NULL
        ),
        nulls_check_3 AS (
            SELECT 
                ''nulls_check'' AS check_name, 
                COUNT(1) AS count, 
                ''counts number of products have nulls in hirerachy cuqs'' AS description
            FROM base_prod_master 
            WHERE l0_cuq IS NULL
               OR l1_cuq IS NULL
               OR l2_cuq IS NULL
               OR l3_cuq IS NULL
               OR l4_cuq IS NULL
               OR l5_cuq IS NULL
               OR l6_cuq IS NULL
        ),
        hierarchy_cuq_check AS (
            SELECT 
                ''hierarchy_cuq_check'' AS check_name, 
                COUNT(1) AS count, 
                ''counts number of products have mismatched hierarchy cuqs'' AS description
            FROM base_prod_master 
            WHERE (l1_cuq IS DISTINCT FROM CONCAT(l1_name, ''_'', l0_cuq)
                OR l2_cuq IS DISTINCT FROM CONCAT(l2_name, ''_'', l1_cuq)
                OR l3_cuq IS DISTINCT FROM CONCAT(l3_name, ''_'', l2_cuq)
                OR l4_cuq IS DISTINCT FROM CONCAT(l4_name, ''_'', l3_cuq)
                OR l5_cuq IS DISTINCT FROM CONCAT(l5_name, ''_'', l4_cuq)
                OR l6_cuq IS DISTINCT FROM CONCAT(sku, ''_'', l0_name))
        ),
        currency_mapping_check AS (
            SELECT 
                ''currency_mapping_check'' AS check_name, 
                COUNT(currency) AS count, 
                ''row counts of mismatched mapping from currency master'' AS description
            FROM (
                SELECT pm.currency_id, pm.currency 
                FROM base_prod_master pm
                RIGHT JOIN pricesmart.tb_currency_master cm ON pm.currency_id = cm.currency_id
                WHERE pm.currency != cm.currency_name
            ) a
        )    
        SELECT ''pricesmart.product_master'' AS table_name, * FROM nulls_check_1
        UNION ALL
        SELECT ''pricesmart.product_master'' AS table_name, * FROM nulls_check_2
        UNION ALL
        SELECT ''pricesmart.product_master'' AS table_name, * FROM nulls_check_3
        UNION ALL
        SELECT ''pricesmart.product_master'' AS table_name, * FROM hierarchy_cuq_check
        UNION ALL
        SELECT ''pricesmart.product_master'' AS table_name, * FROM currency_mapping_check
    )';
    
    RAISE NOTICE 'product_master_qc query : %', product_master_qc;
    EXECUTE product_master_qc;
    RAISE NOTICE 'product_master_qc temp table created';

    -- global_tables_checks
    global_tables_checks := '
    CREATE UNLOGGED TABLE price_markdown_opt_temp.global_tables_checks AS (
        WITH country_master_counts_check AS (
            SELECT 
                ''pricesmart.tb_country_master'' AS table_name,
                ''count_check_countries'' AS check_name, 
                COUNT(distinct country_id) AS count, 
                ''counts number of countries present'' AS description
            FROM pricesmart.tb_country_master
        ),
        currency_master_counts_check AS (
            SELECT 
                ''pricesmart.tb_currency_master'' AS table_name,
                ''count_check_currencies'' AS check_name, 
                COUNT(distinct currency_id) AS count, 
                ''counts number of currencies present'' AS description
            FROM pricesmart.tb_currency_master
        ),
        vat_master_counts_check AS (
            SELECT 
                ''pricesmart.tb_vat_master'' AS table_name,
                ''count_check_countries'' AS check_name, 
                COUNT(distinct l0_id) AS count, 
                ''counts number of l0_id present'' AS description
            FROM pricesmart.tb_vat_master
        ),
        vat_master_nulls_check AS (
            SELECT 
                ''pricesmart.tb_vat_master'' AS table_name,
                ''nulls_check'' AS check_name, 
                COUNT(1) AS count, 
                ''counts number of vat_percent col with nulls'' AS description
            FROM pricesmart.tb_vat_master
            WHERE var_percent IS NULL
        )
        SELECT * FROM country_master_counts_check
        UNION ALL
        SELECT * FROM currency_master_counts_check
        UNION ALL
        SELECT * FROM vat_master_counts_check
        UNION ALL
        SELECT * FROM vat_master_nulls_check
    )';
    
    RAISE NOTICE 'global_tables_checks query : %', global_tables_checks;
    EXECUTE global_tables_checks;
    RAISE NOTICE 'global_tables_checks temp table created';

    -- forex table checks
    forex_tables_qc := '
    CREATE UNLOGGED TABLE price_markdown_opt_temp.forex_tables_qc AS (
        WITH planned_forex_table_combinations_count AS (
            SELECT 
                ''pricesmart.planned_forex_rates'' AS table_name,
                ''count_check_currency_combinations'' AS check_name, 
                COUNT(DISTINCT (source_currency_id, target_currency_id)) AS count, 
                ''counts number of distinct currency combinations present'' AS description
            FROM pricesmart.planned_forex_rate
        ),
        planned_forex_table_nulls_check AS (
            SELECT 
                ''pricesmart.planned_forex_rates'' AS table_name,
                ''nulls_check'' AS check_name, 
                COUNT(1) AS count, 
                ''counts number of nulls in planned_forex_rates'' AS description
            FROM pricesmart.planned_forex_rate
            WHERE source_currency_id IS NULL
               OR target_currency_id IS NULL
               OR planned_conversion_multiplier IS NULL
        ),
        planned_forex_table_duplicates_check AS (
            SELECT 
                ''pricesmart.planned_forex_rates'' AS table_name,
                ''duplicates_check'' AS check_name, 
                COUNT(*) AS count, 
                ''counts number of duplicates combinations in planned_forex_rates'' AS description
            FROM (
                SELECT COUNT(*) AS count
                FROM pricesmart.planned_forex_rate
                GROUP BY source_currency_id, target_currency_id, date, planned_conversion_multiplier
                HAVING COUNT(*) > 1
            ) a
        ),
        planned_forex_table_dates_required_check AS (
            SELECT 
                ''pricesmart.planned_forex_rates'' AS table_name,
                ''count_check_dates_forex_required'' AS check_name, 
                COUNT(DISTINCT date) AS count, 
                ''counts number of distinct dates in planned_forex_rates'' AS description
            FROM pricesmart.planned_forex_rate
            WHERE date BETWEEN current_date - 180 AND current_date + 180
        ),
        planned_forex_table_date_combinations_check AS (
            SELECT 
                ''pricesmart.planned_forex_rates'' AS table_name,
                ''count_check_currency_date_combinations'' AS check_name, 
                COUNT(date) AS count,
                ''counts number of dates with not 10 distinct currency combinations'' AS description
            FROM (
                SELECT 
                    date, 
                    COUNT(DISTINCT (source_currency_id, target_currency_id)) AS count
                FROM pricesmart.planned_forex_rate    
                WHERE date BETWEEN current_date - 180 AND current_date + 180
                GROUP BY date
            ) a
            WHERE count != 10
        ),
        actual_forex_table_combinations_check AS (
            SELECT 
                ''pricesmart.actual_forex_rates'' AS table_name,
                ''count_check_currency_combinations'' AS check_name, 
                COUNT(DISTINCT (source_currency_id, target_currency_id)) AS count, 
                ''counts number of distinct currency combinations present'' AS description
            FROM pricesmart.actual_forex_rate
        ),
        actual_forex_table_nulls_check AS (
            SELECT 
                ''pricesmart.actual_forex_rates'' AS table_name,
                ''nulls_check'' AS check_name, 
                COUNT(1) AS count, 
                ''counts number of nulls in actual_forex_rate'' AS description
            FROM pricesmart.actual_forex_rate
            WHERE source_currency_id IS NULL
               OR target_currency_id IS NULL
               OR planned_conversion_multiplier IS NULL
        ),
        actual_forex_table_duplicates_check AS (
            SELECT 
                ''pricesmart.actual_forex_rates'' AS table_name,
                ''duplicates_check'' AS check_name, 
                COUNT(*) AS count, 
                ''counts number of duplicates combinations in actual_forex_rates'' AS description
            FROM (
                SELECT COUNT(*) AS count
                FROM pricesmart.actual_forex_rate
                GROUP BY source_currency_id, target_currency_id, date, planned_conversion_multiplier
                HAVING COUNT(*) > 1
            ) a
        ),
        actual_forex_table_dates_required_check AS (
            SELECT 
                ''pricesmart.actual_forex_rates'' AS table_name,
                ''count_check_dates_forex_required'' AS check_name, 
                COUNT(DISTINCT date) AS count, 
                ''counts number of distinct dates in actual_forex_rates'' AS description
            FROM pricesmart.actual_forex_rate
            WHERE date BETWEEN current_date - 180 AND current_date + 180
        ),
        actual_forex_table_date_combinations_check AS (
            SELECT 
                ''pricesmart.actual_forex_rates'' AS table_name,
                ''count_check_currency_date_combinations'' AS check_name, 
                COUNT(date) AS count,
                ''counts number of dates with not 10 distinct currency combinations'' AS description
            FROM (
                SELECT 
                    date, 
                    COUNT(DISTINCT (source_currency_id, target_currency_id)) AS count
                FROM pricesmart.actual_forex_rate    
                WHERE date BETWEEN current_date - 180 AND current_date + 180
                GROUP BY date
            ) a
            WHERE count != 10
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
        SELECT * FROM actual_forex_table_combinations_check
        UNION ALL
        SELECT * FROM actual_forex_table_nulls_check
        UNION ALL
        SELECT * FROM actual_forex_table_duplicates_check
        UNION ALL
        SELECT * FROM actual_forex_table_dates_required_check
        UNION ALL
        SELECT * FROM actual_forex_table_date_combinations_check
        ORDER BY 1
    )';
    
    RAISE NOTICE 'forex_tables_qc query : %', forex_tables_qc;
    EXECUTE forex_tables_qc;
    RAISE NOTICE 'forex_tables_qc temp table created';
    
    -- latest_inventory_qc
    latest_inventory_qc := '
    CREATE UNLOGGED TABLE price_markdown_opt_temp.latest_inventory_qc AS (
        WITH base_latest_inventory AS (
            SELECT pm.product_id as pm_product_id, l0_name, li.* 
            FROM pricesmart.tb_latest_inventory li
            RIGHT JOIN pricesmart.product_master pm ON pm.product_id = li.product_id
                AND is_active = 1
        ),
        latest_inventory_nulls_check AS (
            SELECT 
                ''pricesmart.tb_latest_inventory'' AS table_name,
                ''nulls_check'' AS check_name, 
                COUNT(pm_product_id) AS count, 
                ''counts number of products with null total_inventory'' AS description
            FROM base_latest_inventory
            WHERE total_inventory IS NULL
        ),
        latest_inventory_country_check AS (
            SELECT 
                ''pricesmart.tb_latest_inventory'' AS table_name,
                ''count_check_l0_name'' AS check_name, 
                COUNT(DISTINCT l0_name) AS count,   
                ''counts number of distinct l0_name with no inventory product presence'' AS description
            FROM base_latest_inventory
            WHERE total_inventory IS NULL
        )
        SELECT * FROM latest_inventory_nulls_check
        UNION ALL
        SELECT * FROM latest_inventory_country_check
        ORDER BY 1
    )';
    
    RAISE NOTICE 'latest_inventory_qc query : %', latest_inventory_qc;
    EXECUTE latest_inventory_qc;
    RAISE NOTICE 'latest_inventory_qc temp table created';
    
    -- transaction latest qc
    transaction_latest_qc := '
    CREATE UNLOGGED TABLE price_markdown_opt_temp.transaction_latest_qc AS (
        WITH null_check_1 AS (
            SELECT 
                ''global.tb_transaction_latest'' AS table_name,
                ''nulls_check'' AS check_name, 
                COUNT(DISTINCT product_id) AS count, 
                ''counts number of distinct products with null product_id'' AS description
            FROM price_markdown_opt.tb_transaction_latest_mkd tl
            WHERE product_id IS NULL
        ),
        null_check_2 AS (
            SELECT 
                ''global.tb_transaction_latest'' AS table_name,
                ''nulls_check'' AS check_name, 
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
                ''global.tb_transaction_latest'' AS table_name,
                ''nulls_check'' AS check_name, 
                COUNT(DISTINCT product_id) AS count, 
                ''counts number of distinct products with null values in vat, total_inv'' AS description
            FROM price_markdown_opt.tb_transaction_latest_mkd tl
            WHERE product_id IS NOT NULL 
              AND (vat_rate_per IS NULL OR total_inv IS NULL)
        ),
        null_check_4 AS (
            SELECT 
                ''global.tb_transaction_latest'' AS table_name,
                ''nulls_check'' AS check_name, 
                COUNT(DISTINCT product_id) AS count, 
                ''counts number of distinct products with null values in currency, currency_id'' AS description
            FROM price_markdown_opt.tb_transaction_latest_mkd tl
            WHERE product_id IS NOT NULL 
              AND (currency IS NULL OR currency_id IS NULL)
        ),
        currency_mapping_check AS (
            SELECT 
                ''global.tb_transaction_latest'' AS table_name,
                ''currency_mapping_check'' AS check_name, 
                COUNT(DISTINCT tl.product_id) AS count, 
                ''counts number of distinct products with mismatched currency, currency_id'' AS description
            FROM price_markdown_opt.tb_transaction_latest_mkd tl
            LEFT JOIN pricesmart.product_master pm ON pm.product_id = tl.product_id
            WHERE tl.product_id IS NOT NULL 
              AND (pm.currency_id != tl.currency_id OR pm.currency != tl.currency)
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
        ORDER BY 1
    )';
    
    RAISE NOTICE 'transaction_latest_qc query : %', transaction_latest_qc;
    EXECUTE transaction_latest_qc;
    RAISE NOTICE 'transaction_latest_qc temp table created';

    -- forecast tables qc
    forecast_tables_qc := '
    CREATE UNLOGGED TABLE price_markdown_opt_temp.forecast_tables_qc AS (
        WITH active_products AS (
            SELECT l3_cid, product_id 
            FROM pricesmart.product_master
            WHERE is_active = 1
        ),
        sim_products_check AS (
            SELECT 
                ''price_markdown_opt.tb_simulation_week_mkd'' AS table_name,
                ''count_check_sim_products'' AS check_name,
                COUNT(DISTINCT ap.product_id) AS count, 
                ''counts number of active products not present in simulation_week_mkd'' AS description
            FROM active_products ap
            LEFT JOIN (SELECT DISTINCT product_id from price_markdown_opt.tb_simulation_week_mkd) swm ON ap.product_id = swm.product_id
            WHERE swm.product_id IS NULL
        ),
        sim_weeks_count_check AS (
            SELECT ''price_markdown_opt.tb_simulation_week_mkd'' AS table_name,
                ''count_check_weeks_count'' AS check_name,
                COUNT(1) AS count,
                ''counts number of active products present with less than 24FW,2BW weeks'' AS description
            FROM (
                SELECT swm.product_id, COUNT(DISTINCT week_start_date) AS weeks_count
                FROM price_markdown_opt.tb_simulation_week_mkd swm
                INNER JOIN active_products ap ON ap.product_id = swm.product_id
                WHERE week_start_date BETWEEN current_date - 21 AND current_date + 179
                GROUP BY swm.product_id
            ) a
            WHERE weeks_count < 26
        ),
        day_split_l3_cid_check AS (
            SELECT 
                ''price_markdown_opt.tb_day_split_mkd'' AS table_name,
                ''count_check_l3_cid'' AS check_name,
                COUNT(DISTINCT ap.l3_cid) AS count, 
                ''counts number of active l3_cid not present in day_split_mkd'' AS description
            FROM active_products ap
            LEFT JOIN (SELECT DISTINCT l3_cid from price_markdown_opt.tb_day_split_mkd) dsm ON ap.l3_cid = dsm.l3_cid
            WHERE dsm.l3_cid IS NULL
        ),
        day_split_base AS(
            SELECT dsm.l3_cid, week_start_date, SUM(day_split_ratio) AS total_ratio, COUNT(DISTINCT date) AS days_count
            FROM price_markdown_opt.tb_day_split_mkd dsm
            INNER JOIN (SELECT DISTINCT l3_cid FROM active_products) ap ON ap.l3_cid = dsm.l3_cid
            WHERE date BETWEEN current_date - 21 AND current_date + 179
            GROUP BY dsm.l3_cid, week_start_date
        ),
        day_split_weeks_count_check AS (
            SELECT ''price_markdown_opt.tb_day_split_mkd'' AS table_name,
                ''count_check_weeks_count'' AS check_name,
                COUNT(1) AS count,
                ''counts number of l3_cid combinations with less than 24FW,2BW weeks'' AS description
            FROM (
                SELECT l3_cid, COUNT(DISTINCT week_start_date) AS weeks_count
                FROM day_split_base
                GROUP BY l3_cid
            ) a
            WHERE weeks_count < 26
        ),
        day_split_days_count_check AS (
            SELECT ''price_markdown_opt.tb_day_split_mkd'' AS table_name,
                ''count_check_days_count'' AS check_name,
                COUNT(1) AS count,
                ''counts number of active l3_cid, week_start_date combinations with not 7 days'' AS description
            FROM day_split_base
            WHERE days_count != 7
        ),
        day_split_total_check AS (
            SELECT 
                ''price_markdown_opt.tb_day_split_mkd'' AS table_name,
                ''count_check_l3_cid_week_start_date'' AS check_name,
                COUNT(1) AS count,
                ''count of combinations of active l3_cid, week_start_date with sum of day_split_ratio less than 0.999 for the week'' AS description
            FROM day_split_base
            WHERE total_ratio < 0.999
        )
        SELECT * FROM sim_products_check
        UNION ALL
        SELECT * FROM sim_weeks_count_check
        UNION ALL
        SELECT * FROM day_split_l3_cid_check
        UNION ALL
        SELECT * FROM day_split_weeks_count_check
        UNION ALL
        SELECT * FROM day_split_days_count_check
        UNION ALL
        SELECT * FROM day_split_total_check
        ORDER BY 1
    )';
    
    RAISE NOTICE 'forecast_tables_qc query : %', forecast_tables_qc;
    EXECUTE forecast_tables_qc;
    RAISE NOTICE 'forecast_tables_qc temp table created';

    mkd_data_ingestion_qc := '
    INSERT INTO price_markdown_opt.mkd_data_ingestion_qc (
        SELECT *, ''' || start_time || ''' AS qc_timestamp 
        FROM (
            SELECT * FROM price_markdown_opt_temp.prod_master_qc
            UNION ALL
            SELECT * FROM price_markdown_opt_temp.global_tables_checks
            UNION ALL
            SELECT * FROM price_markdown_opt_temp.forex_tables_qc
            UNION ALL
            SELECT * FROM price_markdown_opt_temp.latest_inventory_qc
            UNION ALL
            SELECT * FROM price_markdown_opt_temp.transaction_latest_qc
            UNION ALL
            SELECT * FROM price_markdown_opt_temp.forecast_tables_qc
        ) a
    )';
    
    RAISE NOTICE 'mkd_data_ingestion_qc query : %', mkd_data_ingestion_qc;
    EXECUTE mkd_data_ingestion_qc;
    RAISE NOTICE 'mkd_data_ingestion_qc data inserted';

    SELECT COUNT(DISTINCT table_name) INTO failed_tables_count
    FROM price_markdown_opt.mkd_data_ingestion_qc 
    WHERE qc_timestamp = start_time
      AND ( (count > 0 AND check_name NOT IN ('count_check_countries', 'count_check_currencies', 'count_check_currency_combinations', 'count_check_dates_forex_required'))
      OR (count != 6 AND check_name = 'count_check_countries')
      OR (count != 5 AND check_name = 'count_check_currencies')
      OR (count != 10 AND check_name = 'count_check_currency_combinations')
      OR (count != 200 AND check_name = 'count_check_dates_forex_required'))
    ;

    IF failed_tables_count > 0 THEN
        end_message := 'Data Ingestion QC Failed for ' || failed_tables_count || '/10 tables. 
        For more details, run the query: 
        SELECT * FROM price_markdown_opt.mkd_data_ingestion_qc 
        WHERE qc_timestamp = ''' || start_time || ''' 
        AND ( (count > 0 AND check_name NOT IN (''count_check_countries'', ''count_check_currencies'', ''count_check_currency_combinations'', ''count_check_dates_forex_required''))
        OR (count != 6 AND check_name = ''count_check_countries'')
        OR (count != 5 AND check_name = ''count_check_currencies'')
        OR (count != 10 AND check_name = ''count_check_currency_combinations'')
        OR (count != 200 AND check_name = ''count_check_dates_forex_required'')
        );';
    ELSE
        end_message := 'Data Ingestion QC Passed';
    END IF;

    BEGIN
        EXECUTE 'DROP TABLE IF EXISTS price_markdown_opt_temp.prod_master_qc';
        EXECUTE 'DROP TABLE IF EXISTS price_markdown_opt_temp.global_tables_checks';
        EXECUTE 'DROP TABLE IF EXISTS price_markdown_opt_temp.forex_tables_qc';
        EXECUTE 'DROP TABLE IF EXISTS price_markdown_opt_temp.latest_inventory_qc';
        EXECUTE 'DROP TABLE IF EXISTS price_markdown_opt_temp.transaction_latest_qc';
        EXECUTE 'DROP TABLE IF EXISTS price_markdown_opt_temp.forecast_tables_qc';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Error during cleanup, proceeding with function exit.';
    END;
    
    RETURN end_message;
END;
$function$
;
