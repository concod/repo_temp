--liquibase formatted sql
--changeset sreevathsa.sp:tb_simulation_week_opt_version_20251229 stripComments:false splitStatements:false context:Release_1_0 labels:price_promo_opt
--comment: Create tb_simulation_week_opt_version table for storing simulation week optimization data
--rollback: select 1;

CREATE TABLE price_promo_opt.tb_simulation_week_opt_version (
    product_id int4 NOT NULL,
    simulation_week_start_date date NOT NULL,
    base_percentage int4 NOT NULL,
    sales_units float8 NULL,
    baseline_sales_units float8 NULL,
    elasticity float8 NULL,
    s0_id int4 NOT NULL,
    s1_id int4 NOT NULL,
    version_code int4 NOT NULL,
    CONSTRAINT tb_simulation_week_opt_version_pk PRIMARY KEY (version_code, product_id, simulation_week_start_date, base_percentage, s0_id, s1_id)
)
PARTITION BY LIST (version_code);