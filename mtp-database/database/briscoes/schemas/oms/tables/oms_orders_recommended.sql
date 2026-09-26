--liquibase formatted sql
--changeset samarjit.mazumder@impactanalytics.co.co:oms_orders_recommended_1 stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:briscoes_oms_orders_recommended
--comment: initial changeset for oms_orders_recommended_1
CREATE SEQUENCE IF NOT EXISTS inventory_smart.oms_orders_recommended_new_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;

CREATE TABLE IF NOT EXISTS inventory_smart.oms_orders_recommended (
	order_group_id varchar(32) NULL,
	order_batch_name varchar NULL,
	order_gen_type varchar(50) NOT NULL,
	product_code varchar(50) NOT NULL,
	"style" varchar(256) NULL,
	"size" varchar(50) NULL,
	loc_code varchar(50) NOT NULL,
	channel varchar(50) NOT NULL,
	article varchar(50) NULL,
	vendor_code varchar NOT NULL,
	vendor_name varchar(50) NULL,
	rop date NOT NULL,
	grade varchar(50) NULL,
	order_quantity int4 NULL,
	order_cost float8 NULL,
	unit_cost float8 NULL,
	roq_constrained int4 NULL,
	raw_roq int4 NULL,
	ia_shipment_order_quantity int4 NULL,
	roq_unconstrained int4 NULL,
	order_placement_date date NULL,
	order_placement_recom_date date NULL,
	fiscal_year_week int4 NULL,
	fiscal_year_month varchar NULL,
	fiscal_year varchar NULL,
	fiscal_year_quarter varchar NULL,
	week_start_date date NULL,
	"month" varchar(50) NULL,
	expected_receipt_date date NOT NULL,
	rop_ideal date NULL,
	mode_shipment varchar(50) NULL,
	lead_time int4 NULL,
	order_to_po_processing_time int4 NULL,
	effective_lead_time int4 NULL,
	min_order_quantity_shipment int4 NULL,
	min_order_quantity_sku int4 NULL,
	min_order_quantity_style int4 NULL,
	max_order_quantity_shipment int4 NULL,
	max_order_quantity_sku int4 NULL,
	max_order_quantity_style int4 NULL,
	order_multiple int4 NULL,
	inventory_hold int4 NULL,
	order_status_id int4 NOT NULL,
	created_by int4 NULL,
	created_at timestamptz NULL,
	updated_by int4 NULL,
	updated_at timestamptz NULL,
	approve_by_date date NULL,
	is_deleted bool NULL,
	is_resolved varchar(50) NULL,
	recom_receipt_date date NULL,
	create_by_date date NULL,
	editable_expected_receipt_date date NULL,
	lost_sales_agg int4 NULL,
	inventory_deficit_agg int4 NULL,
	orders_upto_qty int4 NULL,
	elt_projected_bop int4 NULL,
	elt_projected_safety_stock int4 NULL,
	order_type varchar(50) NULL,
	target_qty int4 NULL,
	lost_sales_agg_1 int4 NULL,
	forecasted_sales int4 NULL,
	target_wos int4 NULL,
	lost_sales_agg_2 int4 NULL,
	excess_inv int4 NULL,
	unmapped_store_inventory int4 NULL,
	store_groups int4 NULL,
	store_counts int4 NULL,
	flow_id varchar(50) NULL,
	immd_roq varchar(50) NULL,
	order_reason varchar(50) NULL,
	calendar_date date NULL,
	week_end_date date NULL,
	id int4 DEFAULT nextval('inventory_smart.oms_orders_recommended_new_id_seq'::regclass) NOT NULL,
	CONSTRAINT pk_oms_orders_recommended PRIMARY KEY (id),
	CONSTRAINT uk_oms_orders_recommended UNIQUE (product_code, loc_code, channel, vendor_code, rop, expected_receipt_date, order_status_id, order_gen_type)
);
CREATE INDEX IF NOT EXISTS idx_oms_ord_recom_ord_status ON inventory_smart.oms_orders_recommended USING btree (order_status_id);
CREATE INDEX IF NOT EXISTS idx_oms_ord_recom_product_channel ON inventory_smart.oms_orders_recommended USING btree (product_code, channel);
CREATE INDEX IF NOT EXISTS idx_oms_ord_recom_product_code ON inventory_smart.oms_orders_recommended USING btree (product_code);
CREATE INDEX IF NOT EXISTS idx_oms_ord_recom_product_loc_code ON inventory_smart.oms_orders_recommended USING btree (product_code, loc_code);
CREATE INDEX IF NOT EXISTS idx_oms_ord_recom_rop ON inventory_smart.oms_orders_recommended USING btree (rop);



