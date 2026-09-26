-- liquibase formatted sql
-- changeset aman.lakkoju:po_sku_exclusion_list stripComments:false splitStatements:false context: db_sync labels:po_sku_exclusion_list
-- comment: initial changeset for po_sku_exclusion_list

CREATE TABLE inventory_smart.po_sku_exclusion_list (
	allocation_type	Varchar	Null,
    country	Varchar	Null,
    channel	Varchar	Null,
    brand Varchar Null,
    sbu	Varchar	Null,
    department Varchar Null,
    collection_total Varchar Null,
    clearance_flag Varchar Null,
    po_code	Varchar	Null,
    auto_approve_flag Bool Null,
    style Varchar Null,
    style_rn Varchar Null,
    tag	Varchar	Null
);