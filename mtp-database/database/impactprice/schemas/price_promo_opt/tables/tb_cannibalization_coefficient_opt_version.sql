--liquibase formatted sql
--changeset sriraj.varanasi@impactanalytics.co:tb_cannibalization_coefficient_opt_version  stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_cannibalization_coefficient_opt_version


CREATE TABLE IF NOT EXISTS price_promo_opt.tb_cannibalization_coefficient_opt_version (
    victim_brand TEXT NULL,
    cannibalizer_brand TEXT NULL,
    simulation_week_start_date DATE NULL,
    multiplier NUMERIC NULL,
    version_code INT NOT NULL
)
PARTITION BY LIST (version_code);

CREATE INDEX idx_cannibalization_version
    ON price_promo_opt.tb_cannibalization_coefficient_opt_version (victim_brand, cannibalizer_brand);


    
--changeset sriraj.varanasi@impactanalytics.co:drop_and_add_columns splitStatements:false context:added_new_constrait ignore:false labels:drop_and_add_columns
--comment: drop_and_add_columns

ALTER TABLE price_promo_opt.tb_cannibalization_coefficient_opt_version
DROP COLUMN IF EXISTS simulation_week_start_date,
ADD COLUMN IF NOT EXISTS max_value FLOAT NULL,
ADD COLUMN IF NOT EXISTS min_value FLOAT NULL;

