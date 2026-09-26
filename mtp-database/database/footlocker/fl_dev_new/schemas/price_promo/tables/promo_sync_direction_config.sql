--liquibase formatted sql
--changeset shrrayan.sheel@impactanalytics.co:promo_sync_direction_config stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: Initial changeset for price_promo.promo_sync_direction_config

CREATE TABLE price_promo.promo_sync_direction_config (
	sync_direction_id int4 NOT NULL,
	sync_direction price_promo."promo_sync_direction_enum" NULL,
	display_order int2 NULL,
	CONSTRAINT promo_sync_direction_config_pkey PRIMARY KEY (sync_direction_id),
	CONSTRAINT promo_sync_direction_config_ukey UNIQUE (sync_direction_id, sync_direction)
);