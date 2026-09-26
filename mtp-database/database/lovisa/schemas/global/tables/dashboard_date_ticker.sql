--liquibase formatted sql
--changeset swapnil.bhange:dashboard_date_ticker stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for dashboard_date_ticker

CREATE TABLE "global".dashboard_date_ticker (
	attribute_type varchar NOT NULL DEFAULT 'dashboard_date_ticker'::character varying,
	attribute_value jsonb NULL,
	CONSTRAINT dashboard_date_ticker_pkey PRIMARY KEY (attribute_type)
);