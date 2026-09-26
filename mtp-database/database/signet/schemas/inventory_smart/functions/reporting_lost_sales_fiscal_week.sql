--liquibase formatted sql
--changeset rohanpowar.v@impactanalytics.co:reporting_lost_sales_fiscal_week stripComments:false splitStatements:false runOnChange:true context:RELEASE_1_0_2 labels:MTP-51282
--comment MTP-51282
DROP FUNCTION IF EXISTS inventory_smart.reporting_lost_sales_fiscal_week(input refcursor, jsonb, jsonb, integer[], jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.reporting_lost_sales_fiscal_week(input refcursor, _pa jsonb, _sa jsonb, _weeks integer[], _table_filters jsonb)
RETURNS refcursor
LANGUAGE plpgsql
AS $function$
DECLARE
    _query TEXT;
    _query_pa TEXT;
    _query_sa TEXT;
    _query_table_filters TEXT;
    min_fiscal_year_week INTEGER;
BEGIN

    SELECT MIN(fiscal_year_week)
    INTO min_fiscal_year_week
    FROM inventory_smart.lost_sales
    WHERE fiscal_year_week = ANY(_weeks);


    _query_pa := global.form_main_table_filters('product_attributes_filter', _pa);
    _query_sa := global.form_main_table_filters('store_attributes_filter', _sa);

    IF (_table_filters -> 'limit' ->> 'limit')::int = -1 THEN
    _table_filters := _table_filters - 'limit';
    END IF;

    _query_table_filters := global.form_table_query(_table_filters);

    _query := format($$
        WITH paf AS MATERIALIZED (
            SELECT
                article,
                l0_name,
                product_description,
                l1_name,
                l2_name,
                product_code
            FROM global.product_attributes_filter
            %s
            GROUP BY 1,2,3,4,5,6
            ORDER BY article
        ),
        saf AS MATERIALIZED (
            SELECT
                store_code,
                store_name,
                region,
                dma_name AS dma
            FROM global.store_attributes_filter
            %s
        ),
        lost_sales_filtered AS MATERIALIZED (
            SELECT
                ls.product_code,
                ls.store_code,
                ls.fiscal_year_week,
                ls.actual_sales,
                ls.oh,
                ls.end_of_week_min,
                ls.end_of_week_model_stock,
                ls.lost_sales,
                ls.vpro
            FROM inventory_smart.lost_sales ls
            JOIN paf ON ls.product_code = paf.product_code
            JOIN saf ON ls.store_code = saf.store_code
            WHERE ls.fiscal_year_week = ANY(%L::int[])
              AND ls.lost_sales > 0
        ),
        sales AS MATERIALIZED (
            SELECT
                product_code,
                store_code,
                SUM(actual_sales) AS actual_sales,
                ROUND(AVG(oh::numeric), 2) AS oh_average
            FROM lost_sales_filtered
            GROUP BY 1,2
        ),
        eow_data AS MATERIALIZED (
            SELECT
                product_code,
                store_code,
                oh,
                end_of_week_min,
                end_of_week_model_stock
            FROM lost_sales_filtered
            WHERE fiscal_year_week = %L
        ),
        final_result_initial_2 AS MATERIALIZED (
            SELECT
                lsf.product_code,
                lsf.store_code,
                saf.store_name,
                saf.dma,
                lsf.vpro,
                saf.region,
                paf.l0_name,
                paf.product_description,
                paf.l1_name,
                paf.l2_name,
                SUM(lsf.lost_sales) AS lost_sales
            FROM lost_sales_filtered lsf
            JOIN paf ON lsf.product_code = paf.product_code
            JOIN saf ON lsf.store_code = saf.store_code
            GROUP BY
                1,2,3,4,5,6,7,8,9,10
        )
        SELECT
            fri.product_code,
            fri.store_code,
            fri.store_name,
            fri.dma,
            fri.vpro,
            fri.region,
            fri.l0_name,
            fri.product_description,
            fri.l1_name,
            fri.l2_name,
            ed.oh,
            s.oh_average,
            ed.end_of_week_min,
            ed.end_of_week_model_stock,
            s.actual_sales,
            fri.lost_sales,
            CASE
                WHEN ed.end_of_week_model_stock = 0 THEN 0
               ELSE ROUND((fri.lost_sales * 100 / ed.end_of_week_model_stock)::numeric,2)         
            END AS lost_sales_to_model_stock_perc,
            CONCAT(fri.product_code, '-', fri.store_code) AS key
        FROM final_result_initial_2 fri
        LEFT JOIN eow_data ed USING (product_code, store_code)
        LEFT JOIN sales s USING (product_code, store_code)
        %s
    $$,
        _query_pa,
        _query_sa,
        _weeks,
        min_fiscal_year_week,
        _query_table_filters
    );

    --Debug output
    RAISE NOTICE 'Generated Query: %', _query;

    OPEN input FOR EXECUTE _query;
    RETURN input;
END;
$function$
;
