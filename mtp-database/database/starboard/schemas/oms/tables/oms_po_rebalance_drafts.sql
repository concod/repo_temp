--liquibase formatted sql
--changeset liquibase:oms_po_rebalance_drafts stripComments:false splitStatements:false context:Release_1 labels:MTP-98998
--comment: initial changeset for oms_po_rebalance_drafts

CREATE TABLE oms.oms_po_rebalance_drafts (
	transfer_id serial4 NOT NULL,
	article varchar(255) NULL,
	style_desc varchar(255) NULL,
	"size" varchar(255) NULL,
	fiscal_year_week varchar(255) NULL,
	po_source varchar(255) NULL,
	po_destination varchar(255) NULL,
	transfer int4 NULL,
	savetype varchar(255) NULL,
	total_trans_recom int4 NULL,
	rem_tranfer int4 NULL,
	source_po_unit_bef_rebal int4 NULL,
	source_po_unit_aft_rebal int4 NULL,
	source_dc_inv_bop_bef_allo int4 NULL,
	source_dc_inv_bop_aft_allo int4 NULL,
	dest_po_unit_bef_rebal int4 NULL,
	dest_po_unit_aft_rebal int4 NULL,
	dest_dc_inv_bop_bef_allo int4 NULL,
	dest_dc_inv_bop_aft_allo int4 NULL,
	approved_by varchar(255) NULL,
	approved_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	po_item_source varchar(255) NULL,
	po_item_destination varchar(255) NULL,
	CONSTRAINT oms_po_rebalance_drafts_pkey PRIMARY KEY (transfer_id)
);