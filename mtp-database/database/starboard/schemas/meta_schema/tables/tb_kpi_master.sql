--liquibase formatted sql
--changeset jaya.khandelwal@impactanalytics.co:tb_kpi_master stripComments:false splitStatements:false context:Release_1_0 labels:MTP-36859
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



--changeset saran.srirama@impactanalytics.co:tb_kpi_master_chg1 stripComments:false splitStatements:false context:Release_1_0 labels:mtp-38202
--comment: added column application_id and 1 constraints
ALTER TABLE meta_schema.tb_kpi_master ADD COLUMN application_id int4 NULL;
ALTER TABLE meta_schema.tb_kpi_master ADD CONSTRAINT fk_application_id_kpi_master FOREIGN KEY (application_id) REFERENCES meta_schema.tb_applications(id);
CREATE INDEX fki_fk_application_id_kpi_master ON meta_schema.tb_kpi_master USING btree (application_id);

--changeset archa.prakash@impactanalytics.co:tb_kpi_master_chg2 stripComments:false splitStatements:false context:Release_1_1 labels:new-col-default
--comment: added column default_value 
ALTER TABLE meta_schema.tb_kpi_master ADD COLUMN default_value int4 NULL;

--changeset abhishek.kohli@impactanalytics.co:tb_kpi_master_chg2 stripComments:false splitStatements:false context:Release_1_1 labels:mtp-42993
--comment: added column default_value
ALTER TABLE meta_schema.tb_kpi_master DROP COLUMN IF EXISTS default_value;
ALTER TABLE meta_schema.tb_kpi_master ADD COLUMN default_value INT;

--changeset abhishek.kohli@impactanalytics.co:tb_kpi_master_chg3 stripComments:false splitStatements:false context:Release_1_2 labels:mtp-46666
--comment: added columns is_delivered,type,parent_kpi and fk constraint
ALTER TABLE meta_schema.tb_kpi_master ADD COLUMN if not exists is_delivered bool default false;
ALTER TABLE meta_schema.tb_kpi_master ADD COLUMN if not exists type varchar(50) ;
ALTER TABLE meta_schema.tb_kpi_master ADD COLUMN if not exists parent_kpi int ;
ALTER TABLE meta_schema.tb_kpi_master ADD CONSTRAINT tb_kpi_master_tb_kpi_master_fk FOREIGN KEY (parent_kpi) REFERENCES meta_schema.tb_kpi_master(id);

--changeset arshad.k@impactanalytics.co:tb_kpi_master_chg4 stripComments:false splitStatements:false context:Release_1_2 labels:mtp-46666
--comment: added columns is_custom
ALTER TABLE meta_schema.tb_kpi_master ADD COLUMN IF NOT EXISTS is_custom boolean DEFAULT false;