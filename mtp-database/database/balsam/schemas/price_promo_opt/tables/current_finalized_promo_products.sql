--liquibase formatted sql
--changeset liquibase:current_finalized_promo_products stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for current_finalized_promo_products

CREATE TABLE price_promo_opt.current_finalized_promo_products (
	promo_id int4 NULL,
	product_id int4 NULL,
	recommendation_date date NULL
);
CREATE INDEX current_final_agg_promo_id_idx ON price_promo_opt.current_finalized_promo_products USING btree (promo_id);
CREATE INDEX current_final_agg_product_id_idx ON price_promo_opt.current_finalized_promo_products USING btree (product_id);

--changeset liquibase:current_finalized_promo_products_v2 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for current_finalized_promo_products

ALTER TABLE price_promo_opt.current_finalized_promo_products
ADD COLUMN s0_id int4 NULL
;
ALTER TABLE price_promo_opt.current_finalized_promo_products
ADD COLUMN s1_id int4 NULL
;
CREATE INDEX current_final_agg_promo_product_channel_idx ON price_promo_opt.current_finalized_promo_products USING btree (promo_id, product_id, s0_id, s1_id);



--changeset liquibase:current_finalized_promo_products_v3 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for current_finalized_promo_products

ALTER TABLE price_promo_opt.current_finalized_promo_products
ADD COLUMN store_id int4 DEFAULT 1,
ADD COLUMN store_hierarchy int4 DEFAULT 11;

--changeset liquibase:current_finalized_promo_products_v4 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for current_finalized_promo_products

ALTER TABLE price_promo_opt.current_finalized_promo_products
ALTER COLUMN store_hierarchy TYPE varchar
USING store_hierarchy::varchar;
