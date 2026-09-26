--liquibase formatted sql
--changeset gauri.nair@impactanalytics.co:asn_to_allocate_alert_version stripComments:false splitStatements:false context:Release_1_0 labels:asn_to_allocate_alert_version
--comment: initial changeset for asn_to_allocate_alert_version

CREATE TABLE inventory_smart.asn_to_allocate_alert_version (
	version_code int4 NOT NULL,
	asn_id varchar NOT NULL,
	article varchar NOT NULL,
	l0_name varchar NOT NULL,
	l1_name varchar NOT NULL,
	l2_name varchar NOT NULL,
	l3_name varchar NOT NULL,
	l4_name varchar NOT NULL,
	style_color_desc varchar NOT NULL,
	department varchar NOT NULL,
	subdepartment varchar NOT NULL,
	"class" varchar NOT NULL,
	subclass varchar NOT NULL,
	"style" varchar NOT NULL,
	color_id_name varchar NOT NULL,
	vendor varchar NOT NULL,
	sizes_mat varchar NOT NULL,
	oh float4 NOT NULL,
	oo float4 NOT NULL,
	it float4 NOT NULL,
	pack_type_id varchar NOT NULL,
	active_asn_flag bool NULL,
	asn_qty float4 NOT NULL,
	sizes_count int4 NOT NULL,
	oh_dc float4 NOT NULL,
	forecast_over_target_wos float4 NOT NULL,
	delivery_date date NOT NULL,
	store_count_asn int4 NOT NULL,
	store_count_article int4 NOT NULL,
	ata_is_resolved int4 NOT NULL,
	at_is_resolved int4 NOT NULL,
	CONSTRAINT asn_to_allocate_alert_version_un UNIQUE (version_code, asn_id, article, pack_type_id),
	CONSTRAINT asn_to_allocate_alert_version_code_fk FOREIGN KEY (version_code) REFERENCES "global"."versioning"(version_code) ON DELETE CASCADE
)
PARTITION BY LIST (version_code);