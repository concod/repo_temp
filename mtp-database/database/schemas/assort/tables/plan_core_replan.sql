--liquibase formatted sql
--changeset liquibase:plan_core_replan stripComments:false splitStatements:false context:MTP-2990 labels:liquibase_project_start
--comment: initial changeset for plan_core_replan
CREATE TABLE assort.plan_core_replan (
	core_replen_id serial4 NOT NULL,
	levels jsonb NOT NULL,
	attribute_value jsonb NOT NULL,
	CONSTRAINT plan_core_replan_pk PRIMARY KEY (core_replen_id)
);