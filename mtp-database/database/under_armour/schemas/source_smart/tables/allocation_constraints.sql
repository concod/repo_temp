--liquibase formatted sql
--changeset genuine.basil@impactanalytics.co:allocation_constraints stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for allocation_constraints
CREATE TABLE source_smart.allocation_constraints (
	constraint_id uuid NOT NULL,
	constraint_name varchar(255) NULL,
	description text NULL,
	season_id varchar(255) NULL,
	l0_name varchar(255) NULL,
	created_at timestamptz DEFAULT now() NULL,
	created_by varchar(255) NULL,
	last_modified timestamptz DEFAULT now() NULL,
	last_modified_by varchar(255) NULL,
	CONSTRAINT pk_allocation_constraints_constraint_id PRIMARY KEY (constraint_id)
);
CREATE INDEX idx_allocation_constraints_constraint_name ON source_smart.allocation_constraints USING btree (constraint_name);
CREATE INDEX idx_allocation_constraints_l0_name ON source_smart.allocation_constraints USING btree (l0_name);
CREATE INDEX idx_allocation_constraints_season_l0 ON source_smart.allocation_constraints USING btree (season_id, l0_name);