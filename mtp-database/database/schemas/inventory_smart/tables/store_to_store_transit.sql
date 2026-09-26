--liquibase formatted sql
--changeset ananya.gupta:store_to_store_transit stripComments:false splitStatements:false context:command-fix labels:command-fix
--comment: store_to_store_transit

CREATE TABLE if not EXISTS  inventory_smart.store_to_store_transit (
	transit_id serial4 NOT NULL,
	source_store_code varchar NOT NULL,
	destination_store_code varchar NOT NULL,
	distance_km numeric(10, 2) NULL,
	lead_time_days int4 NULL,
	is_active bool DEFAULT true NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT store_to_store_transit_pkey PRIMARY KEY (transit_id),
	CONSTRAINT store_to_store_transit_destination_store_code_fkey FOREIGN KEY (destination_store_code) REFERENCES "global".store_master(store_code),
	CONSTRAINT store_to_store_transit_source_store_code_fkey FOREIGN KEY (source_store_code) REFERENCES "global".store_master(store_code)
);
--changeset ananya.gupta@impactanalytics.co:store_code_index_add stripComments:false splitStatements:false context:store_code_index_add labels:store_code_index
--comment: Adding indexes on store_code_index_add

CREATE INDEX if not exists idx_store_to_store_transit_src_dst
ON inventory_smart.store_to_store_transit (source_store_code, destination_store_code);