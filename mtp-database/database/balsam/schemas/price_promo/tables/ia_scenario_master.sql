--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:ia_scenario_master  stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: Initial changeset for creating the price_promo.ia_scenario_master table


CREATE TABLE price_promo.ia_scenario_master (
	event_id int4 NULL,
	promo_id int4 NULL,
	scenario_id bigserial NOT NULL,
	scenario_name varchar NULL,
	discount_level int8 NULL,
	copied_scenario int4 DEFAULT 0 NULL,
	scenario_order_id int2 DEFAULT 1 NOT NULL,
	created_by int4 NOT NULL,
	created_at timestamptz NOT NULL,
	CONSTRAINT ia_scenario_master_pkey PRIMARY KEY (scenario_id),
	CONSTRAINT ia_scenario_master_un UNIQUE (promo_id, scenario_id)
);

CREATE INDEX promo_scenario_id_idx_iasm 
	ON price_promo.ia_scenario_master USING btree (promo_id, scenario_id);

