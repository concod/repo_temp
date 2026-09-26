--liquibase formatted sql
--changeset liquibase:allocation_payloads stripComments:false splitStatements:false context:MTP-34245 labels:MTP-34245
--comment: initial changeset for allocation_payloads

CREATE TABLE inventory_smart.allocation_payloads (
	allocation_id varchar NOT NULL,
	allocation_seq serial4 NOT NULL,
	payload jsonb NOT NULL,
	created_by int4 NULL,
	created_at timestamptz NOT NULL DEFAULT now()
);