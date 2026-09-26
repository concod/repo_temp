--liquibase formatted sql
--changeset liquibase:scenario_master stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for scenario_master

CREATE TABLE price_promo.scenario_master (
	event_id int4 NULL,
	promo_id int4 NOT NULL,
	scenario_id bigserial NOT NULL,
	scenario_name varchar NULL,
	discount_level int8 NULL,
	copied_scenario int4 DEFAULT 0 NULL,
	scenario_order_id int2 DEFAULT 1 NOT NULL,
	created_by int4 NOT NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT scenario_master_pkey PRIMARY KEY (promo_id, scenario_id),
	CONSTRAINT scenario_master_scenario_id_uk UNIQUE (scenario_id)
);
CREATE INDEX idx_scenario_master_promo_id ON price_promo.scenario_master USING btree (promo_id);
CREATE INDEX idx_scenario_master_promo_id_scenario_id ON price_promo.scenario_master USING btree (promo_id, scenario_id);
CREATE INDEX idx_scenario_master_scenario_id ON price_promo.scenario_master USING btree (scenario_id);

--changeset liquibase:scenario_master-10040634 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: added updated_at column to scenario_master table
ALTER TABLE price_promo.scenario_master ADD updated_at timestamp NULL;