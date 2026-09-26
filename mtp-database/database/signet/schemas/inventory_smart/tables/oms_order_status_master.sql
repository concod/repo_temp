--liquibase formatted sql
--changeset liquibase:oms_order_status_master stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for oms_order_status_master
CREATE TABLE inventory_smart.oms_order_status_master (
	id serial4 NOT NULL,
	status_code varchar NOT NULL,
	status_desc text NULL,
	CONSTRAINT pk_oms_order_status_master PRIMARY KEY (id),
	CONSTRAINT uk_oms_order_status_master UNIQUE (status_code)
);