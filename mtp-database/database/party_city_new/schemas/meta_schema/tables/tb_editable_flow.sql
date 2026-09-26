--liquibase formatted sql
--changeset arshad.k@impactanalytics.co:tb_editable_flow stripComments:false splitStatements:false context:Release_1_0 labels:MTP-49552
--comment: initial changeset for tb_editable_flow

CREATE TABLE meta_schema.tb_editable_flow (
	id serial4 NOT NULL,
	attribute_id int4 NOT NULL,
	kpi_id int4 NOT NULL,
	editable_flow jsonb NOT NULL,
	"lock" varchar NULL,
	fe_consumable_no_rank_flow jsonb NULL,
	CONSTRAINT tb_editable_flow_id_key UNIQUE (id)
);


-- meta_schema.tb_editable_flow foreign keys

ALTER TABLE meta_schema.tb_editable_flow ADD CONSTRAINT fk_tb_editable_flow_kpi FOREIGN KEY (kpi_id) REFERENCES meta_schema.tb_kpi_master(id);