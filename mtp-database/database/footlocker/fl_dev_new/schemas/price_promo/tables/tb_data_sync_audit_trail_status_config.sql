--liquibase formatted sql
--changeset liquibase:tb_data_sync_audit_trail_status_config stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_data_sync_audit_trail_status_config

CREATE TABLE price_promo.tb_data_sync_audit_trail_status_config (
	id serial4 NOT NULL,
    status_id int4 NOT NULL,
	status_name text NOT NULL,
	CONSTRAINT tb_data_sync_audit_trail_status_config_pkey PRIMARY KEY (id),
	CONSTRAINT tb_data_sync_audit_trail_status_config_ukey UNIQUE (status_id, status_name)
);