--liquibase formatted sql
--changeset liquibase:tb_download_jobs_id_seq stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_download_jobs_id_seq

CREATE SEQUENCE IF NOT EXISTS config_schema.tb_download_jobs_id_seq
    INCREMENT BY 1
    MINVALUE 1
    MAXVALUE 2147483647
    START WITH 1
    NO CYCLE;

--changeset liquibase:tb_download_jobs stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_download_jobs

CREATE TABLE config_schema.tb_download_jobs (
	id integer DEFAULT nextval('config_schema.tb_download_jobs_id_seq'::regclass) NOT NULL,
	config_id integer NOT NULL,
	user_id varchar(100),
	user_email varchar(255),
	status varchar(20) DEFAULT 'pending'::character varying NOT NULL,
	request_data jsonb NOT NULL,
	result_file_name varchar(255),
	result_row_count integer,
	error_message text,
	started_at timestamp without time zone,
	completed_at timestamp without time zone,
	created_at timestamp without time zone DEFAULT now() NOT NULL,
	updated_at timestamp without time zone DEFAULT now(),
	result_download_url text,
	CONSTRAINT tb_download_jobs_pkey PRIMARY KEY (id),
	CONSTRAINT tb_download_jobs_config_id_fkey FOREIGN KEY (config_id) REFERENCES config_schema.tb_download_configurations(id)
);
CREATE INDEX idx_download_jobs_config_id ON config_schema.tb_download_jobs USING btree (config_id);
CREATE INDEX idx_download_jobs_status ON config_schema.tb_download_jobs USING btree (status);
CREATE INDEX idx_download_jobs_user_id ON config_schema.tb_download_jobs USING btree (user_id);
