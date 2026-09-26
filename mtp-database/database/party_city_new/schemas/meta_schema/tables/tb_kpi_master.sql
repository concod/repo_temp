--liquibase formatted sql
--changeset arshad.k@impactanalytics.co:tb_kpi_master stripComments:false splitStatements:false context:Release_1_0 labels:MTP-49552
--comment: initial changeset for tb_kpi_master

CREATE TABLE meta_schema.tb_kpi_master (
	id serial4 NOT NULL,
	"name" varchar(50) NULL,
	column_id int4 NULL,
	remarks varchar(200) NULL,
	is_active bool NULL,
	created_at timestamp NULL,
	updated_at timestamp NULL,
	created_by int4 NULL,
	updated_by int4 NULL,
	is_percent bool NULL,
	is_relex bool NULL,
	is_for_optimization bool NULL,
	application_id int4 NULL,
	default_value int4 NULL,
	is_delivered bool DEFAULT false NULL,
	"type" varchar(50) NULL,
	parent_kpi int4 NULL,
	CONSTRAINT tb_kpi_master_id_key UNIQUE (id)
);


-- meta_schema.tb_kpi_master foreign keys

ALTER TABLE meta_schema.tb_kpi_master ADD CONSTRAINT fk_application_id_kpi_master FOREIGN KEY (application_id) REFERENCES meta_schema.tb_applications(id);
ALTER TABLE meta_schema.tb_kpi_master ADD CONSTRAINT table_columns_mst_fk FOREIGN KEY (column_id) REFERENCES meta_schema.tb_table_columns_mst(id);
ALTER TABLE meta_schema.tb_kpi_master ADD CONSTRAINT tb_kpi_master_tb_kpi_master_fk FOREIGN KEY (parent_kpi) REFERENCES meta_schema.tb_kpi_master(id);