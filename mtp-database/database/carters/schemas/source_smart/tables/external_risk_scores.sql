--liquibase formatted sql
--changeset liquibase:external_risk_scores stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for external_risk_scores
CREATE TABLE source_smart.external_risk_scores (
	entity_type varchar(255) NULL,
	entity_id varchar(255) NOT NULL,
	geopolitical_score numeric NULL,
	tariff_risk numeric NULL,
	risk_flags varchar(255) NULL,
	last_updated_date date NULL,
	CONSTRAINT ers_pk PRIMARY KEY (entity_id)
);