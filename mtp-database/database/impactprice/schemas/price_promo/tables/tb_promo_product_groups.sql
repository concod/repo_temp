--liquibase formatted sql
--changeset liquibase:tb_promo_product_groups stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_promo_product_groups
CREATE TABLE price_promo.tb_promo_product_groups (
	promo_id int4 NOT NULL,
	product_group_id int4 NOT NULL,
	product_group_name text NOT NULL,
	CONSTRAINT tb_promo_product_groups_pkey PRIMARY KEY (promo_id, product_group_id)
);
CREATE INDEX tb_promo_product_groups_idx ON price_promo.tb_promo_product_groups USING btree (promo_id);

