
--liquibase formatted sql
--changeset liquibase:tb_kpi_config stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
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


--changeset saran.srirama@impactanalytics.co:tb_kpi_config_alter_2 stripComments:false splitStatements:false context:Release_1_2 labels:mtp-38202
--comment: added some mew columns
ALTER TABLE meta_schema.tb_kpi_config DROP COLUMN editable_flow_lock_id;
ALTER TABLE meta_schema.tb_kpi_config
ADD COLUMN lock_and_hold_id int4 NULL,
ADD COLUMN editable bool NULL,
ADD COLUMN "default" bool NULL,
ADD COLUMN visible bool NULL,
ADD COLUMN match_with_all bool NULL,
ADD COLUMN single_match_with bool NULL,
ADD COLUMN is_actualized bool NULL,
ADD COLUMN variance_visible bool NULL,
ADD COLUMN variance_editable bool NULL,
ADD COLUMN class_to_dept_visible bool NULL,
ADD COLUMN class_to_dept_editable bool NULL,
ADD COLUMN class_to_channel_visible bool NULL,
ADD COLUMN class_to_channel_editable bool NULL,
ADD COLUMN class_to_class_visible bool NULL,
ADD COLUMN class_to_class_editable bool null;


ALTER TABLE meta_schema.tb_kpi_config DROP CONSTRAINT tb_kpi_config_pkey;

ALTER TABLE meta_schema.tb_kpi_config ADD CONSTRAINT tb_kpi_config_pkey PRIMARY KEY (kpi_id, attribute_id);

ALTER TABLE meta_schema.tb_kpi_config ADD CONSTRAINT fk_lock_and_hold_id FOREIGN KEY (lock_and_hold_id) REFERENCES meta_schema.tb_lock_and_hold_def(id) ON DELETE RESTRICT ON UPDATE RESTRICT;
CREATE INDEX fki_fk_lock_and_hold_id ON meta_schema.tb_kpi_config USING btree (lock_and_hold_id);
ALTER TABLE meta_schema.tb_kpi_config ALTER COLUMN ranking DROP NOT NULL;
ALTER TABLE meta_schema.tb_kpi_config ALTER COLUMN kpi_type DROP NOT NULL;


--changeset saran.srirama@impactanalytics.co:tb_kpi_config_alter_3 stripComments:false splitStatements:false context:Release_1_2 labels:mtp-38202
--comment: added one new column 
ALTER TABLE meta_schema.tb_kpi_config ADD COLUMN contribution_editable_version VARCHAR[] DEFAULT '{}'::VARCHAR[];

--changeset arshad.k@impactanalytics.co:tb_kpi_config_alter_5 stripComments:false splitStatements:false context:Release_1_2
--comment: added new column 
ALTER TABLE meta_schema.tb_kpi_config ADD COLUMN IF NOT EXISTS is_advance_lock boolean DEFAULT false;
ALTER TABLE meta_schema.tb_kpi_config ADD COLUMN remarks TEXT;
ALTER TABLE meta_schema.tb_kpi_config ADD COLUMN IF NOT EXISTS eligible boolean;
ALTER TABLE meta_schema.tb_kpi_config ADD COLUMN IF NOT EXISTS first_week_editable boolean;
ALTER TABLE meta_schema.tb_kpi_config ADD COLUMN IF NOT EXISTS version integer;
ALTER TABLE meta_schema.tb_kpi_config ADD COLUMN IF NOT EXISTS kpi_selector_enabled boolean;
ALTER TABLE meta_schema.tb_kpi_config ADD COLUMN IF NOT EXISTS roundoff integer;

--changeset arshad.k@impactanalytics.co:tb_kpi_config_alter_ stripComments:false splitStatements:false context:Release_1_2
--comment: added new column 
ALTER TABLE meta_schema.tb_kpi_config ADD COLUMN is_point_variance boolean DEFAULT false;