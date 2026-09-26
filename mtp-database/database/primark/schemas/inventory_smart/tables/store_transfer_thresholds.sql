--liquibase formatted sql
--changeset liquibase:store_transfer_thresholds_updated_3 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for store_transfer_thresholds_updated_3

CREATE TABLE IF NOT EXISTS inventory_smart.store_transfer_thresholds (
	article varchar(50) NOT NULL,
	dc_inventory_threshold int4 DEFAULT 0 NOT NULL,
	fixed_push_percent numeric(5, 2) NULL,
	source_wos_threshold_multiplier int4 DEFAULT 0 NOT NULL,
	dest_wos_threshold_multiplier int4 DEFAULT 0 NOT NULL,
	CONSTRAINT store_transfer_thresholds_pkey PRIMARY KEY (article)
);
