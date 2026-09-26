--liquibase formatted sql
--changeset swapnil.bhange:ingestion_region_status stripComments:false splitStatements:false context:ingestion_region_status labels:ingestion_region_status
--comment: initial changeset for ingestion_region_status
CREATE TABLE inventory_smart.ingestion_region_status (
	id serial4 NOT NULL,
	region varchar(255) NOT NULL,
	batch_id int4 NULL,
	start_time timestamptz NOT NULL,
	end_time timestamptz NOT NULL,
	CONSTRAINT ingestion_region_status_pkey PRIMARY KEY (id),
	CONSTRAINT ingestion_region_status_region_batch_id_key UNIQUE (region, batch_id)
);
