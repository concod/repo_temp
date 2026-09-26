--liquibase formatted sql
--changeset raja.duraisamy@impactanalytics.co:client_base stripComments:false splitStatements:false context:Release_1_0 labels:MTP-38338
--comment: initial changeset for client_base

CREATE TABLE forecast_smart.client_base (
	client varchar NULL,
	brand varchar NULL,
	geography varchar NULL,
	stores varchar NULL,
	channel varchar NULL,
	workstream varchar(100) NULL
);
