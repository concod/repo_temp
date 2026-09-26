--liquibase formatted sql
--changeset sriraj.varanasi@impactanalytics.co:tb_pullforward_coefficient_opt_version  stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_pullforward_coefficient_opt_version


CREATE TABLE IF NOT EXISTS price_promo_opt.tb_pullforward_coefficient_opt_version (
    product_id INT4 NULL,
    simulation_week_start_date DATE NULL,
    lag_week_number INT4 NULL,
    multiplier NUMERIC(5, 2) NULL,
    version_code INT NOT NULL
)
PARTITION BY LIST (version_code);

CREATE INDEX idx_pullforward_version
    ON price_promo_opt.tb_pullforward_coefficient_opt_version (product_id, lag_week_number);


--changeset sriraj.varanasi@impactanalytics.co:drop_and_add_columns splitStatements:false context:added_new_constrait ignore:false labels:drop_and_add_columns
--comment: drop_and_add_columns

ALTER TABLE price_promo_opt.tb_pullforward_coefficient_opt_version
DROP COLUMN IF EXISTS simulation_week_start_date;


--changeset sriraj.varanasi@impactanalytics.co:alter_multiplier_to_numeric splitStatements:false context:alter_multiplier_column labels:alter_multiplier_column
--comment: alter_multiplier_column

ALTER TABLE price_promo_opt.tb_pullforward_coefficient_opt
ALTER COLUMN multiplier TYPE NUMERIC;


--changeset sriraj.varanasi@impactanalytics.co_1:alter_multiplier_to_numeric_1 splitStatements:false context:alter_multiplier_column_1 labels:alter_multiplier_column_1
--comment: alter_multiplier_column_1

ALTER TABLE price_promo_opt.tb_pullforward_coefficient_opt_version
ALTER COLUMN multiplier TYPE NUMERIC;