--liquibase formatted sql
--changeset arshad.k@impactanalytics.co:tb_kpi_config stripComments:false splitStatements:false context:Release_1_0 labels:MTP-49552
--comment: initial changeset for tb_kpi_config

CREATE TABLE meta_schema.tb_kpi_config (
	id serial4 NOT NULL,
	attribute_id int4 NOT NULL,
	kpi_id int4 NOT NULL,
	category_id int4 NOT NULL,
	"order" int4 NOT NULL,
	ranking int4 NULL,
	kpi_type int4 NULL,
	"label" varchar NULL,
	lock_and_hold_id int4 NULL,
	formatter_id int4 NULL,
	is_deleted bool DEFAULT false NULL,
	condition_formatting_id int4 DEFAULT 1 NULL,
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
	contribution_editable_version _varchar DEFAULT '{}'::character varying[] NULL,
	is_advance_lock bool DEFAULT true NULL,
	remarks varchar NULL,
	eligible bool DEFAULT true NULL,
	first_week_editable bool DEFAULT false NULL,
	CONSTRAINT tb_kpi_config_id_key UNIQUE (id),
	CONSTRAINT tb_kpi_config_pkey PRIMARY KEY (kpi_id, attribute_id)
);
CREATE INDEX fki_fk_lock_and_hold_id ON meta_schema.tb_kpi_config USING btree (lock_and_hold_id);


-- meta_schema.tb_kpi_config foreign keys

ALTER TABLE meta_schema.tb_kpi_config ADD CONSTRAINT fk_lock_and_hold_id FOREIGN KEY (lock_and_hold_id) REFERENCES meta_schema.tb_lock_and_hold_def(id) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE meta_schema.tb_kpi_config ADD CONSTRAINT fk_tb_kpi_config_format_id FOREIGN KEY (formatter_id) REFERENCES meta_schema.tb_format_master(id);
ALTER TABLE meta_schema.tb_kpi_config ADD CONSTRAINT fk_tb_kpi_config_kpi FOREIGN KEY (kpi_id) REFERENCES meta_schema.tb_kpi_master(id);

--changeset abhijeet.grahwal@impactanalytics.co:tb_bucket_master_alter_1 stripComments:false splitStatements:false context:Release_1_1 labels:MTP-49531
--comment: added a new column
ALTER TABLE meta_schema.tb_kpi_config ADD display_label varchar(50) NULL;