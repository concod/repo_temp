--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:tier_master  stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: Initial changeset for creating the price_promo.tier_master table

CREATE TABLE price_promo.tier_master (
	promo_id int4 NOT NULL,
	tier_id serial4 NOT NULL,
	tier_name text NOT NULL,
	offer_type_id int4 NOT NULL,
	offer_type varchar(255) NOT NULL,
	sub_tier_count int4 DEFAULT 0 NULL,
	CONSTRAINT tier_master_pkey PRIMARY KEY (tier_id),
	CONSTRAINT fk_tier_master_promo_id FOREIGN KEY (promo_id) REFERENCES price_promo.promo_master(promo_id) ON DELETE CASCADE
);
CREATE INDEX idx_tier_master_tier_id ON price_promo.tier_master USING btree (tier_id);