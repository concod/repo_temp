--liquibase formatted sql
--changeset sidhartha.c@impactanalytics.co:oms_constraints_order_policy_1 stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:briscoes_oms_constraints_order_policy_1
--comment: initial changeset for oms_constraints_order_policy_1


CREATE TABLE IF NOT EXISTS inventory_smart.oms_constraints_order_policy (
	article varchar(256) NOT NULL,
	loc_code varchar(256) DEFAULT 'none'::character varying NOT NULL,
	channel varchar(256) NOT NULL,
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
	CONSTRAINT pk_oms_constraints_order_policy PRIMARY KEY (article, loc_code, channel, vendor_code)
);