--liquibase formatted sql
--changeset samarjit.mazumder@impactanalytics.co.co:oms_orders_recommended_1 stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:briscoes_oms_orders_recommended
--comment: initial changeset for oms_orders_recommended_1
CREATE SEQUENCE IF NOT EXISTS oms.oms_orders_recommended_new_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;

CREATE TABLE IF NOT EXISTS oms.oms_orders_recommended (
	fiscal_year_week int4 NULL,
	fiscal_year_month int4 NULL,
	fiscal_year varchar NULL,
	fiscal_year_quarter varchar NULL,
	week_start_date date NULL,
	"month" varchar(100) NULL,
	order_gen_type varchar(100) NULL,
	product_code varchar(100) NULL,
	"style" varchar(100) NULL,
	"size" varchar(100) NULL,
	loc_code varchar(100) DEFAULT '-'::character varying NOT NULL,
	channel varchar(100) NULL,
	article varchar(100) NULL,
	vendor_code varchar NULL,
	vendor_name varchar(100) NULL,
	order_type varchar(100) NULL,
	flow_id varchar(100) NULL,
	rop date NULL,
	rop_ideal date NULL,
	grade varchar(100) NULL,
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
	immd_roq varchar(100) NULL,
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
	mode_shipment varchar(100) NULL,
	order_reason varchar(100) NULL,
	created_by int4 NULL,
	created_at timestamptz NULL,
	updated_by int4 NULL,
	updated_at timestamptz NULL,
	id serial4 NOT NULL,
	order_group_id varchar(100) NULL,
	order_batch_name varchar NULL,
	safety_stock int4 NULL,
	pack_id varchar(100) NULL,
	pack_config int4 NULL,
	order_quantity_eaches int4 NULL,
	roq_constrained_eaches int4 NULL,
	raw_roq_eaches int4 NULL,
	roq_unconstrained_eaches int4 NULL,
	ia_shipment_order_quantity_eaches float4 NULL,
	elt_projected_store_inv int4 NULL,
	CONSTRAINT oms_orders_recommended_pkey PRIMARY KEY (id),
	CONSTRAINT uk_oms_orders_recommended UNIQUE (product_code, loc_code, channel, vendor_code, rop, expected_receipt_date, order_status_id, order_gen_type)
);

--changeset raja.duraisamy@impactanalytics.co:oms_orders_recommended_performance_indexes_1 stripComments:false splitStatements:false context:performance_optimization labels:OMS_PERFORMANCE_INDEXES
--comment: Performance indexes based on actual SP usage patterns - Critical indexes

CREATE INDEX IF NOT EXISTS idx_oms_ord_recom_order_status_id ON oms.oms_orders_recommended(order_status_id) WHERE order_status_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_oms_ord_recom_article_loc ON oms.oms_orders_recommended(article, loc_code) WHERE article IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_oms_ord_recom_order_group_loc ON oms.oms_orders_recommended(order_group_id, loc_code) WHERE order_group_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_oms_ord_recom_product_code ON oms.oms_orders_recommended(product_code) WHERE product_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_oms_ord_recom_product_loc ON oms.oms_orders_recommended(product_code, loc_code);
CREATE INDEX IF NOT EXISTS idx_oms_ord_recom_order_gen_type ON oms.oms_orders_recommended(order_gen_type);

--changeset raja.duraisamy@impactanalytics.co:oms_orders_recommended_performance_indexes_2 stripComments:false splitStatements:false context:performance_optimization labels:OMS_PERFORMANCE_INDEXES
--comment: Performance indexes based on actual SP usage patterns - Fiscal and filtering indexes
CREATE INDEX IF NOT EXISTS idx_oms_ord_recom_article_fiscal_week ON oms.oms_orders_recommended(article, fiscal_year_week);
CREATE INDEX IF NOT EXISTS idx_oms_ord_recom_article_fiscal_month ON oms.oms_orders_recommended(article, fiscal_year_month);
CREATE INDEX IF NOT EXISTS idx_oms_ord_recom_product_loc_ch_fyw ON oms.oms_orders_recommended(product_code, loc_code, channel, fiscal_year_week);


--changeset raja.duraisamy@impactanalytics.co:oms_orders_recommended_add_missing_columns stripComments:false splitStatements:false context:generic_schema_update labels:GENERIC_SCHEMA_UPDATE
--comment: Add missing generic schema columns to oms_orders_recommended
ALTER TABLE oms.oms_orders_recommended ADD COLUMN IF NOT EXISTS calendar_date date NULL;
ALTER TABLE oms.oms_orders_recommended ADD COLUMN IF NOT EXISTS editable_not_after_date date NULL;
ALTER TABLE oms.oms_orders_recommended ADD COLUMN IF NOT EXISTS editable_not_before_date date NULL;
ALTER TABLE oms.oms_orders_recommended ADD COLUMN IF NOT EXISTS not_after_date date NULL;
ALTER TABLE oms.oms_orders_recommended ADD COLUMN IF NOT EXISTS not_before_date date NULL;
ALTER TABLE oms.oms_orders_recommended ADD COLUMN IF NOT EXISTS order_placement_date_original date NULL;
ALTER TABLE oms.oms_orders_recommended ADD COLUMN IF NOT EXISTS temp varchar(50) NULL;
ALTER TABLE oms.oms_orders_recommended ADD COLUMN IF NOT EXISTS week_end_date date NULL;

--changeset raja.duraisamy@impactanalytics.co:index_oms_orders_recommended_drop_indexes stripComments:false splitStatements:false context:generic_schema_update labels:GENERIC_SCHEMA_UPDATE
--comment: Index for oms_orders_recommended
DROP INDEX IF EXISTS oms.idx_oms_ord_recom_article_fiscal_month;
DROP INDEX IF EXISTS oms.idx_oms_ord_recom_product_loc_ch_fyw;
DROP INDEX IF EXISTS oms.idx_oms_ord_recom_product_code;
DROP INDEX IF EXISTS oms.idx_oms_ord_recom_product_loc;
DROP INDEX IF EXISTS oms.idx_oms_ord_recom_article_loc;
DROP INDEX IF EXISTS oms.idx_oms_ord_recom_order_group_loc;
CREATE INDEX IF NOT EXISTS idx_oms_ord_recom_article_group_loc_prod ON oms.oms_orders_recommended(article, order_group_id, loc_code, product_code);