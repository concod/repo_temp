--liquibase formatted sql
--changeset liquibase:Activity Logs stripComments:false splitStatements:false context:MTP-43803 labels:liquibase_project_start
--comment: initial changeset for activity_logs
CREATE TABLE assort.activity_logs (
	activity_id serial4 NOT NULL,
	actor_id int4 NOT NULL,
	object_id int4 NULL,
	object_type varchar(255) NULL,
	resource varchar(255) NOT NULL,
	status_code int4 NOT NULL,
	request_type varchar(10) NOT NULL,
	created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	response_time float8 NULL,
	ip_address varchar(45) NULL,
	user_agent varchar(255) NULL,
	request_body text NULL,
	response_body text NULL,
	CONSTRAINT activity_logs_pkey PRIMARY KEY (activity_id)
);