--liquibase formatted sql
--changeset liquibase:tenant_workflow_config stripComments:false splitStatements:false context:MTP-95358 labels:MTP-95358
--comment: Add Tenant Workflow Config table


CREATE TABLE IF NOT EXISTS inventory_smart.tenant_workflow_config (
	attribute_code serial4 NOT NULL,
	identifier varchar NOT NULL,
	attribute_key varchar NOT NULL,
	description varchar NULL,
	config jsonb NULL,
	CONSTRAINT attribute_workflow_config_pk PRIMARY KEY (attribute_code),
	CONSTRAINT unique_config UNIQUE (attribute_code, identifier, attribute_key)
);