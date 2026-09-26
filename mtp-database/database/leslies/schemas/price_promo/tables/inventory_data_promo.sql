--liquibase formatted sql
--changeset liquibase:inventory_data_promo stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for inventory_data_promo

CREATE TABLE price_promo.inventory_data_promo (
	date_id date NOT NULL,
	parent_id int8 NOT NULL,
	product_id int8 NOT NULL,
	s0_id int8 NOT NULL,
	s1_id int8 NOT NULL,
	channel varchar NOT NULL,
	on_hand_qty int8 DEFAULT 0 NULL,
	in_transit_qty int8 DEFAULT 0 NULL,
	oo_qty int8 DEFAULT 0 NULL,
	vendor_oo_qty int8 DEFAULT 0 NULL,
	total_qty int8 DEFAULT 0 NULL
)
PARTITION BY RANGE (date_id);
CREATE INDEX inventory_data_promo_alt_idx ON price_promo.inventory_data_promo USING btree (product_id);
CREATE INDEX inventory_data_promo_join_idx ON price_promo.inventory_data_promo USING btree (product_id, s0_id, s1_id);
