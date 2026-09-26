--liquibase formatted sql
--changeset liquibase:app_metrics_config stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_kpi_config
CREATE TABLE meta_schema.tb_kpi_config (
	id serial4 NOT NULL,
	attribute_id int4 NOT NULL,
	kpi_id int4 NOT NULL,
	category_id int4 NOT NULL,
	"order" int4 NOT NULL,
	ranking int4 NOT NULL,
	kpi_type int4 NOT NULL,
	"label" varchar NULL,
	editable_flow_lock_id int4 NULL,
	formatter_id int4 NULL,
	is_deleted bool NULL DEFAULT false,
	condition_formatting_id int4 NULL DEFAULT 1,
	extra jsonb NULL,
	is_default_visible bool NULL,
	bucket_id int4 NULL,
	CONSTRAINT tb_kpi_config_id_key UNIQUE (id),
	CONSTRAINT tb_kpi_config_pkey PRIMARY KEY (attribute_id, kpi_id),
	CONSTRAINT fk_tb_kpi_config_editable_flow_lock_id FOREIGN KEY (editable_flow_lock_id) REFERENCES meta_schema.tb_editable_flow(id),
	CONSTRAINT fk_tb_kpi_config_format_id FOREIGN KEY (formatter_id) REFERENCES meta_schema.tb_format_master(id),
	CONSTRAINT fk_tb_kpi_config_kpi FOREIGN KEY (kpi_id) REFERENCES meta_schema.tb_kpi_master(id)
);

--changeset arvindar.prasad@impactanalytics.co:tb_kpi_config_alter_1 stripComments:false splitStatements:false context:Release_1_1 labels:MTP-37186
--comment: added a new column contribution_editable_version 
ALTER TABLE meta_schema.tb_kpi_config ADD COLUMN contribution_editable_version VARCHAR[] DEFAULT '{}'::VARCHAR[];

--changeset abhishek.kohli@impactanalytics.co:tb_kpi_config_alter_4 stripComments:false splitStatements:false context:Release_1_3 labels:MTP-42225
--comment: added one new column
alter table meta_schema.tb_kpi_config add column is_advance_lock bool default false; 

--changeset abhishek.kohli@impactanalytics.co:tb_kpi_config_alter_4 stripComments:false splitStatements:false context:Release_1_3 labels:mtp-43592
--comment: added one new column 
ALTER TABLE meta_schema.tb_kpi_config ADD column remarks VARCHAR(50);

--changeset abhishek.kohli@impactanalytics.co:tb_kpi_config_alter_4 stripComments:false splitStatements:false context:Release_1_3 labels:MTP-45396
--comment: added three new columns 
ALTER TABLE meta_schema.tb_kpi_config 
ADD COLUMN eligible bool DEFAULT TRUE, 
ADD COLUMN first_week_editable bool DEFAULT FALSE,


--changeset archa.prakash@impactanalytics.co:tb_kpi_config_alter_5 stripComments:false splitStatements:false context:Release_1_4 labels:version
--comment: added three new columns 
ALTER TABLE meta_schema.tb_kpi_config 
ADD COLUMN "version" int4 NOT NULL DEFAULT '-1'::integer;


--changeset archa.prakash@impactanalytics.co:tb_kpi_config_alter_6 stripComments:false splitStatements:false context:Release_1_4 labels:sector
--comment: added two new columns 
ALTER TABLE meta_schema.tb_kpi_config 
ADD COLUMN kpi_selector_enabled bool NULL DEFAULT TRUE,
ADD COLUMN roundoff int4 NULL;

