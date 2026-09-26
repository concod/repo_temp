--liquibase formatted sql
--changeset liquibase:inventory_oh_latest_promo stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for inventory_oh_latest_promo

CREATE TABLE price_promo.inventory_oh_latest_promo (
	s0_id int8 NOT NULL,
	s1_id int8 NOT NULL,
	store_id int8 NOT NULL,
	product_id int8 NOT NULL,
	date_id date NOT NULL,
	on_hand_qty int8 DEFAULT 0 NULL,
	in_transit_qty int8 DEFAULT 0 NULL,
	oo_qty int8 DEFAULT 0 NULL,
	vendor_oo_qty int8 DEFAULT 0 NULL,
	total_qty int8 DEFAULT 0 NULL,
	store_ratio float8 NULL
)
PARTITION BY RANGE (date_id);
CREATE INDEX inventory_oh_latest_promo_content_idx ON price_promo.inventory_oh_latest_promo USING btree (product_id, store_id);
CREATE INDEX inventory_oh_latest_promo_product_idx ON price_promo.inventory_oh_latest_promo USING btree (product_id);
CREATE INDEX inventory_oh_latest_promo_store_idx ON price_promo.inventory_oh_latest_promo USING btree (store_id);
