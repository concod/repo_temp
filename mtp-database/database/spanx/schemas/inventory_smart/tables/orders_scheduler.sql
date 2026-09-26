--liquibase formatted sql
--changeset liquibase:orders_scheduler stripComments:false splitStatements:false context:initial_release labels:liquibase_project_start
--comment: initial changeset for orders_scheduler
CREATE TABLE inventory_smart.orders_scheduler (
	sh_code serial4 NOT NULL,
	sh_name varchar NOT NULL,
	sh_structure jsonb NOT NULL,
	sh_frequency varchar NULL,
	is_deleted bool NOT NULL,
	created_by int4 NOT NULL,
	created_at timestamptz NOT NULL,
	updated_by int4 NULL,
	updated_at timestamptz NULL,
	is_deletable bool NOT NULL
);