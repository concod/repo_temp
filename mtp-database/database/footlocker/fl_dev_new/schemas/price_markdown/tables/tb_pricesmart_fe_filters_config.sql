--liquibase formatted sql
--changeset durgaprasad.tulugu@impactanalytics.co:tb_pricesmart_fe_filters_config_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment:tb_pricesmart_fe_filters_config_1

CREATE TABLE price_markdown.tb_pricesmart_fe_filters_config (
	fc_code int4 NOT NULL,
	filter_key varchar NOT NULL,
	filter_name text NOT NULL,
	filter_order int4 NOT NULL,
	filter_type text NULL,
	api_end_point text NULL,
	section_type text NULL,
	section_title text NULL,
	is_mandatory bool NULL,
	is_multi_select bool NULL,
	is_cascade bool NULL,
	is_cross_group_cacade bool DEFAULT false NULL,
	select_on_load bool NULL,
	start_date_delta int4 NULL,
	end_date_delta int4 NULL,
	dynamic_options json NULL,
	CONSTRAINT tb_pricesmart_fe_filters_config_pkey PRIMARY KEY (fc_code, filter_order),
	CONSTRAINT tb_pricesmart_fe_filters_config_fc_code_fkey FOREIGN KEY (fc_code) REFERENCES price_markdown.tb_pricesmart_fe_filters_master(fc_code)
);


--changeset durgaprasad.tulugu@impactanalytics.co:changed_the_column_dynamic_options_type stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: changed the column dynamic_options type.
ALTER TABLE price_markdown.tb_pricesmart_fe_filters_config ALTER COLUMN dynamic_options TYPE jsonb USING dynamic_options::jsonb::jsonb;
