--liquibase formatted sql
--changeset sriraj.varanasi@impactanalytics.co:oms_constraints_status stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:briscoes_oms_constraints_status
--comment: initial changeset for oms_constraints_status

CREATE TABLE IF NOT EXISTS oms.oms_constraints_status (
	product_code varchar(256) NOT NULL,
	vendor_code varchar(256) NOT NULL,
	vendor_name varchar(256) NULL,
	status varchar(256) NULL,
	preferred_status varchar(256) NULL,
	created_by int4 NULL,
	created_at timestamptz NULL,
	updated_by int4 NULL,
	updated_at timestamptz NULL,
	column_updated varchar(256) NULL,
	id serial4 NOT NULL,
	channel varchar NOT NULL,
	CONSTRAINT pk_oms_constraints_status PRIMARY KEY (product_code, channel, vendor_code)
);


--changeset samarjit.mazumder@impactanalytics.co:drop_not_null_constraint_update1 stripComments:false splitStatements:false context:Release_1_0 labels:drop_not_null_constraint
--comment: drop_not_null_constraint
ALTER TABLE oms.oms_constraints_status ADD COLUMN IF NOT EXISTS l6_name VARCHAR NULL;

--changeset raja.duraisamy@impactanalytics.co:oms_constraints_status_performance_indexes_1 stripComments:false splitStatements:false context:performance_optimization labels:OMS_PERFORMANCE_INDEXES
--comment: Performance indexes for oms_constraints_status based on query analysis
CREATE INDEX IF NOT EXISTS idx_oms_constraints_status_product_code ON oms.oms_constraints_status(product_code);
CREATE INDEX IF NOT EXISTS idx_oms_constraints_status_vendor ON oms.oms_constraints_status(vendor_code);

--changeset raja.duraisamy@impactanalytics.co:oms_constraints_status_add_missing_columns stripComments:false splitStatements:false context:generic_schema_update labels:GENERIC_SCHEMA_UPDATE
--comment: Add missing generic schema columns to oms_constraints_status
ALTER TABLE oms.oms_constraints_status ADD COLUMN IF NOT EXISTS l6_id varchar(256) NULL;
ALTER TABLE oms.oms_constraints_status ADD COLUMN IF NOT EXISTS vendor_location varchar(256) NULL;
