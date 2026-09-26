--liquibase formatted sql
--changeset liquibase:tb_product_eligibility stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_product_eligibility

DROP TABLE if exists price_promo.tb_product_eligibility;
CREATE TABLE price_promo.tb_product_eligibility (
	c0_id int4 NULL,
	product_id text NULL
);
CREATE INDEX tb_product_eligibility_idx ON price_promo.tb_product_eligibility USING btree (product_id);