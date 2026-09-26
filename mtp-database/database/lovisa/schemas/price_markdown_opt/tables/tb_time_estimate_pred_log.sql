--liquibase formatted sql
--changeset liquibase:keerthana.reddy@impactanalytics.com:tb_time_estimate_pred_log stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for tb_time_estimate_pred_log

-- Create table for logging predictions
CREATE TABLE IF NOT EXISTS price_markdown_opt.tb_time_estimate_pred_log (
    model_name TEXT,
    strategy_id INTEGER,
    product_recommendation_level INTEGER,
    store_recommendation_level INTEGER,
    sku_count INTEGER,
    store_count INTEGER,
    pcd_count INTEGER,
    discount_count INTEGER,
    pred_time_in_sec FLOAT,
    return_query TEXT,
    load_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
