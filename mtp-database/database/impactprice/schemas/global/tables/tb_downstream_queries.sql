
--liquibase formatted sql
--changeset surya.avinash@impactanalytics.co:tb_downstream_queries stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_downstream_queries

CREATE TABLE "global".tb_downstream_queries (
	id serial4 NOT NULL,
	query text NULL,
	CONSTRAINT tb_downstream_queries_pk PRIMARY KEY (id)
);