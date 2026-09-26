--liquibase formatted sql
--changeset liquibase:request_dependencies stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for request_dependencies
CREATE TABLE "cache".request_dependencies (
	req_code int4 NOT NULL,
	dep_name varchar NOT NULL,
	tu int8 NOT NULL DEFAULT 0,
	ti int8 NOT NULL DEFAULT 0,
	td int8 NOT NULL DEFAULT 0,
	thu int8 NOT NULL DEFAULT 0,
	lt int8 NOT NULL DEFAULT 0,
	dt int8 NOT NULL DEFAULT 0,
	CONSTRAINT request_dependencies_pk PRIMARY KEY (req_code, dep_name),
	CONSTRAINT request_dependencies_fk FOREIGN KEY (req_code) REFERENCES "cache".request_tracker(req_code) ON DELETE CASCADE ON UPDATE RESTRICT
);
