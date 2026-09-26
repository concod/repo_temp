--liquibase formatted sql
--changeset liquibase:bxgy_percentage stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for bxgy_percentage

CREATE TABLE price_promo.bxgy_percentage (
	offer_type price_promo."offer_type_enum" NOT NULL,
	offer_value price_promo."offer_value_enum" NOT NULL,
	percentage float8 NULL,
	discount_filter float8 NULL,
	CONSTRAINT bxgy_percentage_pkey PRIMARY KEY (offer_type, offer_value)
);
CREATE INDEX idx_bxgy_percentage_discount_filter ON price_promo.bxgy_percentage USING btree (discount_filter);
CREATE INDEX idx_bxgy_percentage_offer_type ON price_promo.bxgy_percentage USING btree (offer_type);
CREATE INDEX idx_bxgy_percentage_offer_value ON price_promo.bxgy_percentage USING btree (offer_value);
