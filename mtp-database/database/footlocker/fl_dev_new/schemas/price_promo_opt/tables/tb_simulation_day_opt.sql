--liquibase formatted sql
--changeset sriraj.varanasi@impactanalytics.co:tb_simulation_day_opt_2  stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_simulation_day_opt

DROP TABLE IF EXISTS price_promo_opt.tb_simulation_day_opt CASCADE;

CREATE TABLE price_promo_opt.tb_simulation_day_opt (
	product_id int4 NOT NULL,
	simulation_week_start_date date NOT NULL,
	"date" date NOT NULL,
	base_percentage int4 NULL,
	sales_units float8 NULL,
	baseline_sales_units float8 NULL,
	elasticity float8 NULL,
	store_split_level varchar NULL,
	day_split_ratio float8 NULL,
	end_cap_hierarchy_level varchar NULL,
	end_cap_multiplier float8 NULL,
	reg_price_multiplier float8 NULL
)
PARTITION BY RANGE (date);
CREATE INDEX idx_product_base_percentag_1 ON price_promo_opt.tb_simulation_day_opt USING btree (product_id, base_percentage);


--changeset sriraj.varanasi@impactanalytics.co:adding_primary_key splitStatements:false context:added_new_constrait ignore:false labels:adding_primary_key
--comment: adding_primary_key_tb_simulation_day_opt

ALTER TABLE price_promo_opt.tb_simulation_day_opt
ADD CONSTRAINT tb_simulation_day_opt_pk PRIMARY KEY (product_id, "date", base_percentage);


--changeset sriraj.varanasi@impactanalytics.co:changing_column_mode splitStatements:false context:added_new_constrait ignore:false labels:changing_column_mode
--comment: changing_column_mode

ALTER TABLE price_promo_opt.tb_simulation_day_opt
ALTER COLUMN simulation_week_start_date DROP NOT NULL;