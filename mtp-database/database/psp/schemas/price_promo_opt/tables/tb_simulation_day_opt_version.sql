--liquibase formatted sql
--changeset sriraj.varanasi@impactanalytics.co:tb_simulation_day_opt_version_v3 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: recreated tb_simulation_day_opt_version with correct table level (product_id, date, base_percentage)

DROP TABLE IF EXISTS price_promo_opt.tb_simulation_day_opt_version CASCADE;

CREATE TABLE IF NOT EXISTS price_promo_opt.tb_simulation_day_opt_version (
    product_id INT4 NOT NULL,
    simulation_week_start_date DATE NULL,
    "date" DATE NOT NULL,
    base_percentage INT4 NOT NULL,
    sales_units FLOAT8 NULL,
    baseline_sales_units FLOAT8 NULL,
    elasticity FLOAT8 NULL,
    store_split_level VARCHAR NULL,
    day_split_ratio FLOAT8 NULL,
    end_cap_hierarchy_level VARCHAR NULL,
    end_cap_multiplier FLOAT8 NULL,
    reg_price_multiplier FLOAT8 NULL,
    version_code INT4 NOT NULL,
    CONSTRAINT tb_simulation_day_opt_version_pk 
        PRIMARY KEY (product_id, "date", base_percentage, version_code)
)
PARTITION BY LIST (version_code);

CREATE INDEX idx_tb_simulation_day_opt_version_prod_base
ON price_promo_opt.tb_simulation_day_opt_version 
USING btree (product_id, "date", base_percentage);
