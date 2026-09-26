--liquibase formatted sql
--changeset shaik.azmathulla :health_checkup_summary stripComments:false splitStatements:false context:Db_health_checkup labels:Db_health_checkup
--comment: storing the health check up summary

CREATE TABLE IF NOT EXISTS global.health_checkup_summary 
(
	summary_id SERIAL not null,
	health_checkup_id INT not null,
	max_log_id INT NOT NULL,
	summary_date DATE not null,
	health_summary INT not null
);

--changeset kamalesh.k@impactanalytics.co:health_checkup_summary stripComments:false splitStatements:false context:Db_health_checkup labels:Db_health_checkup
--comment: primary key for health_checkup_summary

ALTER TABLE global.health_checkup_summary
ADD CONSTRAINT health_checkup_summary_pkey PRIMARY KEY (summary_id);