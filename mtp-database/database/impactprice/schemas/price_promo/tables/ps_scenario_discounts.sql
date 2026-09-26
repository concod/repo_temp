--liquibase formatted sql
--changeset vamsi.balaga@impactanalytics.co:ps_scenario_discounts_1228 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for ps_scenario_discounts
CREATE TABLE price_promo.ps_scenario_discounts (
		id int4 NOT NULL,
		promo_id int4 NOT NULL,
		created_by int4 NULL,
		created_at timestamptz NULL,
		product_level_id int8 NULL,
		store_level_id int4 NULL,
		customer_level_id int8 NULL,
		scenario_data jsonb NULL,
		ia_recommended_data jsonb NULL,
		CONSTRAINT ps_scenario_discounts_pkey PRIMARY KEY (id, promo_id)
	) PARTITION BY LIST (promo_id);

--changeset vamsi.balaga@impactanalytics.co:ps_scenario_discounts_product_level_id_idx stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: Add index on product_level_id
CREATE INDEX ps_scenario_discounts_product_level_id_idx ON price_promo.ps_scenario_discounts (product_level_id);