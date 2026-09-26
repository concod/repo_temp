--liquibase formatted sql
--changeset liquibase:action_status_enum stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for action_status_enum

CREATE TYPE price_markdown."action_status_enum" AS ENUM (
	'Approved',
	'Declined',
	'Withdrawn',
	'Accepted IA reco',
	'Auto-Discount Roll-over',
	'No Action');