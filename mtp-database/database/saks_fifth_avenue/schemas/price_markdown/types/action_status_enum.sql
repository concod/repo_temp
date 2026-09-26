--liquibase formatted sql
--changeset liquibase:action_status_enum stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for action_status_enum

CREATE TYPE price_markdown."action_status_enum" AS ENUM (
	'Approved',
	'Declined',
	'Withdrawn',
	'Accepted IA reco',
	'Auto-Discount Roll-over');

--changeset surya.avinash@impactanalytics.co:action_status_enum_add_no_action_value stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: add no action in action_status_enum
ALTER TYPE price_markdown."action_status_enum" ADD VALUE 'No Action';