--liquibase formatted sql
--changeset liquibase:strategy_approval_status_enum stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for strategy_approval_status_enum

CREATE TYPE price_markdown."strategy_approval_status_enum" AS ENUM (
	'Not Approved',
	'Initially Approved',
	'Finally Approved'
);
