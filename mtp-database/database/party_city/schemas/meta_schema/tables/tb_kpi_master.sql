--liquibase formatted sql
--changeset arvindar.prasad@impactanalytics.co:tb_kpi_master stripComments:false splitStatements:false context:Release_1_0 labels:MTP-39134
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
	CONSTRAINT tb_kpi_master_id_key UNIQUE (id),
	CONSTRAINT table_columns_mst_fk FOREIGN KEY (column_id) REFERENCES meta_schema.tb_table_columns_mst(id)
);
