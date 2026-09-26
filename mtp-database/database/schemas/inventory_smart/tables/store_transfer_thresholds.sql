--liquibase formatted sql
--changeset ananya.gupta:store_transfer_thresholds stripComments:false splitStatements:false context:command-fix labels:command-fix
--comment: store_transfer_thresholds

CREATE TABLE if not EXISTS inventory_smart.store_transfer_thresholds (
	product_code varchar(50) NOT NULL,
	dc_inventory_threshold int4 DEFAULT 0 NOT NULL,
	fixed_push_percent numeric(5, 2) NULL,
	source_wos_threshold_multiplier int4 DEFAULT 0 NOT NULL,
	dest_wos_threshold_multiplier int4 DEFAULT 0 NOT NULL,
	CONSTRAINT store_transfer_thresholds_pkey PRIMARY KEY (product_code)
);

--changeset ananya.gupta:drop_and_recreate_store_transfer_thresholds_20251205
--comment: Replace product_code with article in store_transfer_thresholds

DROP TABLE IF EXISTS inventory_smart.store_transfer_thresholds CASCADE;

CREATE TABLE inventory_smart.store_transfer_thresholds (
    article VARCHAR(50) NOT NULL,
    dc_inventory_threshold INT4 DEFAULT 0 NOT NULL,
    fixed_push_percent NUMERIC(5, 2) NULL,
    source_wos_threshold_multiplier INT4 DEFAULT 0 NOT NULL,
    dest_wos_threshold_multiplier INT4 DEFAULT 0 NOT NULL,
    CONSTRAINT store_transfer_thresholds_pkey PRIMARY KEY (article)
);