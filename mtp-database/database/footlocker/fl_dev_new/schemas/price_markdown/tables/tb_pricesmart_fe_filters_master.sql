--liquibase formatted sql
--changeset durgaprasad.tulugu@impactanalytics.co:tb_pricesmart_fe_filters_master_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment:tb_pricesmart_fe_filters_master_1


CREATE TABLE price_markdown.tb_pricesmart_fe_filters_master (
	fc_code int4 NOT NULL,
	screen_name varchar NOT NULL,
	column_names_mapping jsonb NULL,
	CONSTRAINT tb_pricesmart_fe_filters_master_pkey PRIMARY KEY (fc_code)
);
