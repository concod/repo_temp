--liquibase formatted sql
--changeset liquibase:oms_po_rebalance_drafts stripComments:false splitStatements:false context:Release_1 labels:MTP-80219
--comment: initial changeset for oms_po_rebalance_drafts






-- inventory_smart.oms_po_rebalance_drafts definition

-- Drop table

-- DROP TABLE inventory_smart.oms_po_rebalance_drafts;

CREATE TABLE inventory_smart.oms_po_rebalance_drafts (
	transfer_id serial4 NOT NULL,
	l6_id varchar(255) NULL,
	l6_name varchar(255) NULL,
	"size" varchar(255) NULL,
	fiscal_year_week varchar(255) NULL,
	po_source varchar(255) NULL,
	po_destination varchar(255) NULL,
	transfer int4 NULL,
	savetype varchar(255) NULL,
	CONSTRAINT oms_po_rebalance_drafts_pkey PRIMARY KEY (transfer_id)
);


--changeset aman.pareek@impactanalytics.co:oms_po_rebalance_drafts_chg1 stripComments:false splitStatements:false context:MTP-86820 labels:mtp-86820
--comment: added column
ALTER TABLE "inventory_smart".oms_po_rebalance_drafts ADD COLUMN IF NOT EXISTS total_trans_recom int ;
ALTER TABLE "inventory_smart".oms_po_rebalance_drafts ADD COLUMN IF NOT EXISTS rem_tranfer int ;
ALTER TABLE "inventory_smart".oms_po_rebalance_drafts ADD COLUMN IF NOT EXISTS source_po_unit_bef_rebal int ;
ALTER TABLE "inventory_smart".oms_po_rebalance_drafts ADD COLUMN IF NOT EXISTS source_po_unit_aft_rebal int ;
ALTER TABLE "inventory_smart".oms_po_rebalance_drafts ADD COLUMN IF NOT EXISTS source_dc_inv_bop_bef_allo int ;
ALTER TABLE "inventory_smart".oms_po_rebalance_drafts ADD COLUMN IF NOT EXISTS source_dc_inv_bop_aft_allo int ;
ALTER TABLE "inventory_smart".oms_po_rebalance_drafts ADD COLUMN IF NOT EXISTS dest_po_unit_bef_rebal int ;
ALTER TABLE "inventory_smart".oms_po_rebalance_drafts ADD COLUMN IF NOT EXISTS dest_po_unit_aft_rebal int ;
ALTER TABLE "inventory_smart".oms_po_rebalance_drafts ADD COLUMN IF NOT EXISTS dest_dc_inv_bop_bef_allo int ;
ALTER TABLE "inventory_smart".oms_po_rebalance_drafts ADD COLUMN IF NOT EXISTS dest_dc_inv_bop_aft_allo int ;

--changeset aman.pareek@impactanalytics.co:oms_po_rebalance_drafts_chg2 stripComments:false splitStatements:false context:MTP-87677 labels:mtp-87677
--comment: added column for approved_by and approved_at
ALTER TABLE "inventory_smart".oms_po_rebalance_drafts ADD COLUMN IF NOT EXISTS approved_by varchar(255) ;
ALTER TABLE "inventory_smart".oms_po_rebalance_drafts ADD COLUMN IF NOT EXISTS approved_at timestamp default current_timestamp;