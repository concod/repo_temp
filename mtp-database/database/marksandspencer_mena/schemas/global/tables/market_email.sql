--liquibase formatted sql
--changeset liquibase:market_email stripComments:false splitStatements:false context:Release_1_0 labels:first_version
--comment: initial changeset for market_email
CREATE TABLE global.market_email (
	market varchar NULL,
	email varchar NOT NULL,
	CONSTRAINT market_email_pkey PRIMARY KEY (email)
);