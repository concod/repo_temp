--liquibase formatted sql
--changeset sriraj.varanasi@impactanalytics.co:tb_halo_effect_department_factor_opt  stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_halo_effect_department_factor_opt


CREATE TABLE IF NOT EXISTS price_promo_opt.tb_halo_effect_department_factor_opt (
  product_id int4 NULL,
  sub_dept varchar(50) NULL,
  simulation_week_start_date date NULL,
  multiplier numeric NULL
);


--changeset sriraj.varanasi@impactanalytics.co:adding_primary_key splitStatements:false context:added_new_constrait ignore:false labels:adding_primary_key
--comment: adding_primary_key_tb_halo_effect_department_factor_opt
ALTER TABLE price_promo_opt.tb_halo_effect_department_factor_opt
ADD CONSTRAINT tb_halo_effect_department_factor_opt_pkey PRIMARY KEY (product_id, sub_dept);



--changeset sriraj.varanasi@impactanalytics.co:drop_and_add_columns splitStatements:false context:added_new_constrait ignore:false labels:drop_and_add_columns
--comment: drop_and_add_columns

ALTER TABLE price_promo_opt.tb_halo_effect_department_factor_opt
DROP COLUMN IF EXISTS simulation_week_start_date,
ADD COLUMN IF NOT EXISTS max_value FLOAT NULL,
ADD COLUMN IF NOT EXISTS min_value FLOAT NULL;