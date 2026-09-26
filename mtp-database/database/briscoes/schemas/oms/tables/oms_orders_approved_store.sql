--liquibase formatted sql
--changeset abhimanyu.sheoran@impactanalytics.co:oms_kpi_master_store stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:oms_orders_approved_store
--comment: schema changeset for oms_orders_approved_store

CREATE TABLE IF NOT EXISTS inventory_smart.oms_orders_approved_store (
	id int4 NOT NULL,
	order_gen_type varchar NOT NULL,
	order_id int4 NULL,
	article varchar NOT NULL,
	"size" varchar NULL,
	product_code varchar NOT NULL,
	store_code varchar NOT NULL,
	channel varchar NULL,
	vendor_code varchar NULL,
	rop date NOT NULL,
	grade varchar(50) NULL,
	order_quantity int4 NOT NULL,
	unit_cost float8 NULL,
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
	min_order_quantity_sku int4 NULL,
	min_order_quantity_style int4 NULL,
	pack_size int4 NULL,
	inventory_hold int4 NULL,
	order_status_id int4 DEFAULT 3 NOT NULL,
	created_by int4 NOT NULL,
	created_at timestamptz NOT NULL,
	updated_by int4 NULL,
	updated_at timestamptz NULL,
	edit_by_date date NULL,
	is_deleted bool NULL,
	editable_expected_receipt_date date NULL,
	"comment" text NULL,
	min_order_quantity_shipment int4 NULL,
	max_order_quantity_sku int4 NULL,
	max_order_quantity_style int4 NULL,
	max_order_quantity_shipment int4 NULL,
	reconciliation_id varchar NULL,
	approved_orders_pending_reconciliation int4 NULL
);

--changeset abhimanyu.sheoran@impactanalytics.co:oms_orders_approved_store_col_add stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:oms_orders_approved_store_col_add
--comment: coln add for oms_orders_approved_store
ALTER TABLE inventory_smart.oms_orders_approved_store ADD order_quantity_eaches float4 NULL;

--changeset kanishka.parashar@impactanalytics.co:oms_orders_approved_store_adding_col stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:oms_orders_approved_store_col_add
--comment: coln add order_batch_name
ALTER TABLE inventory_smart.oms_orders_approved_store ADD order_batch_name varchar NULL;

--changeset kailash.kangne@impactanalytics.co:oms_orders_approved_store_adding_col stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:oms_orders_approved_store_col_add
--comment: coln add projected_delivery_date
ALTER TABLE inventory_smart.oms_orders_approved_store ADD projected_delivery_date date NULL;

--changeset kailash.kangne@impactanalytics.co:fiscal_year_week stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:oms_orders_approved_store_col_add2
--comment: coln add fiscal_year_week
ALTER TABLE inventory_smart.oms_orders_approved_store ADD fiscal_year_week int4 NULL;

--changeset kanishka.parashar@impactanalytics.co:oms_orders_approved_store_adding_constraint stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:oms_orders_approved_store_col_add
--comment: adding constraint & index
alter table inventory_smart.oms_orders_approved_store add CONSTRAINT uk_oms_orders_approved_store UNIQUE (product_code, store_code, channel, vendor_code, rop, expected_receipt_date, order_gen_type);
ALTER TABLE inventory_smart.oms_orders_approved_store ADD CONSTRAINT oms_orders_approved_store_id_unique UNIQUE (id);
create index if not exists idx_oms_orders_approved_store ON inventory_smart.oms_orders_approved_store USING btree (product_code, store_code, channel, vendor_code, rop, expected_receipt_date, order_gen_type);