--changeset samarjit.mazumder@impactanalytics.co.co:change_datatype_id stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:briscoes_change_datatype_id
--comment: changed datatype for id column

ALTER TABLE inventory_smart.oms_orders_recommended DROP COLUMN id;
ALTER TABLE inventory_smart.oms_orders_recommended ADD COLUMN id SERIAL not NULL;

--changeset samarjit.mazumder@impactanalytics.co.co:drop_notnull_constraint stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:briscoes_drop_notnull_constraint
--comment: changed drop_notnull_constraint
ALTER TABLE inventory_smart.oms_orders_recommended ALTER column order_gen_type drop NOT null;
ALTER TABLE inventory_smart.oms_orders_recommended ALTER column product_code drop NOT null;
ALTER TABLE inventory_smart.oms_orders_recommended ALTER column loc_code drop NOT null;
ALTER TABLE inventory_smart.oms_orders_recommended ALTER column channel drop NOT null;
ALTER TABLE inventory_smart.oms_orders_recommended ALTER column vendor_code drop NOT null;
ALTER TABLE inventory_smart.oms_orders_recommended ALTER column rop drop NOT null;
ALTER TABLE inventory_smart.oms_orders_recommended ALTER column expected_receipt_date drop NOT null;
ALTER TABLE inventory_smart.oms_orders_recommended ALTER column order_status_id drop NOT null;
DROP INDEX IF EXISTS inventory_smart.idx_oms_ord_recom_product_channel;

--changeset samarjit.mazumder@impactanalytics.co:columns_dtype_change22 stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:briscoes_columns_dtype_change22
--comment: changed columns_dtype_change22
ALTER TABLE inventory_smart.oms_orders_recommended ALTER COLUMN "style" TYPE VARCHAR(256);
ALTER TABLE inventory_smart.oms_orders_recommended ALTER COLUMN vendor_name TYPE VARCHAR(256);

--changeset samarjit.mazumder@impactanalytics.co:columns_dtype_change23 stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:briscoes_columns_dtype_change23
--comment: changed columns_dtype_change23
alter table inventory_smart.oms_orders_recommended alter column forecasted_sales type float8;


--changeset samarjit.mazumder@impactanalytics.co:data_type_changes stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:briscoes_columns_dtype_change23
--comment: changed data type
ALTER TABLE inventory_smart.oms_orders_recommended DROP COLUMN IF EXISTS  fiscal_year_month;
ALTER TABLE inventory_smart.oms_orders_recommended DROP COLUMN IF EXISTS  fiscal_year;
ALTER TABLE inventory_smart.oms_orders_recommended DROP COLUMN IF EXISTS fiscal_year_quarter;
ALTER TABLE inventory_smart.oms_orders_recommended ADD COLUMN IF NOT EXISTS fiscal_year_month int4 NULL;
ALTER TABLE inventory_smart.oms_orders_recommended ADD COLUMN IF NOT EXISTS fiscal_year int4 NULL;
ALTER TABLE inventory_smart.oms_orders_recommended ADD COLUMN IF NOT EXISTS fiscal_year_quarter  int4 NULL;

--changeset samarjit.mazumder@impactanalytics.co:new_col_add stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:new_col_add1
--comment: new_col_add elt_projected_store_inv
ALTER TABLE inventory_smart.oms_orders_recommended ADD COLUMN IF NOT EXISTS  elt_projected_store_inv int4;

--changeset samarjit.mazumder@impactanalytics.co:new_col_add_order_placement_date_original stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:new_col_add_order_placement_date_original
--comment: new_col_add order_placement_date_original
ALTER TABLE inventory_smart.oms_orders_recommended ADD COLUMN IF NOT EXISTS  order_placement_date_original DATE;
