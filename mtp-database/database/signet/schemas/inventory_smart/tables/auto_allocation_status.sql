--liquibase formatted sql
--changeset liquibase:auto_allocation_status stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for auto allocation status
CREATE TABLE inventory_smart.auto_allocation_status (
	parent_allocation_code varchar NOT NULL,
	child_allocation_code varchar NOT NULL,
	status int4 NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),	
    articles _text NULL
);