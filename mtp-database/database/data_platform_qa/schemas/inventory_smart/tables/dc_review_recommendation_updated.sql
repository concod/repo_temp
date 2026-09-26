--liquibase formatted sql
--changeset liquibase:dc_review_recommendation_updated stripComments:false splitStatements:false context:Release_1_0 labels:MTP-68896
--comment: initial changeset for dc_review_recommendation_updated
CREATE TABLE inventory_smart.dc_review_recommendation_updated (
	article varchar NOT NULL,
	product_code varchar NOT NULL,
	source_dc int4 NOT NULL,
	destination_dc int4 NOT NULL,
	transfer_units int4 NULL,
	created_by int4 NOT NULL,
	created_at timestamptz DEFAULT now(),
	updated_by int4 NULL,
	updated_at timestamptz NULL,
	status_code int4 DEFAULT 1,
	dc_transfer_code uuid NOT NULL,
	CONSTRAINT dc_review_recommendation_updated_unique UNIQUE (product_code, destination_dc, source_dc, dc_transfer_code)
);