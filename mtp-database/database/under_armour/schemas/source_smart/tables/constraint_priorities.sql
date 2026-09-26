--liquibase formatted sql
--changeset mayankmukundam@impactanalytics.co:constraint_priorities stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: Create constraint_priorities table for soft constraints priority
CREATE TABLE source_smart.constraint_priorities (
	constraint_id uuid NOT NULL,
	priorities jsonb NOT NULL,
	CONSTRAINT constraint_priorities_pk PRIMARY KEY (constraint_id),
	CONSTRAINT constraint_priorities_allocation_constraints_fk FOREIGN KEY (constraint_id) REFERENCES source_smart.allocation_constraints(constraint_id) ON DELETE CASCADE
);