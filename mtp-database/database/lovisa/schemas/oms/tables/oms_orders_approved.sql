--liquibase formatted sql
--changeset liquibase:raja.duraisamy:oms_orders_approved_updated2 stripComments:false splitStatements:false context:Release_1_0 labels:MTP-91512
--comment: initial changeset for oms_orders_approved_updated

CREATE TABLE IF NOT EXISTS inventory_smart.oms_orders_approved (
	id int8 NOT NULL,
	order_gen_type varchar NOT NULL,
	product_code varchar NOT NULL,
	vendor_code varchar NULL,
	rop date NOT NULL,
	grade varchar NULL,
	order_quantity int4 NOT NULL,
	unit_cost float8 NULL,
	order_cost float8 NULL,
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
	order_id int4 NULL,
	loc_code varchar(50) NULL,
	channel varchar(50) NULL,
	"size" varchar(50) NULL,
	article varchar(50) NULL,
	min_order_quantity_style int4 NULL,
	pack_size int4 NULL,
	editable_expected_receipt_date date NULL,
	min_order_quantity_shipment int4 NULL,
	max_order_quantity_style int4 NULL,
	max_order_quantity_shipment int4 NULL,
	max_order_quantity_sku int4 NULL,
	CONSTRAINT uk_oms_orders_approved UNIQUE (product_code, order_placement_date, order_placement_recom_date, expected_receipt_date, order_gen_type)
);


--changeset liquibase:raja.duraisamy:oms_orders_approved_cons_add_test stripComments:false splitStatements:false context:initial_release labels:cons_add_test
--comment: cons_add_test for oms_orders_approved
ALTER TABLE inventory_smart.oms_orders_approved 
DROP CONSTRAINT IF EXISTS uk_oms_orders_approved;

ALTER TABLE inventory_smart.oms_orders_approved 
ADD CONSTRAINT uk_oms_orders_approved 
UNIQUE (product_code, loc_code, channel, vendor_code, rop, expected_receipt_date, order_gen_type);

--changeset chandra.ghosh:adding_columns_for_order_reason stripComments:false splitStatements:false context:Release_1_0 labels:VS-377
--comment: added_columns_for_order_reason
ALTER TABLE inventory_smart.oms_orders_approved
ADD COLUMN order_reason VARCHAR(255);

--changeset nikhil.madhusudan@impactanalytics.co:oms_orders_approved_updated3 stripComments:false splitStatements:false context:MTP-80452 labels:created_new_table_update3
--comment: Added reconciliation_id column in OOA table for victorias secret
ALTER TABLE inventory_smart.oms_orders_approved ADD COLUMN IF NOT EXISTS reconciliation_id varchar NULL;

--changeset vishal.kumar@impactanalytics.co:oms_orders_approved_update_5 stripComments:false splitStatements:false context:MTP-91512 labels:approved_orders_pending_reconciliation
--comment: Added approved_orders_pending_reconciliation column in OOA table for victorias secret
ALTER TABLE inventory_smart.oms_orders_approved ADD COLUMN IF NOT EXISTS approved_orders_pending_reconciliation int4 DEFAULT NULL;

--changeset nikhil.madhusudan@impactanalytics.co:oms_orders_approved_updated_6 stripComments:false splitStatements:false context:MTP-80452 labels:order_batch_name
--comment: Added order_batch_name column in OOA table for victorias secret
ALTER TABLE inventory_smart.oms_orders_approved ADD COLUMN IF NOT EXISTS order_batch_name varchar NULL;

--changeset nikhil.madhusudan@impactanalytics.co:oms_orders_approved_updated_7 stripComments:false splitStatements:false context:Release_1_0 labels:order_type
--comment: Added order_type column in OOA table for lovisa
ALTER TABLE inventory_smart.oms_orders_approved ADD COLUMN IF NOT EXISTS order_type varchar(255) NULL;