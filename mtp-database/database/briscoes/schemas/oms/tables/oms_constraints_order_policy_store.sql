--liquibase formatted sql
--changeset abhimanyu.sheoran@impactanalytics.co:oms_constraints_order_policy_store stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:oms_constraints_order_policy_store
--comment: schema changeset for oms_constraints_order_policy_store

CREATE TABLE IF NOT EXISTS inventory_smart.oms_constraints_order_policy_store (
	article text NULL,
	store_code text NULL,
	channel text NULL,
	vendor_code text NULL,
	vendor_name text NULL,
	replenishment_strategy text NULL,
	scheduler text NULL,
	order_strategy text NULL,
	shipment_frequency text NULL,
	created_by int4 NULL,
	created_at timestamp NULL,
	updated_by int4 NULL,
	updated_at timestamptz NULL,
	column_updated text NULL,
	id int4 NULL,
    CONSTRAINT pk_oms_constraints_order_policy_store PRIMARY KEY (article, store_code, channel, vendor_code)
);


--changeset raja.duraisamy@impactanalytics.co:oms_constraints_order_policy_store_index stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:oms_constraints_order_policy_store_update1
--comment: index changeset for oms_constraints_order_policy_store

CREATE INDEX idx_oms_constraints_order_policy_store ON inventory_smart.oms_constraints_order_policy_store (store_code, article);