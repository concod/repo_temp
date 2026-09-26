--liquibase formatted sql
--changeset liquibase:high_frequency_chunk_status stripComments:false splitStatements:false context:MTP-62087 labels:MTP-62087
--comment: MTP-62087
--rollback: SELECT 1

CREATE TABLE if NOT exists inventory_smart.high_frequency_chunk_status (
	parent_id text NULL,
	child_id text NULL,
	status int2 NULL
);