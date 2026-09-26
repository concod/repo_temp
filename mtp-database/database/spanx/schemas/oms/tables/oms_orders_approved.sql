--liquibase formatted sql
--changeset vishal.kumar:liquibase:oms_orders_approved_add_1 stripComments:false splitStatements:false context:initial_release labels:liquibase_project_start_ooa MTP-132643
--comment: initial changeset for oms_orders_approved_add

CREATE TABLE IF NOT EXISTS inventory_smart.oms_orders_approved (
	id int8 NULL,
	order_gen_type varchar(50) NULL,
	order_id int4 NULL,
	article varchar(50) NULL,
	"size" varchar(50) NULL,
	product_code varchar(50) NULL,
	loc_code varchar(50) NULL,
	channel varchar(50) NULL,
	vendor_code varchar(50) NULL,
	rop varchar(50) NULL,
	grade varchar(50) NULL,
	order_quantity int4 NULL,
	unit_cost float8 NULL,
	roq_constrained int4 NULL,
	roq_unconstrained int4 NULL,
	order_placement_date date NULL,
	order_placement_recom_date date NULL,
	expected_receipt_date date NULL,
	rop_ideal date NULL,
	lead_time int4 NULL,
	effective_lead_time int4 NULL,
	store_inv int4 NULL,
	dc_inv int4 NULL,
	system_inv int4 NULL,
	mrpc float4 NULL,
	min_order_quantity_sku int4 NULL,
	min_order_quantity_style int4 NULL,
	pack_size int4 NULL,
	inventory_hold int4 NULL,
	order_status_id int8 NULL,
	created_by varchar(50) NULL,
	created_at timestamptz NULL,
	updated_by varchar(50) NULL,
	updated_at timestamptz NULL,
	edit_by_date varchar(50) NULL,
	is_deleted bool NULL,
	editable_expected_receipt_date date NULL,
	"comment" text NULL,
	min_order_quantity_shipment int4 NULL,
	max_order_quantity_sku int4 NULL,
	max_order_quantity_style int4 NULL,
	max_order_quantity_shipment int4 NULL,
	reconciliation_id varchar NULL,
	approved_orders_pending_reconciliation int4 NULL,
	order_batch_name varchar NULL,
	CONSTRAINT uk_oms_orders_approved UNIQUE (product_code, loc_code, channel, vendor_code, rop, expected_receipt_date, order_gen_type)
);

--changeset vishal.kumar@impactanalytics.co:oms_orders_approved_order_type_spanx_1 stripComments:false splitStatements:false context:Release_1_0 labels:order_type
--comment: Added order_type column in OOA table for spanx
ALTER TABLE inventory_smart.oms_orders_approved ADD COLUMN IF NOT EXISTS order_type varchar(255) NULL;
