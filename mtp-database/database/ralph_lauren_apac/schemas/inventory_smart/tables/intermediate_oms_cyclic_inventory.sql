--liquibase formatted sql
--changeset liquibase:intermediate_oms_cyclic_inventory stripComments:false splitStatements:false context:MTP-17787 labels:MTP-17787
--comment: initial changeset for intermediate_oms_cyclic_inventory
create table inventory_smart.intermediate_oms_cyclic_inventory (
	UPC varchar null,
	CREATEDATE timestamptz null,
	ORIGIN_SOURCE varchar null,
	SOURCE_WHSE int4 null,
	ATS_TOT_QTY float4 null,
	BATCH_NUMBER varchar null,
	STATUS varchar null
);
--changeset adeshkumar:intermediate_oms_cyclic_inventory stripComments:false splitStatements:false context:MTP-17787 labels:MTP-17787
--comment: renaming col 'ATS_TOT_QTY' to 'oh'
ALTER TABLE inventory_smart.intermediate_oms_cyclic_inventory RENAME COLUMN ATS_TOT_QTY TO oh;

--changeset adeshkumar:intermediate_oms_cyclic_inventory_2 stripComments:false splitStatements:false context:MTP-31783 labels:MTP-31783
--comment: MTP-31783-high-frequency-feed-EMEA
ALTER TABLE inventory_smart.intermediate_oms_cyclic_inventory DROP COLUMN IF exists status;
ALTER TABLE inventory_smart.intermediate_oms_cyclic_inventory add column if not exists ean text;
ALTER TABLE inventory_smart.intermediate_oms_cyclic_inventory add column if not exists process_date text;
ALTER TABLE inventory_smart.intermediate_oms_cyclic_inventory ALTER COLUMN createdate TYPE text;
ALTER TABLE inventory_smart.intermediate_oms_cyclic_inventory add column if not exists process_type text;
ALTER TABLE inventory_smart.intermediate_oms_cyclic_inventory ALTER COLUMN source_whse TYPE int8;
ALTER TABLE inventory_smart.intermediate_oms_cyclic_inventory add column if not exists ats_rls_qty float;
ALTER TABLE inventory_smart.intermediate_oms_cyclic_inventory add column if not exists total_records int8;
ALTER TABLE inventory_smart.intermediate_oms_cyclic_inventory ALTER COLUMN batch_number TYPE int8 USING batch_number::int8;
ALTER TABLE inventory_smart.intermediate_oms_cyclic_inventory add column if not exists process_status int8;