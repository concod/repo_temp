--liquibase formatted sql
--changeset keerthana.reddy@impactanalytics.co:pc_preprocess_generic_cadence_df_discounts_26022026 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_generic_cadence_df_discounts

DROP PROCEDURE IF EXISTS price_markdown_opt.pc_preprocess_generic_cadence_df_discounts;

CREATE OR REPLACE PROCEDURE price_markdown_opt.pc_preprocess_generic_cadence_df_discounts(
    IN p_output_table                           text,
    IN p_strategy_id                            integer,
    IN p_currency_view                          text,
    IN p_tb_discount_opt_cluster_base_id        text,
    IN p_tb_applicable_price_disc_sim_base_data text,
    IN p_stg_start_date                         date,
    IN p_stg_end_date                           date
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $procedure$
DECLARE
    v_sql text;
BEGIN

    v_sql := format(
    $sql$
    DROP TABLE IF EXISTS price_markdown_opt_temp.%7$I;

    CREATE TABLE price_markdown_opt_temp.%7$I AS
    WITH get_currencies AS (
        SELECT DISTINCT
            a.store_level_id,
            CASE
                WHEN %2$L = 'local'      THEN c.s1_id
                WHEN %2$L = 'dominating' THEN c.s0_id
                ELSE 1
            END AS country_id,
            CASE
                WHEN %2$L = 'local'      THEN d.currency_id
                WHEN %2$L = 'dominating' THEN d.dominating_currency_id
                ELSE d.default_currency_id
            END AS currency_id
        FROM price_markdown_opt_temp.%1$I a
        INNER JOIN price_markdown.tb_strategy_sku_store_mapping_%4$s b
            ON a.store_level_id = b.store_level_id
        INNER JOIN price_markdown.tb_store_master c
            ON b.store_id = c.store_id
        INNER JOIN global.tb_country_currency_mapping d
            ON c.s1_id = d.country_id
    ),
    get_min_possible_price AS (
        SELECT
            CASE
                WHEN %2$L = 'local'      THEN d.currency_id
                WHEN %2$L = 'dominating' THEN d.dominating_currency_id
                ELSE d.default_currency_id
            END AS currency_id,
            MIN(
                CASE
                    WHEN %2$L = 'local'      THEN b.msrp_with_vat
                    WHEN %2$L = 'dominating' THEN b.msrp_territory_with_vat
                    ELSE b.msrp_default_with_vat
                END
            ) AS min_price
        FROM price_markdown.tb_strategy_sku_store_mapping_%4$s a
        INNER JOIN price_markdown.tb_product_store_price b
            ON a.product_id = b.product_id
            AND a.store_id = b.store_id
        INNER JOIN price_markdown.tb_store_master c
            ON b.store_id = c.store_id
        INNER JOIN global.tb_country_currency_mapping d
            ON c.s1_id = d.country_id
        GROUP BY 1
    ),
    get_possible_discounts AS (
        SELECT DISTINCT
            gc.country_id,
            gc.currency_id,
            a.effective_opt_discount_exact AS effective_opt_discount,
            a.stat_id
        FROM price_markdown_opt_temp.%3$I a
        INNER JOIN get_min_possible_price b
            ON a.currency_id = b.currency_id
        INNER JOIN get_currencies gc
            ON a.currency_id = gc.currency_id
        WHERE a.selling_price_with_vat <= b.min_price
    ),
    opt_clusters_all AS (
        SELECT DISTINCT
            opt_cluster                              AS opt_level_bins,
            split_part(opt_cluster, '_', 1)::integer AS country_cluster
        FROM price_markdown_opt_temp.%1$I
    ),
    get_week_start_dates AS (
        SELECT
            b1.pcd_id                AS event,
            MIN(fdm.weeks_start_date) AS week_start_date
        FROM price_markdown.tb_strategy_pcd b1
        INNER JOIN global.tb_fiscal_date_mapping fdm
            ON fdm.date >= b1.pcd_start_date
            AND fdm.date <= b1.pcd_end_date
        WHERE b1.strategy_id  = %4$s
            AND b1.pcd_start_date >= %5$L
            AND b1.pcd_end_date   <= %6$L
        GROUP BY 1
    )
    SELECT
        DISTINCT
        oca.opt_level_bins,
        oca.country_cluster                         AS product_id,
        CASE
            WHEN %2$L = 'local'      THEN ABS(oca.country_cluster + 300)
            WHEN %2$L = 'dominating' THEN ABS(oca.country_cluster + 400)
            ELSE                          ABS(oca.country_cluster + 500)
        END                                         AS country_id,
        2 as currency_id,
        gpd.effective_opt_discount,
        gpd.stat_id,
        wsd.event,
        wsd.week_start_date
    FROM opt_clusters_all oca
    INNER JOIN get_possible_discounts gpd
        ON CASE
               WHEN %2$L = 'local'      THEN ABS(oca.country_cluster + 300)
               WHEN %2$L = 'dominating' THEN ABS(oca.country_cluster + 400)
               ELSE                          ABS(oca.country_cluster + 500)
           END = gpd.country_id
    CROSS JOIN get_week_start_dates wsd
    $sql$,
    p_tb_discount_opt_cluster_base_id,           -- %1$I  table identifier
    p_currency_view,                             -- %2$L  literal value
    p_tb_applicable_price_disc_sim_base_data,    -- %3$I  table identifier
    p_strategy_id,                               -- %4$s  integer
    p_stg_start_date,                            -- %5$L  date literal
    p_stg_end_date,                              -- %6$L  date literal
    p_output_table                               -- %7$I  output table identifier
    );

    RAISE NOTICE 'Executing query: %', v_sql;

    EXECUTE v_sql;

END;
$procedure$;