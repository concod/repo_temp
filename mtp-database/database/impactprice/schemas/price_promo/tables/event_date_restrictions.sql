--liquibase formatted sql
--changeset liquibase:event_date_restrictions stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for event_date_restrictions
CREATE TABLE price_promo.event_date_restrictions (
	event_id int4 NOT NULL,
	min_promo_duration int4 NULL,
	max_promo_duration int4 NULL,
	promo_start_date date NULL,
	promo_end_date date NULL,
	use_same_as_event bool NULL,
	CONSTRAINT event_date_restrictions_pk PRIMARY KEY (event_id)
);