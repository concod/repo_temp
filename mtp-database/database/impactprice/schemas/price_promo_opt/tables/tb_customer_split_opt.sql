--liquibase formatted sql
--changeset liquibase:tb_customer_split_opt stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for price_promo_opt.tb_customer_split_opt

CREATE TABLE IF NOT EXISTS price_promo_opt.tb_customer_split_opt (
	customer_id text NULL,
	simulation_week_start_date date NULL,
	customer_split_ratio float8 NULL
);

--changeset harshith.mandli@impactanalytics.co:add_cust_reo_level_cust_opt stripComments:false splitStatements:false context:Release_1_0 labels: add_cust_reo_level_cust_opt
--comment: Adding cust_reco_level in customer_split_opt

ALTER TABLE price_promo_opt.tb_customer_split_opt
ADD COLUMN IF NOT EXISTS customer_reco_level text NOT NULL;

ALTER TABLE price_promo_opt.tb_customer_split_opt
DROP COLUMN IF EXISTS customer_id;

--changeset vaibhav@impactanalytics.co:add_cust_reo_level_cust_opt stripComments:false splitStatements:false context:Release_1_0 labels: add_cust_reo_level_cust_opt
--comment: Adding cust_reco_level in customer_split_opt

-- tb_customer_split_opt
CREATE INDEX if not exists idx_customer_split_week_customer_new
ON price_promo_opt.tb_customer_split_opt
    (simulation_week_start_date, customer_reco_level);