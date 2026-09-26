--liquibase formatted sql
--changeset liquibase:high_frequency_chunk_status stripComments:false splitStatements:false context:MTP-91286 labels:MTP-91286
--comment: initial changeset for high_frequency_chunk_status
CREATE TABLE inventory_smart.high_frequency_chunk_status (
	parent_id text NULL,
	child_id text NULL,
	status int2 NULL
);
