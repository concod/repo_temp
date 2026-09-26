--liquibase formatted sql
--changeset shaik.azmathulla :health_checkup_logs stripComments:false splitStatements:false context:Db_health_checkup labels:Db_health_checkup
--comment: storing the health check up logs

CREATE TABLE IF NOT EXISTS global.health_checkup_logs
(
	log_id serial primary key,
	health_checkup_id int NOT NULL,
	status varchar(1) NULL,
	started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	completed_at TIMESTAMPTZ null,
	duration INTERVAL GENERATED ALWAYS AS (completed_at - started_at) STORED,
	log_result jsonb null ,
	CONSTRAINT health_checkup_logs_health_checkup_id_fk FOREIGN KEY (health_checkup_id)
	REFERENCES global.health_checkup_master (health_checkup_id) MATCH SIMPLE
	ON UPDATE NO ACTION
	ON DELETE CASCADE
);

ALTER TABLE  global.health_checkup_logs 
ADD CONSTRAINT health_checkup_logs_status_check CHECK (status = 'P' OR status = 'S' OR status = 'F'); 