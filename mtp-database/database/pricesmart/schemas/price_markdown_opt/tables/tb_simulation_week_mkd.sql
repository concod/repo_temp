--liquibase formatted sql
    --changeset kumaran:tb_simulation_week_mkd_v3 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
    --comment: initial changeset for tb_simulation_week_mkd_v3

CREATE TABLE price_markdown_opt.tb_simulation_week_mkd (
        product_id int4 NOT NULL,
        week_start_date date NOT NULL,
        base_percentage int4 NULL,
        bnm_sales_units float8 NULL,
        bnm_baseline_sales_units float8 NULL,
        bnm_elasticity float8 NULL,
        ecom_sales_units float8 NULL,
        ecom_baseline_sales_units float8 NULL,
        ecom_elasticity float8 NULL
)
PARTITION BY RANGE (week_start_date);
CREATE INDEX idx_product_basepercentage ON price_markdown_opt.tb_simulation_week_mkd USING btree (product_id, base_percentage);
