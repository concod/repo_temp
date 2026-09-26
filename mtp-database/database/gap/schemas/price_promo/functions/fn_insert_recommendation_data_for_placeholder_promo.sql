--liquibase formatted sql
--changeset vamsi.balaga@impactanalytics.co:fn_insert_recommendation_data_for_placeholder_promo runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for price_promo.fn_insert_recommendation_data_for_placeholder_promo

drop function if exists price_promo.fn_insert_recommendation_data_for_placeholder_promo;
CREATE OR REPLACE FUNCTION price_promo.fn_insert_recommendation_data_for_placeholder_promo(
    p_promo_id INT,
    p_start_date DATE,
    p_end_date DATE,
    p_sales_units NUMERIC,
    p_revenue NUMERIC,
    p_margin NUMERIC
)
RETURNS VOID AS $$
DECLARE
    day_diff INT;
BEGIN
    -- Calculate the difference in days
    day_diff := p_end_date - p_start_date;

    -- Bulk insert into ps_recommended_finalized_agg
    INSERT INTO price_promo.ps_recommended_finalized_agg (
        promo_id, recommendation_date, sales_units, baseline_sales_units, incremental_sales_units, 
        revenue, baseline_revenue, incremental_revenue, margin, baseline_margin, incremental_margin
    )
    SELECT 
        p_promo_id,
        p_start_date + s.i AS recommendation_date,
        COALESCE(p_sales_units, 0) / (day_diff + 1) AS sales_units,
        COALESCE(p_sales_units, 0) / (day_diff + 1) AS baseline_sales_units,
        0 AS incremental_sales_units,
        COALESCE(p_revenue, 0) / (day_diff + 1) AS revenue,
        COALESCE(p_revenue, 0) / (day_diff + 1) AS baseline_revenue,
        0 AS incremental_revenue,
        COALESCE(p_margin, 0) / (day_diff + 1) AS margin,
        COALESCE(p_margin, 0) / (day_diff + 1) AS baseline_margin,
        0 AS incremental_margin
    FROM generate_series(0, day_diff) AS s(i);

    -- Bulk insert into ps_recommended_finalized_stack_agg
    INSERT INTO price_promo.ps_recommended_finalized_stack_agg (
        promo_ids, recommendation_date, sales_units, baseline_sales_units, incremental_sales_units, 
        revenue, baseline_revenue, incremental_revenue, margin, baseline_margin, incremental_margin
    )
    SELECT 
        ARRAY[p_promo_id]::INT[] AS promo_ids,
        p_start_date + s.i AS recommendation_date,
        COALESCE(p_sales_units, 0) / (day_diff + 1) AS sales_units,
        COALESCE(p_sales_units, 0) / (day_diff + 1) AS baseline_sales_units,
        0 AS incremental_sales_units,
        COALESCE(p_revenue, 0) / (day_diff + 1) AS revenue,
        COALESCE(p_revenue, 0) / (day_diff + 1) AS baseline_revenue,
        0 AS incremental_revenue,
        COALESCE(p_margin, 0) / (day_diff + 1) AS margin,
        COALESCE(p_margin, 0) / (day_diff + 1) AS baseline_margin,
        0 AS incremental_margin
    FROM generate_series(0, day_diff) AS s(i);
END;
$$ LANGUAGE plpgsql;
