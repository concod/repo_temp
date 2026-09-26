--liquibase formatted sql
--changeset liquibase:event_status_config stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for event_status_config

CREATE TABLE price_promo.event_status_config (
	status_id int4 NOT NULL,
	status_name price_promo."event_status_name_enum" NULL,
	display_order int2 NULL,
	CONSTRAINT event_status_config_pkey PRIMARY KEY (status_id),
	CONSTRAINT event_status_config_ukey UNIQUE (status_name)
);