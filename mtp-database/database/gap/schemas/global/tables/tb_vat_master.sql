--liquibase formatted sql
--changeset liquibase:tb_vat_master stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_vat_master

CREATE TABLE "global".tb_vat_master (
	"Country" text NULL,
	vat_percentage float4 NULL,
	l0_cid int4 NULL,
	CONSTRAINT tb_vat_master_pk PRIMARY KEY (l0_cid)
);

--changeset siddharth.bajpai@impactanalytics.co:drop_l0_cid_add_s0_id stripComments:false splitStatements:false context:Release_1_0 labels:tb_vat_master
--comment: drop l0_cid and add s0_id

ALTER TABLE global.tb_vat_master DROP COLUMN IF EXISTS l0_cid;
ALTER TABLE global.tb_vat_master ADD COLUMN IF NOT EXISTS s0_id int4 NOT NULL;

--changeset siddharth.bajpai@impactanalytics.co:fix_tb_vat_master_pk_20251216 stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:tb_vat_master
--comment: Fix primary key to use s0_id to match dev DB DDL

ALTER TABLE "global".tb_vat_master DROP CONSTRAINT IF EXISTS tb_vat_master_pk CASCADE;
ALTER TABLE "global".tb_vat_master ADD CONSTRAINT tb_vat_master_pk PRIMARY KEY (s0_id);