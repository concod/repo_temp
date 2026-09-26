--liquibase formatted sql
    --changeset vaibhav:simulation_week_opt stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
    --comment: initial changeset for simulation_week_opt

    CREATE TABLE price_promo_opt.tb_simulation_week_opt (
        product_id INTEGER NOT NULL,
        week_start_date DATE NOT NULL,
        base_percentage INTEGER,
        bnm_sales_units FLOAT,
        bnm_baseline_sales_units FLOAT,
        bnm_elasticity FLOAT,
        bnm_product_split_ratio FLOAT,
        ecom_sales_units FLOAT,
        ecom_baseline_sales_units FLOAT,
        ecom_elasticity FLOAT,
        ecom_product_split_ratio FLOAT
    ) PARTITION BY RANGE (week_start_date);

    CREATE INDEX idx_product_basepercentage ON
    price_promo_opt.tb_simulation_week_opt
    USING BTREE (product_id, base_percentage);