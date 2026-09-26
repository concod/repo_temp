--liquibase formatted sql
--changeset keerthana.reddy@impactanalytics.co:tb_simulation_week_mkd_v04082025 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: updated schema for tb_simulation_week_mkd_v3

CREATE TABLE price_markdown_opt.tb_simulation_week_mkd (
        product_id int4  NOT NULL,
        week_start_date date NOT NULL,
        base_percentage int4 NOT NULL,
        bnm_sales_units float8 NULL,
        bnm_baseline_sales_units float8 NULL,
        bnm_elasticity float8 NULL,
        ecom_sales_units float8 NULL,
        ecom_baseline_sales_units float8 NULL,
        ecom_elasticity float8 NULL,
        CONSTRAINT tb_simulation_week_mkd_pk PRIMARY KEY (product_id, week_start_date, base_percentage)
)
PARTITION BY RANGE (week_start_date);
CREATE INDEX idx_product_basepercentage ON price_markdown_opt.tb_simulation_week_mkd USING btree (product_id, base_percentage);

--changeset siddharth.bajpai@impactanalytics.co:sync_tb_simulation_week_mkd_20251216_v2 stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:tb_simulation_week_mkd
--comment: Sync tb_simulation_week_mkd table structure with dev DB
DROP TABLE IF EXISTS price_markdown_opt.tb_simulation_week_mkd CASCADE;

--changeset siddharth.bajpai@impactanalytics.co:sync_tb_simulation_week_mkd_20251216_v3 stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:tb_simulation_week_mkd
--comment: Sync tb_simulation_week_mkd table structure with dev DB
CREATE TABLE price_markdown_opt.tb_simulation_week_mkd (
    product_id int4 NOT NULL,
    simulation_week_start_date date NOT NULL,
    base_percentage int4 NOT NULL,
    sales_units float8 NOT NULL,
    baseline_sales_units float8 NOT NULL,
    elasticity float8 NOT NULL,
    s0_id int4 NOT NULL,
    s1_id int4 NOT NULL,
    CONSTRAINT tb_simulation_week_mkd_pk PRIMARY KEY (product_id, simulation_week_start_date, base_percentage, s0_id, s1_id)
)
PARTITION BY RANGE (simulation_week_start_date);
CREATE INDEX idx_product_basepercentage ON price_markdown_opt.tb_simulation_week_mkd USING btree (product_id, base_percentage);