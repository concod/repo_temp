--liquibase formatted sql
--changeset tarun.tyagi:auto_allocation_scheduler stripComments:false splitStatements:false context:command-fix labels:command-fix
--comment: Auto Allocation Scheduler table (store data related to auto allocation scheduler) - added if not exists clause in the create table

CREATE TABLE IF NOT EXISTS inventory_smart.auto_allocation_scheduler (
	sh_code serial4 NOT NULL,
	sh_name varchar NOT NULL,
	sh_structure jsonb NOT NULL,
	sh_frequency varchar NULL,
	is_deleted bool DEFAULT false NOT NULL,
	created_by int4 NOT NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	updated_by int4 NULL,
	updated_at timestamptz NULL,
	is_deletable bool DEFAULT true NOT NULL,
	CONSTRAINT auto_allocation_scheduler_sh_code_pk PRIMARY KEY (sh_code),
	CONSTRAINT auto_allocation_scheduler_sh_name_unique UNIQUE (sh_name),
	CONSTRAINT auto_allocation_scheduler_created_by_fk FOREIGN KEY (created_by) REFERENCES "global".user_master(user_code) ON DELETE SET NULL,
	CONSTRAINT auto_allocation_scheduler_updated_by_fk FOREIGN KEY (updated_by) REFERENCES "global".user_master(user_code) ON DELETE SET NULL
);