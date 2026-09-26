--liquibase formatted sql
--changeset vamsi.balaga@impactanalytics.co:tb_override_reason  stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for tb_override_reason

CREATE TABLE price_promo.tb_override_reason (
	id serial4 NOT NULL,
	reason text NULL,
	CONSTRAINT tb_override_reason_pkey PRIMARY KEY (id)
);

