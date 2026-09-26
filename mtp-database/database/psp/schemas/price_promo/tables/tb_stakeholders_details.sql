--liquibase formatted sql
--changeset shrrayan.sheel@impactanalytics.co:tb_stakeholders_details stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: Initial changeset for price_promo.tb_stakeholders_details

CREATE TABLE price_promo.tb_stakeholders_details (
	id serial4 NOT NULL,
	"name" varchar NOT NULL,
	email varchar NOT NULL,
	stakeholder_status_id int2 NOT NULL,
	CONSTRAINT tb_stakeholders_details_pkey PRIMARY KEY (id),
	CONSTRAINT tb_stakeholders_details_ukey UNIQUE ("name", email, stakeholder_status_id)
);
