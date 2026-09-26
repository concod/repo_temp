--liquibase formatted sql
--changeset chandranil.ghosh@impactanalytics.co:primark_approval_pane_base_14 runOnChange:true stripComments:false splitStatements:false context:Release_1_1 labels:MTP-55924v2
--comment: MTP-126974 Removed l2_name from the function
--rollback: SELECT 1

DROP FUNCTION IF EXISTS oms.get_gbq_off_cycle_expedite_orders_alerts_query(text, text);
CREATE OR REPLACE FUNCTION oms.get_gbq_off_cycle_expedite_orders_alerts_query(article_loc_data text, bq_dataset text)
 RETURNS TABLE(get_gbq_off_cycle_expedite_orders_alerts_query text)
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_articles       text;
    v_article_filter text := '';
    v_query          text;
BEGIN
    /*
     * article_loc_data can arrive in two shapes:
     *
     *   (a) JSON array  — e.g. [{"article":"X","loc_code":"Y"},...]
     *       Used when the caller pre-fetches Postgres rows and batches them.
     *       We extract a quoted IN-list and push it into the BQ WHERE clause.
     *
     *   (b) JSON object — the raw product_attribute_query dict passed from the
     *       Python service (e.g. {"l0_name":[...],"l2_name":[...]}).
     *       We cannot meaningfully parse it into an article list at this layer,
     *       so we omit the article filter entirely.  The Python-side inner merge
     *       on (l6_id, loc_code, size) filters the BigQuery result down to only
     *       the articles that also appear in the Postgres result set.
     */
    IF json_typeof(article_loc_data::json) = 'array' THEN
        SELECT string_agg(DISTINCT '''' || (elem->>'article') || '''', ', ')
        INTO   v_articles
        FROM   json_array_elements(article_loc_data::json) AS elem;

        IF v_articles IS NOT NULL AND v_articles <> '' THEN
            v_article_filter := 'WHERE pm.article IN (' || v_articles || ')';
        END IF;
    END IF;
    -- If article_loc_data is a JSON object (PA filter dict), v_article_filter
    -- stays '' → BigQuery returns the full dataset; Python merge handles filtering.

    v_query := format(
        $bq$
        WITH latest_price AS (
            -- One avg price per product_code (channel dropped to avoid fan-out)
            SELECT tm.product_code, AVG(tm.price) AS avg_price
            FROM `%1$s.transaction_master` AS tm
            GROUP BY 1
        ),
        recom_dates AS (
            SELECT DISTINCT oo.product_code, oo.loc_code,
                fd.fiscal_year_week AS recom_fyw
            FROM `%1$s.oms_orders_recommended` oo
            LEFT JOIN `%1$s.fiscal_date_mapping` fd
                ON DATE(oo.recom_receipt_date) = fd.calendar_date
            WHERE LOWER(oo.order_type) = 'immediate'
        ),
        safety_stock_bop AS (
            -- GROUP BY (not window func) so exactly one row per (product_code, loc_code)
            SELECT a.product_code, a.loc_code,
                SUM(CASE WHEN a.fiscal_year_week = r.recom_fyw
                         THEN COALESCE(a.dc_inv_bop_post_allocation, 0)
                         ELSE 0 END) AS bop_inv,
                -- safety_stock column missing in Primark oms_total_dc_forecast → defaulting to 0
                -- TODO: add safety_stock column to Primark GBQ oms_total_dc_forecast (see section 3 below)
                CAST(0 AS FLOAT64) AS safety_stock
            FROM `%1$s.oms_total_dc_forecast` AS a
            JOIN recom_dates AS r
                ON a.product_code = r.product_code AND a.loc_code = r.loc_code
            GROUP BY a.product_code, a.loc_code
        ),
        lost_sales_agg AS (
            -- One row per (product_code, loc_code)
            SELECT a.product_code, a.loc_code,
                ROUND(SUM(a.lost_sales), 2) AS lost_sales
            FROM `%1$s.oms_total_dc_forecast` AS a
            GROUP BY 1, 2
        )
        SELECT
            pm.article                                                        AS l6_id,
            ls.loc_code,
            CAST('ALL' AS STRING)                                             AS Size,
            COALESCE(SUM(ls.lost_sales),                        0)           AS lost_sales,
            COALESCE(SUM(ssb.bop_inv),                          0)           AS bop_inv,
            COALESCE(SUM(ssb.safety_stock),                     0)           AS safety_stock,
            COALESCE(ROUND(SUM(ls.lost_sales * COALESCE(lp.avg_price, 0)), 2), 0) AS revenue,
            COALESCE(AVG(lp.avg_price),                         0)           AS price
        FROM `%1$s.product_master` AS pm
        JOIN  lost_sales_agg  AS ls  ON pm.product_code = ls.product_code
        LEFT JOIN safety_stock_bop ssb
            ON pm.product_code = ssb.product_code
           AND ls.loc_code     = ssb.loc_code
        LEFT JOIN latest_price lp ON lp.product_code = pm.product_code
        %2$s
        GROUP BY pm.article, ls.loc_code
        $bq$,
        bq_dataset,
        v_article_filter
    );

    RETURN QUERY SELECT v_query;
END;
$function$
;
