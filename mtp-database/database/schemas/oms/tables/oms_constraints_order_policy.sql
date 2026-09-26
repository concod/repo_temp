--liquibase formatted sql
--changeset chandra@impactanalytics.co:oms_constraints_order_policy_new stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:briscoes_oms_constraints_order_policy
--comment: initial changeset for oms_constraints_order_policy


CREATE TABLE IF NOT EXISTS oms.oms_constraints_order_policy (
	article varchar(256) NOT NULL,
	loc_code varchar(256) DEFAULT 'none'::character varying NOT NULL,
	vendor_code varchar(256) NOT NULL,
	vendor_name varchar(256) NULL,
	replenishment_strategy varchar(256) NULL,
	scheduler varchar(256) NULL,
	order_strategy varchar(256) NULL,
	shipment_frequency varchar(256) NULL,
	created_by int4 NULL,
	created_at timestamptz NULL,
	updated_by int4 NULL,
	updated_at timestamptz NULL,
	column_updated varchar(256) NULL,
	id int4 NOT NULL,
	channel varchar NOT NULL,
	CONSTRAINT pk_oms_constraints_order_policy PRIMARY KEY (article, loc_code, channel, vendor_code)
);

--changeset raja.duraisamy@impactanalytics.co:oms_constraints_order_policy_performance_indexes_1 stripComments:false splitStatements:false context:performance_optimization labels:OMS_PERFORMANCE_INDEXES
--comment: Performance indexes for oms_constraints_order_policy based on query analysis
CREATE INDEX IF NOT EXISTS idx_oms_constraints_op_article ON oms.oms_constraints_order_policy(article);
CREATE INDEX IF NOT EXISTS idx_oms_constraints_op_scheduler ON oms.oms_constraints_order_policy(scheduler) WHERE scheduler IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_oms_constraints_op_vendor_code ON oms.oms_constraints_order_policy(article, loc_code, vendor_code);


--changeset raja.duraisamy@impactanalytics.co:oms_constraints_order_policy_add_missing_columns_1 stripComments:false splitStatements:false context:generic_schema_update labels:GENERIC_SCHEMA_UPDATE
--comment: Add missing generic schema columns to oms_constraints_order_policy
ALTER TABLE oms.oms_constraints_order_policy ADD COLUMN IF NOT EXISTS auto_approve bool NULL;
ALTER TABLE oms.oms_constraints_order_policy ADD COLUMN IF NOT EXISTS new_hier varchar(50) NULL;
ALTER TABLE oms.oms_constraints_order_policy ADD COLUMN IF NOT EXISTS vendor_location varchar(256) NULL;
ALTER TABLE oms.oms_constraints_order_policy ADD COLUMN IF NOT EXISTS loc_code varchar(256) NULL;


--changeset raja.duraisamy@impactanalytics.co:index_oms_constraints_order_policy_drop_indexes stripComments:false splitStatements:false context:generic_schema_update labels:GENERIC_SCHEMA_UPDATE
--comment: Index for oms_constraints_order_policy
DROP INDEX IF EXISTS oms.idx_oms_constraints_op_article;

--changeset raja.duraisamy@impactanalytics.co:index_oms_constraints_order_policy_drop_primary_key_4 stripComments:false splitStatements:false context:generic_schema_update labels:GENERIC_SCHEMA_UPDATE
--comment: Index for oms_constraints_order_policy
ALTER TABLE oms.oms_constraints_order_policy DROP CONSTRAINT IF EXISTS pk_oms_constraints_order_policy;
ALTER TABLE oms.oms_constraints_order_policy DROP COLUMN IF EXISTS id;
ALTER TABLE oms.oms_constraints_order_policy ADD COLUMN IF NOT EXISTS id serial4 NOT NULL;
ALTER TABLE oms.oms_constraints_order_policy ADD CONSTRAINT pk_oms_constraints_order_policy_id PRIMARY KEY (id);
CREATE UNIQUE INDEX IF NOT EXISTS uk_oms_constraints_order_policy_article_vendor ON oms.oms_constraints_order_policy (article, vendor_code);