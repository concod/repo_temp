--liquibase formatted sql
--changeset raja.duraisamy@impactanalytics.co:GA_Instance_schema_creation_update1 stripComments:false splitStatements:false context:Release_1_0 labels:moving_tables_to_oms
--comment: GA Instance

CREATE TABLE IF NOT EXISTS oms.oms_orders_approved (
	id int8 NOT NULL,
	order_gen_type varchar NOT NULL,
	product_code varchar NOT NULL,
	vendor_code varchar NOT NULL,
	rop date NOT NULL,
	grade varchar NULL,
	order_quantity int4 NOT NULL,
	order_quantity_eaches int4 NOT NULL,
	pack_id varchar NULL,
	unit_cost float8 NOT NULL,
	order_cost float8 NULL,
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
	article varchar(100) NULL,
	"size" varchar(100) NULL,
	"style" varchar(100) NULL,
	channel varchar(100) NULL,
	min_order_quantity_style int4 NULL,
	editable_expected_receipt_date date NULL,
	min_order_quantity_shipment int4 NULL,
	max_order_quantity_sku int4 NULL,
	max_order_quantity_style int4 NULL,
	max_order_quantity_shipment int4 NULL,
	loc_code varchar DEFAULT '-'::character varying NOT NULL,
	order_type varchar(100) NULL,
	reconciliation_id varchar NULL,
	order_batch_name varchar NULL,
	approved_orders_pending_reconciliation int4 NULL,
	CONSTRAINT uk_oms_orders_approved UNIQUE (product_code, vendor_code, channel, loc_code, rop, expected_receipt_date, order_gen_type)
);
CREATE INDEX IF NOT EXISTS idx_oms_ord_approv_ord_status_id ON oms.oms_orders_approved USING btree (order_status_id);
CREATE INDEX IF NOT EXISTS idx_oms_ord_approv_product_code ON oms.oms_orders_approved USING btree (product_code);

--changeset raja.duraisamy@impactanalytics.co:oms_orders_approved_performance_indexes_1 stripComments:false splitStatements:false context:performance_optimization labels:OMS_PERFORMANCE_INDEXES
--comment: Performance indexes for oms_orders_approved based on query analysis
CREATE INDEX IF NOT EXISTS idx_oms_ord_approv_article_loc ON oms.oms_orders_approved(article, loc_code);
CREATE INDEX IF NOT EXISTS idx_oms_ord_approv_order_placement_date ON oms.oms_orders_approved(order_placement_date DESC) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_oms_ord_approv_product_loc_channel ON oms.oms_orders_approved(product_code, loc_code, channel) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_oms_ord_approv_pack_grouping ON oms.oms_orders_approved(article, loc_code, pack_id, order_placement_date, expected_receipt_date);




--changeset kailash.kangne@impactanalytics.co:set_all_count stripComments:false splitStatements:false context:Release_1_1 labels:MTP-127541
--comment: added 2 column
ALTER TABLE oms.oms_orders_approved ADD if not exists fiscal_year_week int4 NULL;
ALTER TABLE oms.oms_orders_approved ADD if not exists fiscal_year_month int4 NULL;


--changeset raja.duraisamy@impactanalytics.co:oms_orders_approved_add_missing_columns stripComments:false splitStatements:false context:generic_schema_update labels:GENERIC_SCHEMA_UPDATE
--comment: Add missing generic schema columns to oms_orders_approved
ALTER TABLE oms.oms_orders_approved ADD COLUMN IF NOT EXISTS mode_shipment varchar(256) NULL;
ALTER TABLE oms.oms_orders_approved ADD COLUMN IF NOT EXISTS order_id int4 NULL;
ALTER TABLE oms.oms_orders_approved ADD COLUMN IF NOT EXISTS order_reason varchar(256) NULL;
ALTER TABLE oms.oms_orders_approved ADD COLUMN IF NOT EXISTS pack_size int4 NULL;
ALTER TABLE oms.oms_orders_approved ADD COLUMN IF NOT EXISTS raw_roq int4 NULL;

--changeset raja.duraisamy@impactanalytics.co:index_oms_orders_approved_drop_indexes stripComments:false splitStatements:false context:generic_schema_update labels:GENERIC_SCHEMA_UPDATE
--comment: Index for oms_orders_approved
DROP INDEX IF EXISTS oms.idx_oms_ord_approv_ord_status_id;
DROP INDEX IF EXISTS oms.idx_oms_ord_approv_product_code;
DROP INDEX IF EXISTS oms.idx_oms_ord_approv_product_loc_channel;
DROP INDEX IF EXISTS oms.idx_oms_ord_approv_article_loc;
DROP INDEX IF EXISTS oms.idx_oms_ord_approv_order_placement_date;
DROP INDEX IF EXISTS oms.idx_oms_ord_approv_pack_grouping;
