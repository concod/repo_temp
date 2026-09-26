--liquibase formatted sql
--changeset vishal.kumar@imapctanalytiics.co:oms_orders_approved stripComments:false splitStatements:false context:MTP-34715_1labels:Added comment column
--comment: Added Comment column
CREATE TABLE if not exists inventory_smart.oms_orders_approved (
	id int8 NOT NULL,
	order_gen_type varchar NOT NULL,
	product_code varchar NOT NULL,
	loc_code varchar NOT NULL,
	vendor_code varchar NOT NULL,
	rop date NOT NULL,
	grade varchar NOT NULL,
	order_quantity int4 NOT NULL,
	unit_cost float8 NOT NULL,
	roq_constrained int4 NULL,
	roq_unconstrained int4 NULL,
	order_placement_date date NOT NULL,
	order_placement_recom_date date NULL,
	expected_receipt_date date NULL,
	rop_ideal date NULL,
	lead_time int4 NULL,
	effective_lead_time int4 NULL,
	store_inv int4 NULL,
	dc_inv int4 NULL,
	system_inv int4 NULL,
	mrpc float4 NULL,
	min_order_quantity int4 NULL,
	max_order_quantity int4 NULL,
	pack_size int4 NULL,
	inventory_hold int4 NULL,
	order_status_id int8 NOT NULL DEFAULT 3,
	created_by int4 NOT NULL,
	created_at timestamptz NOT NULL,
	updated_by int4 NULL,
	updated_at timestamptz NULL,
	edit_by_date date NULL,
	is_deleted bool NULL,
	not_before_date date NULL,
	not_after_date date NULL,
	CONSTRAINT pk_oms_orders_approved PRIMARY KEY (id, order_placement_date),
	CONSTRAINT uk_oms_orders_approved UNIQUE (product_code, loc_code, vendor_code, order_placement_date, not_before_date, not_after_date)
);
CREATE INDEX if not exists idx_oms_ord_approv_ord_status_id ON inventory_smart.oms_orders_approved USING btree (order_status_id);
CREATE INDEX if not exists idx_oms_ord_approv_product_code ON inventory_smart.oms_orders_approved USING btree (product_code);
CREATE INDEX if not exists idx_oms_ord_approv_product_loc_code ON inventory_smart.oms_orders_approved USING btree (product_code, loc_code);


--changeset aman.pareek@impactanalytics.co:set_all_count stripComments:false splitStatements:false context:Release_1_1 labels:MTP-34715
--comment: added comment column
ALTER TABLE inventory_smart.oms_orders_approved ADD if not exists comment text NULL;