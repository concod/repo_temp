--liquibase formatted sql
--changeset liquibase:current_finalized_promo_products_div stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for current_finalized_promo_products

CREATE TABLE price_promo_opt.current_finalized_promo_products (
	promo_id int4 NULL,
	product_id int4 NULL,
	recommendation_date date NULL,
	s0_id int4 NULL,
	customer_reco_level varchar DEFAULT '0'::character varying NULL,
	store_id int4 DEFAULT 1 NULL,
	store_reco_level varchar DEFAULT '11'::character varying NULL
);
CREATE INDEX current_final_agg_product_id_idx ON price_promo_opt.current_finalized_promo_products USING btree (product_id);
CREATE INDEX current_final_agg_promo_id_idx ON price_promo_opt.current_finalized_promo_products USING btree (promo_id);
CREATE INDEX current_final_agg_promo_product_channel_idx ON price_promo_opt.current_finalized_promo_products USING btree (promo_id, product_id, s0_id, customer_reco_level);