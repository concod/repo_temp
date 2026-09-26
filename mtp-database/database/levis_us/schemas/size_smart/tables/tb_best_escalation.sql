-- liquibase formatted sql
-- changeset akashkumar.rana@impactanalytics.co:tb_best_escalation_modifications stripComments:false splitStatements:false context:FINAL-SIZE-SMART-SCHEMA-MODIFICATIONS labels:FINAL-SIZE-SMART-SCHEMA-MODIFICATIONS 
-- comment: initial changeset for tb_best_escalation

CREATE TABLE  size_smart.tb_best_escalation (
	l0_name varchar NOT NULL,
	l2_name varchar NOT NULL,
	l3_name varchar NOT NULL,
	best_group varchar NOT NULL,
	best_escalation varchar NOT NULL,
	created_at timestamptz DEFAULT now() NULL,
	updated_at timestamptz DEFAULT now() NULL,
	CONSTRAINT tb_best_escalation_pkey PRIMARY KEY (l0_name, l2_name, l3_name)
);