--liquibase formatted sql
--changeset raja.duraisamy@impactanalytics.co:client_base stripComments:false splitStatements:false context:Release_1_0 labels:MTP-37010
--comment: initial changeset for client_base

CREATE TABLE forecast_smart.client_base (
	client varchar(50) NULL,
	brand varchar(50) NULL,
	geography varchar(50) NULL,
	stores varchar(50) NULL,
	channel varchar(50) NULL
);
