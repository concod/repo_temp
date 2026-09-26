--liquibase formatted sql
--changeset liquibase:current_finished_promo_products stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for current_finished_promo_products

CREATE TABLE price_promo_opt.current_finished_promo_products (
	promo_id int4 NULL,
	product_id int4 NULL,
	start_date date NULL,
	end_date date NULL
);
CREATE INDEX current_finish_agg_promo_id_idx ON price_promo_opt.current_finished_promo_products USING btree (promo_id);
CREATE INDEX current_finish_agg_product_id_idx ON price_promo_opt.current_finished_promo_products USING btree (product_id);
