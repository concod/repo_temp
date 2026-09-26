--liquibase formatted sql
--changeset mssprakash.yashwanth@impactanalytics.co:oms_orders_approved_update2 stripComments:false splitStatements:false context:MTP-135352 labels:MTP-135352
--comment: implementing soft delete for oms_orders_approved table

CREATE TABLE IF NOT EXISTS inventory_smart.oms_orders_approved (
	id int8 NOT NULL,
	order_gen_type varchar NOT NULL,
	product_code varchar NOT NULL,
	vendor_code varchar NOT NULL,
	rop date NOT NULL,
	grade varchar NULL,
	order_quantity int4 NOT NULL,
	unit_cost float8 NOT NULL,
	order_cost float8 NOT NULL,
	roq_constrained int4 NULL,
	roq_unconstrained int4 NULL,
	order_placement_date date NOT NULL,
	order_placement_recom_date date NOT NULL,
	expected_receipt_date date NULL,
	rop_ideal date NULL,
	lead_time int4 NULL,
	effective_lead_time int4 NULL,
	store_inv int4 NULL,
	dc_inv int4 NULL,
	system_inv int4 NULL,
	mrpc float4 NULL,
	min_order_quantity_sku int4 NULL,
	max_order_quantity int4 NULL,
	order_multiple int4 NULL,
	inventory_hold int4 NULL,
	order_status_id int8 DEFAULT 3 NOT NULL,
	created_by int4 NOT NULL,
	created_at timestamptz NOT NULL,
	updated_by int4 NULL,
	updated_at timestamptz NULL,
	edit_by_date date NULL,
	is_deleted bool NULL,
	"comment" text NULL,
	article varchar(50) NULL,
	"size" varchar(50) NULL,
	"style" varchar(50) NULL,
	channel varchar(50) NULL,
	min_order_quantity_style int4 NULL,
	editable_expected_receipt_date date NULL,
	min_order_quantity_shipment int4 NULL,
	max_order_quantity_sku int4 NULL,
	max_order_quantity_style int4 NULL,
	max_order_quantity_shipment int4 NULL,
	loc_code varchar DEFAULT '-'::character varying NOT NULL,
	CONSTRAINT uk_oms_orders_approved UNIQUE (product_code, vendor_code, channel, loc_code, rop, expected_receipt_date, order_gen_type)
);
DROP INDEX IF EXISTS inventory_smart.idx_oms_ord_approv_ord_status_id;
DROP INDEX IF EXISTS inventory_smart.idx_oms_ord_approv_product_code;
CREATE INDEX idx_oms_ord_approv_ord_status_id ON inventory_smart.oms_orders_approved USING btree (order_status_id);
CREATE INDEX idx_oms_ord_approv_product_code ON inventory_smart.oms_orders_approved USING btree (product_code);

--changeset chaitanyaprasad.reddy@imapctanalytiics.co:oms_orders_approved_update_3 stripComments:false splitStatements:false context:MTP-57372 labels:created_new_table_update_3
--comment: Added order type column in OOA table for carters
ALTER TABLE inventory_smart.oms_orders_approved ADD COLUMN IF NOT EXISTS order_type varchar(50) NULL;

--changeset nikhil.madhusudan@impactanalytics.co:oms_orders_approved_update_4 stripComments:false splitStatements:false context:MTP-80452 labels:created_new_table_update_4
--comment: Added reconciliation_id column in OOA table for carters
ALTER TABLE inventory_smart.oms_orders_approved ADD COLUMN IF NOT EXISTS reconciliation_id varchar NULL;

--changeset vishal.kumar@impactanalytics.co:oms_orders_approved_update_5 stripComments:false splitStatements:false context:MTP-91512 labels:approved_orders_pending_reconciliation
--comment: Added approved_orders_pending_reconciliation column in OOA table for carters
ALTER TABLE inventory_smart.oms_orders_approved ADD COLUMN IF NOT EXISTS approved_orders_pending_reconciliation INT4 DEFAULT NULL;

--changeset nikhil.madhusudan@impactanalytics.co:oms_orders_approved_update_6 stripComments:false splitStatements:false context:MTP-80452 labels:created_new_table_update_4
--comment: Added order_batch_name column in OOA table for carters
ALTER TABLE inventory_smart.oms_orders_approved ADD COLUMN IF NOT EXISTS order_batch_name varchar NULL;

--changeset sairaghunath.k@imapctanalytiics.co:oms_orders_approved_update2 stripComments:false splitStatements:false context:MTP-104175 labels:adding_raw_roq_column
--comment: Adding a new raw_roq column
ALTER TABLE inventory_smart.oms_orders_approved ADD COLUMN IF NOT EXISTS raw_roq INT4 DEFAULT NULL;

--changeset prakash.yashwanth@impactanalytics.co:oms_orders_approved_soft_delete_update stripComments:false splitStatements:false context:MTP-133363 labels:soft_delete_implementation
--comment: Set default value for is_deleted column and create performance index for soft delete implementation

-- Set default for is_deleted column
ALTER TABLE inventory_smart.oms_orders_approved 
ALTER COLUMN is_deleted SET DEFAULT FALSE;