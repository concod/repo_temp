--liquibase formatted sql
--changeset vamsi.balaga@impactanalytics.co:tb_marketing_support_config  stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for tb_marketing_support_config
CREATE TABLE price_promo.tb_marketing_support_config (
	id serial4 NOT NULL,
	"name" varchar NOT NULL,
	CONSTRAINT tb_marketing_support_config_pk PRIMARY KEY (id)
);