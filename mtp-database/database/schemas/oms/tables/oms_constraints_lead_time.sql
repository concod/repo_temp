--liquibase formatted sql
--changeset sriraj.varanasi@impactanalytics.co:oms_constraints_lead_time_1 stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:briscoes_oms_constraints_lead_time
--comment: initial changeset for oms_constraints_lead_time

CREATE TABLE IF NOT EXISTS oms.oms_constraints_lead_time (
	article varchar(256) NOT NULL,
	loc_code varchar(256) DEFAULT 'none'::character varying NOT NULL,
	vendor_code varchar(256) NOT NULL,
	vendor_name varchar(256) NULL,
	po_to_order_processing int4 NULL,
	lead_time int4 NULL,
	shipping_lead_time int4 NULL,
	qc_time int4 NULL,
	mode_shipment varchar(256) NULL,
	default_mode int4 NULL,
	from_date date NULL,
	to_date date NULL,
	created_by int4 NULL,
	created_at timestamptz NULL,
	updated_by int4 NULL,
	updated_at timestamptz NULL,
	column_updated varchar(256) NULL,
	id serial4 NOT NULL,
	channel varchar NOT NULL,
	fabric_lt int4 NULL,
	variance int4 NULL,
	manufacturing_lead_time int4 NULL,
	category varchar NULL,
	CONSTRAINT pk_oms_constraints_lead_time PRIMARY KEY (article, loc_code, channel, vendor_code)
);
--changeset raja.duraisamy@impactanalytics.co:oms_constraints_lead_time_performance_indexes_1 stripComments:false splitStatements:false context:performance_optimization labels:OMS_PERFORMANCE_INDEXES
--comment: Performance indexes for oms_constraints_lead_time based on query analysis
CREATE INDEX IF NOT EXISTS idx_oms_constraints_lt_article_loc_default ON oms.oms_constraints_lead_time(article, loc_code, default_mode) WHERE default_mode = 1;
CREATE INDEX IF NOT EXISTS idx_oms_constraints_lt_article ON oms.oms_constraints_lead_time(article);
CREATE INDEX IF NOT EXISTS idx_oms_constraints_lt_mode_shipment  ON oms.oms_constraints_lead_time(mode_shipment);

--changeset raja.duraisamy@impactanalytics.co:index_oms_constraints_lead_time_drop_indexes stripComments:false splitStatements:false context:generic_schema_update labels:GENERIC_SCHEMA_UPDATE
--comment: Index for oms_constraints_lead_time
DROP INDEX IF EXISTS oms.idx_oms_constraints_lt_article_loc_default;
DROP INDEX IF EXISTS oms.idx_oms_constraints_lt_article;
DROP INDEX IF EXISTS oms.idx_oms_constraints_lt_mode_shipment;
CREATE INDEX IF NOT EXISTS idx_oms_constraints_lt_article_loc_default_mode ON oms.oms_constraints_lead_time(article, loc_code, mode_shipment, default_mode);