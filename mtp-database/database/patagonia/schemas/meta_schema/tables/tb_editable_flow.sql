--liquibase formatted sql
--changeset jaya.khandelwal@impactanalytics.co:tb_editable_flow  stripComments:false splitStatements:false context:Release_1_0 labels:MTP-36859
--comment: initial changeset for tb_editable_flow 
CREATE TABLE meta_schema.tb_editable_flow (
	id serial4 NOT NULL,
	attribute_id int4 NOT NULL,
	kpi_id int4 NOT NULL,
	editable_flow jsonb NOT NULL,
	"lock" varchar(50) NULL,
	fe_consumable_no_rank_flow jsonb NULL,
	CONSTRAINT tb_editable_flow_id_key UNIQUE (id),
	CONSTRAINT fk_tb_editable_flow_kpi FOREIGN KEY (kpi_id) REFERENCES meta_schema.tb_kpi_master(id)
);