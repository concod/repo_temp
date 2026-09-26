--liquibase formatted sql
--changeset auto_allocation_status stripComments:false splitStatements:false context:Release_1_0 labels:auto_allocation_status
--comment: initial changeset for auto_allocation_status

CREATE TABLE inventory_smart.auto_allocation_status (
	parent_allocation_code varchar NOT NULL,
	child_allocation_code varchar NOT NULL,
	status int4 NOT NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	articles _text NULL
);