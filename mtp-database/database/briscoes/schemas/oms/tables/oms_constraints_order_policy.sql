--liquibase formatted sql
--changeset sriraj.varanasi@impactanalytics.co:oms_constraints_order_policy stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:briscoes_oms_constraints_order_policy
--comment: initial changeset for oms_constraints_order_policy


CREATE TABLE IF NOT EXISTS inventory_smart.oms_constraints_order_policy (
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
	id serial4 NOT NULL,
	channel varchar NOT NULL,
	CONSTRAINT pk_oms_constraints_order_policy PRIMARY KEY (article, loc_code, channel, vendor_code)
);


--changeset samarjit.mazumder@impactanalytics.co.co:drop_id_column stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:briscoes_drop_notnull_constraint
--comment: changed drop_notnull_constraint
ALTER TABLE inventory_smart.oms_constraints_order_policy DROP COLUMN IF EXISTS id;
ALTER TABLE inventory_smart.oms_constraints_order_policy ADD COLUMN IF NOT EXISTS id int4;

--changeset samarjit.mazumder@impactanalytics.co:add_column_vendor_location1 stripComments:false splitStatements:false context:Release_1_0 labels:add_column_vendor_location
--comment: add_column_vendor_location
ALTER TABLE inventory_smart.oms_constraints_order_policy
DROP CONSTRAINT pk_oms_constraints_order_policy;

alter table inventory_smart.oms_constraints_order_policy drop column if exists loc_code;

alter table inventory_smart.oms_constraints_order_policy add column if not exists vendor_location  varchar NOT NULL;

ALTER TABLE inventory_smart.oms_constraints_order_policy
ADD CONSTRAINT pk_oms_constraints_order_policy
PRIMARY KEY (article, channel, vendor_code,vendor_location);

--changeset abhimanyu.sheoran@impactanalytics.co.co:seria4 stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:seria4
--comment: changed seria4
ALTER TABLE inventory_smart.oms_constraints_order_policy DROP COLUMN IF EXISTS id;
ALTER TABLE inventory_smart.oms_constraints_order_policy ADD COLUMN IF NOT EXISTS id serial4;

--changeset samarjit.mazumder@impactanalytics.co:add_column_auto_approve stripComments:false splitStatements:false context:Release_1_0 labels:add_column_auto_approve
--comment: add_column_auto_approve
ALTER TABLE inventory_smart.oms_constraints_order_policy ADD COLUMN IF NOT EXISTS auto_approve boolean NOT NULL DEFAULT false;