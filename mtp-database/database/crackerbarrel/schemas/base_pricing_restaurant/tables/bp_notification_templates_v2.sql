--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_notification_templates_v2 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing_restaurant.bp_notification_templates_v2

CREATE TABLE base_pricing_restaurant.bp_notification_templates_v2 (
	id bigserial NOT NULL,
	noe_code int4 NOT NULL,
	"name" varchar(255) NOT NULL,
	subject_template text NOT NULL,
	description_template text NOT NULL,
	url_template text NULL,
	classification varchar(50) NOT NULL,
	priority varchar(20) DEFAULT 'normal'::character varying NULL,
	is_active bool DEFAULT true NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT bp_notification_templates_v2_noe_code_key UNIQUE (noe_code),
	CONSTRAINT bp_notification_templates_v2_pkey PRIMARY KEY (id)
);
CREATE INDEX idx_bp_notification_templates_v2_is_active ON base_pricing_restaurant.bp_notification_templates_v2 USING btree (is_active);
CREATE INDEX idx_bp_notification_templates_v2_noe_code ON base_pricing_restaurant.bp_notification_templates_v2 USING btree (noe_code);