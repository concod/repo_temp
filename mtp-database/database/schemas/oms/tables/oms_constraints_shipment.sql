--liquibase formatted sql
--changeset bhavya.visaria@impactanalytics.co:moving_table_to_schemas_oms_table_test stripComments:false splitStatements:false context:Release_1_0 labels:moving_tables_to_oms
--comment: GA Instance 

CREATE TABLE IF NOT EXISTS oms.oms_constraints_shipment (
	product_code varchar(100) NOT NULL,
	loc_code varchar(100) DEFAULT 'none'::character varying NOT NULL,
	channel varchar(100) NOT NULL,
	vendor_code varchar(100) NOT NULL,
	vendor_name varchar(100) NULL,
	min_replenishment_quantity int4 NULL,
	max_replenishment_quantity int4 NULL,
	order_multiple int4 NULL,
	default_mode varchar(100) NULL,
	created_by int4 NULL,
	created_at timestamptz NULL,
	updated_by int4 NULL,
	updated_at timestamptz NULL,
	column_updated varchar(100) NULL,
	id serial4 NOT NULL,
	moq_tolerance int4 NULL,
	shipment_scheduler varchar(256) NULL,
	CONSTRAINT check_oms_constraints_ordering CHECK ((min_replenishment_quantity <= max_replenishment_quantity)),
	CONSTRAINT pk_oms_constraints_ordering PRIMARY KEY (product_code, loc_code, channel, vendor_code)
);


--changeset raja.duraisamy@impactanalytics.co:oms_constraints_shipment_performance_indexes_1 stripComments:false splitStatements:false context:performance_optimization labels:OMS_PERFORMANCE_INDEXES
--comment: Performance indexes for oms_constraints_shipment based on query analysis
CREATE INDEX IF NOT EXISTS idx_oms_constraints_shipment_product_loc ON oms.oms_constraints_shipment(product_code, loc_code);
CREATE INDEX IF NOT EXISTS idx_oms_constraints_shipment_product_loc_vendor_code ON oms.oms_constraints_shipment(product_code, loc_code, vendor_code);

--changeset raja.duraisamy@impactanalytics.co:index_oms_constraints_shipment_drop_indexes stripComments:false splitStatements:false context:generic_schema_update labels:GENERIC_SCHEMA_UPDATE
--comment: Index for oms_constraints_shipment
DROP INDEX IF EXISTS oms.idx_oms_constraints_shipment_product_loc;