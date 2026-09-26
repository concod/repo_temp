--liquibase formatted sql
--changeset jaya.khandelwal@impactanalytics.co:tb_kpi_config stripComments:false splitStatements:false context:Release_1_0 labels:MTP-36859
--comment: initial changeset for tb_kpi_config
CREATE TABLE meta_schema.tb_kpi_config (
	id serial NOT NULL,
	attribute_id int4 NOT NULL,
	kpi_id int4 NOT NULL,
	category_id int4 NOT NULL,
	"order" int4 NOT NULL,
	ranking int4 NULL,
	kpi_type int4 NULL,
	"label" varchar NULL,
	lock_and_hold_id int4 NULL,
	formatter_id int4 NULL,
	is_deleted bool NULL DEFAULT false,
	condition_formatting_id int4 NULL DEFAULT 1,
	extra jsonb NULL,
	is_default_visible bool NULL,
	bucket_id int4 NULL,
	editable bool NULL,
	"default" bool NULL,
	visible bool NULL,
	match_with_all bool NULL,
	single_match_with bool NULL,
	is_actualized bool NULL,
	variance_visible bool NULL,
	variance_editable bool NULL,
	class_to_dept_visible bool NULL,
	class_to_dept_editable bool NULL,
	class_to_channel_visible bool NULL,
	class_to_channel_editable bool NULL,
	class_to_class_visible bool NULL,
	class_to_class_editable bool NULL,
	CONSTRAINT tb_kpi_config_id_key UNIQUE (id),
	CONSTRAINT tb_kpi_config_pkey PRIMARY KEY (kpi_id, attribute_id),
	CONSTRAINT fk_lock_and_hold_id FOREIGN KEY (lock_and_hold_id) REFERENCES meta_schema.tb_lock_and_hold_def(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
	CONSTRAINT fk_tb_kpi_config_format_id FOREIGN KEY (formatter_id) REFERENCES meta_schema.tb_format_master(id),
	CONSTRAINT fk_tb_kpi_config_kpi FOREIGN KEY (kpi_id) REFERENCES meta_schema.tb_kpi_master(id)
);
CREATE INDEX fki_fk_lock_and_hold_id ON meta_schema.tb_kpi_config USING btree (lock_and_hold_id);

--changeset arvindar.prasad@impactanalytics.co:tb_kpi_config_alter_1 stripComments:false splitStatements:false context:Release_1_1 labels:MTP-37186
--comment: added a new column contribution_editable_version 
ALTER TABLE meta_schema.tb_kpi_config ADD COLUMN contribution_editable_version VARCHAR[] DEFAULT '{}'::VARCHAR[];
