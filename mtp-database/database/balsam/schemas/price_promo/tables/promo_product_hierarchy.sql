--liquibase formatted sql
--changeset liquibase:promo_product_hierarchy_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for promo_product_hierarchy - added index

CREATE TABLE price_promo.promo_product_hierarchy (
	promo_id int4 NOT NULL,
	hierarchy_id int8 NULL
);
CREATE INDEX idx_promo_product_hierarchy_hierarchy_id_promo_id ON price_promo.promo_product_hierarchy USING btree (hierarchy_id, promo_id);
CREATE INDEX promo_product_hierarchy_hierarchy_id_idx ON price_promo.promo_product_hierarchy USING btree (hierarchy_id);
CREATE INDEX promo_product_hierarchy_promo_id_idx ON price_promo.promo_product_hierarchy USING btree (promo_id);