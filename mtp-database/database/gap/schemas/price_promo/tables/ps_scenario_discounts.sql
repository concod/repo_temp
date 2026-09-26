--liquibase formatted sql
--changeset liquibase:ps_scenario_discounts stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for ps_scenario_discounts
CREATE TABLE price_promo.ps_scenario_discounts (
	id serial4 NOT NULL,
	promo_id int4 NULL,
	scenario_id int4 NULL,
	discount_level_value int8 NULL,
	offer_type_id int4 NULL,
	offer_type varchar(100) NULL,
	offer_x_value float8 NULL,
	offer_x_type varchar(100) NULL,
	offer_y_value float8 NULL,
	offer_y_type varchar(100) NULL,
	offer_z_value float8 NULL,
	offer_z_type varchar(100) NULL,
	tier_id int4 NULL,
	offer_type_combined_display_name varchar(100) NULL,
	created_by int4 NULL,
	created_at timestamptz NULL,
	product_level_id int8 NULL,
	store_level_id int4 NULL,
	customer_level_id int8 NULL,
	scenario_data jsonb NULL,
	ia_recommended_data jsonb NULL,
	CONSTRAINT ps_scenario_discounts_pkey PRIMARY KEY (id),
	CONSTRAINT fk_tier_discounts_scenario_id FOREIGN KEY (scenario_id) REFERENCES price_promo.scenario_master(scenario_id) ON DELETE CASCADE
);
-- Create new indexes
CREATE INDEX ps_scenario_discounts_promo_scenario_idx 
    ON price_promo.ps_scenario_discounts (promo_id, scenario_id);

--changeset narendren.saravanan@impactanalytics.co:ps_scenario_discounts_promo_id_product_level_id_idx stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: Add index on promo_id and product_level_id
CREATE INDEX ps_scenario_discounts_promo_id_product_level_id_idx ON price_promo.ps_scenario_discounts (promo_id, product_level_id);
