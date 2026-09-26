--liquibase formatted sql
--changeset liquibase:attribute_master stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for attribute_master

CREATE TABLE price_promo.attribute_master (
	id serial4 NOT NULL,
	"module" varchar NOT NULL,
	is_active bool DEFAULT true NULL,
	fe_identifier varchar NOT NULL,
	fe_order_id int4 NOT NULL,
	fe_display_name varchar NOT NULL,
	fe_component_type varchar NOT NULL,
	fe_placeholder_text varchar NULL,
	fe_is_mandatory bool DEFAULT false NULL,
	fe_extra_config jsonb DEFAULT '{}'::jsonb NULL,
	be_value_type varchar NOT NULL,
	fe_component_group int4 NULL,
	be_is_master_attr bool DEFAULT false NULL,
	be_identifier varchar NULL,
	CONSTRAINT attribute_master_pk PRIMARY KEY (id)
);