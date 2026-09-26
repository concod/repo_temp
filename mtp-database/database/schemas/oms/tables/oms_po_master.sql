--liquibase formatted sql
--changeset bhavya.visaria@impactanalytics.co:GA_Instance_schema_creation stripComments:false splitStatements:false context:Release_1_0 labels:moving_tables_to_oms
--comment: GA Instance 

CREATE TABLE IF NOT EXISTS oms.oms_po_master (
	po_id varchar NOT NULL,
	product_code varchar(100) NOT NULL,
	loc_code varchar(100) NOT NULL,
	channel varchar(100) NOT NULL,
	projected_delivery_date date NOT NULL,
	oo int4 NULL,
	it int4 NULL,
	order_id varchar NULL,
	asn_id varchar NULL,
	fiscal_year_week int4 NULL,
	pseudo_po int4 NULL,
	quantity_ordered int4 NULL,
	created_by int4 NULL,
	created_at timestamptz NULL,
	updated_by int4 NULL,
	updated_at timestamptz NULL,
	column_updated varchar(100) NULL,
	id serial4 NOT NULL,
	row_num int4 NULL,
	CONSTRAINT pk_oms_po_master PRIMARY KEY (po_id, product_code, loc_code, channel, projected_delivery_date)
);

--changeset raja.duraisamy@impactanalytics.co:oms_po_master_performance_indexes_1 stripComments:false splitStatements:false context:performance_optimization labels:OMS_PERFORMANCE_INDEXES
--comment: Performance indexes for oms_po_master based on query analysis
CREATE INDEX IF NOT EXISTS idx_oms_po_master_product_loc ON oms.oms_po_master(product_code, loc_code);
CREATE INDEX IF NOT EXISTS idx_oms_po_master_product_loc_fyw ON oms.oms_po_master(product_code, loc_code, fiscal_year_week);
CREATE INDEX IF NOT EXISTS idx_oms_po_master_product_loc_channel ON oms.oms_po_master(product_code, loc_code, channel);

--changeset raja.duraisamy@impactanalytics.co:index_oms_po_master_drop_indexes stripComments:false splitStatements:false context:generic_schema_update labels:GENERIC_SCHEMA_UPDATE
--comment: Index for oms_po_master
DROP INDEX IF EXISTS oms.idx_oms_po_master_product_loc;
DROP INDEX IF EXISTS oms.idx_oms_po_master_product_loc_channel;