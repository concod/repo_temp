--liquibase formatted sql
--changeset liquibase:promo_status_review_config stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for promo_status_review_config

CREATE TABLE price_promo.promo_status_review_config (
	id int4 NOT NULL,
	review_status text NULL,
	display_order int4 NOT NULL,
	CONSTRAINT chk_review_status_nonnull_when_id_gt0 CHECK (((id = 0) OR (review_status IS NOT NULL))),
	CONSTRAINT promo_status_review_config_pkey PRIMARY KEY (id)
);