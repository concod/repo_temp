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
