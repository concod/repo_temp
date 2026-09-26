--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_upload_download_request stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing_restaurant.bp_upload_download_request


CREATE TABLE base_pricing_restaurant.bp_upload_download_request (
	id serial4 NOT NULL,
	file_link text NOT NULL,
	upload_download_type text NOT NULL,
	created_by varchar(255) NOT NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	expires_at timestamp NULL,
	CONSTRAINT bp_upload_download_request_pkey PRIMARY KEY (id)
);