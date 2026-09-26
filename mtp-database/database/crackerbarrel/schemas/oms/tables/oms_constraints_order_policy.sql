--liquibase formatted sql
--changeset liquibase:oms_constraints_order_policy stripComments:false splitStatements:false context:Release_1_0 labels:oms_constraints_order_policy
--comment: initial changeset for oms_constraints_order_policy


CREATE TABLE IF NOT EXISTS inventory_smart.oms_constraints_order_policy (
	article varchar(100) NOT NULL,
	loc_code varchar(100) DEFAULT '-'::character varying NOT NULL,
	channel varchar(100) NOT NULL,
	vendor_code varchar(100) NOT NULL,
	vendor_name varchar(100) NULL,
	replenishment_strategy varchar(100) NULL,
	scheduler varchar(100) NULL,
	order_strategy varchar(100) NULL,
	shipment_frequency varchar(100) NULL,
	created_by int4 NULL,
	created_at timestamptz NULL,
	updated_at timestamptz NULL,
	updated_by int4 NULL,
	column_updated varchar(100) NULL,
	id serial4 NOT NULL,
	CONSTRAINT pk_oms_constraints_order_policy PRIMARY KEY (article, loc_code, channel)
);