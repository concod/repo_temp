--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_download_excel_file_links stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.bp_download_excel_file_links

CREATE TABLE base_pricing.bp_download_excel_file_links (
	id bigserial NOT NULL,
	payload json NOT NULL,
	user_id int8 NOT NULL,
	file_location varchar(500) NOT NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT bp_download_excel_file_links_pkey PRIMARY KEY (id)
);