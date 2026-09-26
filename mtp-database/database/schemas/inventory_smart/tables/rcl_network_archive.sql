--liquibase formatted sql
--changeset shashwat.yadav@impactanalytics.co:rcl_network_archive_modified stripComments:false splitStatements:false context:Release_1_0 labels:MTP-74818
--comment: initial changeset for rcl_network_archive

CREATE TABLE IF NOT EXISTS inventory_smart.rcl_network_archive (
	rcl_code int4 NOT NULL,
	rule_code int4 NOT NULL,
	rcl_dimension jsonb DEFAULT '{}'::jsonb NOT NULL,
	rule_name varchar NULL,
	supply_network int4 NOT NULL,
	validity daterange NOT NULL,
	deleted_at timestamptz DEFAULT now() NOT NULL,
	deleted_by int4 NULL
);