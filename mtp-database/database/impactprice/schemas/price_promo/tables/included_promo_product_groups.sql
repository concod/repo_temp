--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:included_promo_product_groups  stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for included_promo_product_groups

CREATE TABLE price_promo.included_promo_product_groups (
	promo_id int4 NOT NULL,
	product_group_id int4 NOT NULL,
	product_group_name text NOT NULL,
	CONSTRAINT included_promo_product_groups_pkey PRIMARY KEY (promo_id, product_group_id)
);
CREATE INDEX included_promo_product_groups_idx ON price_promo.included_promo_product_groups USING btree (promo_id);