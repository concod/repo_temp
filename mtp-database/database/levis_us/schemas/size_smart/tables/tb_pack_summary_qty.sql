
-- liquibase formatted sql
-- changeset akashkumar.rana@impactanalytics.co:tb_pack_summary_qty_modification_changes stripComments:false splitStatements:false context:tb_pack_summary_qty_modification_changes labels:tb_pack_summary_qty_modification_changes
-- comment: updated changeset for tb_pack_summary_qty

CREATE TABLE size_smart.tb_pack_summary_qty (
	id serial4 NOT NULL,
	pack_summary_id int4 NULL,
	prepack_id varchar NULL,
	sizes jsonb NULL,
	pack_qty numeric NULL,
	num_of_pack numeric NULL,
	unit_per_pack numeric NULL,
	is_manual bool DEFAULT false NULL,
	CONSTRAINT tb_pack_summary_qty_pkey PRIMARY KEY (id),
	CONSTRAINT tb_pack_summary_qty_pack_summary_id_fkey FOREIGN KEY (pack_summary_id) REFERENCES size_smart.tb_pack_summary_buy(id) ON DELETE CASCADE
);