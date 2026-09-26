--liquibase formatted sql
--changeset arvindar.prasad@impactanalytics.co:tb_editableflow_master  stripComments:false splitStatements:false context:Release_1_0 labels:MTP-39134
--comment: initial changeset for tb_editableflow_master
CREATE TABLE meta_schema.tb_editableflow_master (
	on_change_kpi_id int4 NOT NULL,
	lock_and_hold_id int4 NOT NULL,
	kpi_to_calculate int4 NOT NULL,
	calculation_order int4 NOT NULL,
	calculation_formula text NOT NULL,
	formula text NULL,
	product_roll_down text NULL,
	roll_down_channel text NULL,
	roll_up_channel text NULL,
	roll_up_product_hierarchy text NULL,
	roll_up_timeline text NULL,
	roll_down_timeline text NULL,
	CONSTRAINT fk_editable_kpi_to_calculate_kpi_id FOREIGN KEY (kpi_to_calculate) REFERENCES meta_schema.tb_kpi_master(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
	CONSTRAINT fk_editable_lock_and_hold_id FOREIGN KEY (lock_and_hold_id) REFERENCES meta_schema.tb_lock_and_hold_def(id),
	CONSTRAINT fk_editable_on_chanhe_kpi_id FOREIGN KEY (on_change_kpi_id) REFERENCES meta_schema.tb_kpi_master(id) ON DELETE RESTRICT ON UPDATE RESTRICT
);
CREATE INDEX fki_fk_editable_kpi_to_calculate_kpi_id ON meta_schema.tb_editableflow_master USING btree (kpi_to_calculate);
CREATE INDEX fki_fk_editable_lock_and_hold_id ON meta_schema.tb_editableflow_master USING btree (on_change_kpi_id);
CREATE INDEX fki_fk_editable_on_chanhe_kpi_id ON meta_schema.tb_editableflow_master USING btree (on_change_kpi_id);
