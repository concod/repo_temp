--liquibase formatted sql
--changeset arshad.k@impactanalytics.co:tb_lock_and_hold_def stripComments:false splitStatements:false context:Release_1_0 labels:MTP-49552
--comment: initial changeset for tb_lock_and_hold_def

CREATE TABLE meta_schema.tb_lock_and_hold_def (
	id bigserial NOT NULL,
	display_label varchar(50) NOT NULL,
	remarks text NULL,
	kpi_id int4 NOT NULL,
	CONSTRAINT tb_lock_and_hold_def_id_key UNIQUE (id),
	CONSTRAINT tb_lock_and_hold_def_pkey PRIMARY KEY (display_label)
);
CREATE INDEX fki_fk_lockand_hold_kpi_id ON meta_schema.tb_lock_and_hold_def USING btree (kpi_id);


-- meta_schema.tb_lock_and_hold_def foreign keys

ALTER TABLE meta_schema.tb_lock_and_hold_def ADD CONSTRAINT fk_lockand_hold_kpi_id FOREIGN KEY (kpi_id) REFERENCES meta_schema.tb_kpi_master(id);