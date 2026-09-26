
--liquibase formatted sql
--changeset mayank.mukundam@impactanalytics.co:allocation_plans_constraint_priorities stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for allocation_plans_constraint_priorities

CREATE TABLE source_smart.allocation_plans_constraint_priorities (
	allocation_id uuid NOT NULL,
	operation_id uuid NOT NULL,
	priorities jsonb NULL,
	constraint_id uuid NULL,
	CONSTRAINT allocation_plans_constraint_priorities_pk PRIMARY KEY (allocation_id, operation_id),
	CONSTRAINT allocation_plans_constraint_priorities_fk FOREIGN KEY (allocation_id,operation_id) REFERENCES source_smart.allocation_plans(allocation_id,operation_id) ON DELETE CASCADE
);