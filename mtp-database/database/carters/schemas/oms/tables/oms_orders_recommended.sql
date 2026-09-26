--liquibase formatted sql
--changeset liquibase:oms_orders_recommended_update2 stripComments:false splitStatements:false context:Release_1_0 labels:MTP-63841_update2
--comment: initial changeset for oms_orders_recommended_update2

CREATE TABLE IF NOT EXISTS inventory_smart.oms_orders_recommended (
	fiscal_year_week int4 NULL,
	fiscal_year_month int4 NULL,
	fiscal_year varchar NULL,
	fiscal_year_quarter varchar NULL,
	week_start_date date NULL,
	"month" varchar(50) NULL,
	order_gen_type varchar(50) NULL,
	product_code varchar(50) NULL,
	"style" varchar(50) NULL,
	"size" varchar(50) NULL,
	loc_code varchar(50) DEFAULT '-'::character varying NOT NULL,
	channel varchar(50) NULL,
	article varchar(50) NULL,
	vendor_code varchar NULL,
	vendor_name varchar(50) NULL,
	order_type varchar(50) NULL,
	flow_id varchar(50) NULL,
	rop date NULL,
	rop_ideal date NULL,
	grade varchar(50) NULL,
	order_quantity int4 NULL,
	order_cost float8 NULL,
	unit_cost float8 NULL,
	orders_upto_qty int4 NULL,
	elt_projected_bop int4 NULL,
	elt_projected_safety_stock int4 NULL,
	target_qty int4 NULL,
	raw_roq int4 NULL,
	ia_shipment_order_quantity int4 NULL,
	roq_constrained int4 NULL,
	roq_unconstrained int4 NULL,
	immd_roq varchar(50) NULL,
	inventory_hold int4 NULL,
	order_placement_date date NULL,
	order_placement_recom_date date NULL,
	expected_receipt_date date NULL,
	editable_expected_receipt_date date NULL,
	lead_time int4 NULL,
	order_to_po_processing_time int4 NULL,
	effective_lead_time int4 NULL,
	min_order_quantity_shipment int4 NULL,
	max_order_quantity_shipment int4 NULL,
	min_order_quantity_sku int4 NULL,
	max_order_quantity_sku int4 NULL,
	min_order_quantity_style int4 NULL,
	max_order_quantity_style int4 NULL,
	order_multiple int4 NULL,
	order_status_id int4 NULL,
	approve_by_date date NULL,
	is_deleted bool NULL,
	is_resolved bool NULL,
	recom_receipt_date date NULL,
	create_by_date date NULL,
	lost_sales_agg int4 NULL,
	inventory_deficit_agg int4 NULL,
	lost_sales_agg_1 int4 NULL,
	forecasted_sales int4 NULL,
	lost_sales_agg_2 int4 NULL,
	excess_inv int4 NULL,
	unmapped_store_inventory int4 NULL,
	store_counts int4 NULL,
	store_groups int4 NULL,
	target_wos int4 NULL,
	mode_shipment varchar(50) NULL,
	order_reason varchar(50) NULL,
	created_by int4 NULL,
	created_at timestamptz NULL,
	updated_by int4 NULL,
	updated_at timestamptz NULL,
	id serial4 NOT NULL,
	order_group_id varchar(32) NULL,
	order_batch_name varchar NULL,
	CONSTRAINT oms_orders_recommended_pkey PRIMARY KEY (id),
	CONSTRAINT uk_oms_orders_recommended UNIQUE (product_code, loc_code, channel, vendor_code, rop, expected_receipt_date, order_status_id, order_gen_type)
);
DROP INDEX IF EXISTS inventory_smart.idx_oms_ord_recom_ord_status;
DROP INDEX IF EXISTS inventory_smart.idx_oms_ord_recom_product_channel;
DROP INDEX IF EXISTS inventory_smart.idx_oms_ord_recom_product_code;
DROP INDEX IF EXISTS inventory_smart.idx_oms_ord_recom_product_loc_code;
DROP INDEX IF EXISTS inventory_smart.idx_oms_ord_recom_rop;
DROP INDEX IF EXISTS inventory_smart.idx_oms_orders_recommended_product_code;
CREATE INDEX idx_oms_ord_recom_ord_status ON inventory_smart.oms_orders_recommended USING btree (order_status_id);
CREATE INDEX idx_oms_ord_recom_product_channel ON inventory_smart.oms_orders_recommended USING btree (product_code, channel);
CREATE INDEX idx_oms_ord_recom_product_code ON inventory_smart.oms_orders_recommended USING btree (product_code);
CREATE INDEX idx_oms_ord_recom_product_loc_code ON inventory_smart.oms_orders_recommended USING btree (product_code, loc_code);
CREATE INDEX idx_oms_ord_recom_rop ON inventory_smart.oms_orders_recommended USING btree (rop);
CREATE INDEX idx_oms_orders_recommended_product_code ON inventory_smart.oms_orders_recommended USING btree (product_code);


--changeset harsh.agrawal:added_column_safety_stock stripComments:false splitStatements:false context:Release_1_0 labels:MTP-63841_update2
--comment: Adding new column safety stock
ALTER TABLE inventory_smart.oms_orders_recommended ALTER COLUMN order_quantity TYPE float8 USING order_quantity::float8;
ALTER TABLE inventory_smart.oms_orders_recommended ADD COLUMN safety_stock INT NULL;

--changeset pradeep.kumar:changing_datatype_of_order_quantity_test stripComments:false splitStatements:false context:Release_1_0 labels:changing_datatype_of_order_quantity_test
--comment: changing_datatype_of_order_quantity to int4

ALTER TABLE inventory_smart.oms_orders_recommended ALTER COLUMN order_quantity TYPE int4 USING order_quantity::int4;

--changeset pradeep.kumar:adding_store_inv_column stripComments:false splitStatements:false context:Release_1_0 labels:adding_store_inv_column
--comment: adding store inv column

ALTER TABLE inventory_smart.oms_orders_recommended ADD COLUMN elt_projected_store_inv int4;

--changeset pradeep.kumar:oms_orders_recommended_column_addn_opd_og stripComments:false splitStatements:false context:initial_release labels:dtype column_addn_order_placement_date_orig
--comment: column_addn_opd_og
ALTER TABLE inventory_smart.oms_orders_recommended ADD COLUMN order_placement_date_original DATE;