--liquibase formatted sql
--changeset aniruddh.singh:asn_master stripComments:false splitStatements:false context:pacsun_inv_smart labels:ASN
--comment: initial changeset for asn_master
CREATE TABLE IF NOT EXISTS inventory_smart.asn_master (
	asn_code varchar NOT NULL,
	asn_id varchar NOT NULL,
	asn_item varchar NOT NULL,
	po_code varchar NOT NULL,
	po_id varchar NOT NULL,
	po_item varchar NOT NULL,
	requirement_date date NOT NULL,
	channel varchar NOT NULL,
	available_qty int4 NULL,
	dc_code int4 NOT NULL,
	pack_type_id varchar NULL,
	article varchar NULL,
	number_of_allocations int4 NULL
);

--changeset sreevathsa.sp:asn_master_columns_change stripComments:false splitStatements:false context:pacsun_inv_smart labels:pacsun_asn_master_columns_change
--comment: asn_master_columns_change
alter table inventory_smart.asn_master add column if not exists handling_type varchar null;
alter table inventory_smart.asn_master add column if not exists receiver_number varchar null;
alter table inventory_smart.asn_master add column if not exists not_before_date date null;
alter table inventory_smart.asn_master add column if not exists allocated_qty int4 null;
alter table inventory_smart.asn_master alter column po_item drop not null ;
alter table inventory_smart.asn_master alter column asn_item drop not null ;

--changeset sreevathsa.sp:asn_master_add_columns stripComments:false splitStatements:false context:pacsun_inv_smart labels:pacsun_asn_master_add_columns
--comment: adding vi_date to asn_master
ALTER TABLE inventory_smart.asn_master ADD COLUMN if not exists vi_date DATE null;

--changeset sreevathsa.sp:asn_master_add_columns_asn_flag stripComments:false splitStatements:false context:pacsun_inv_smart labels:pacsun_asn_master_add_columns_asn_flag
--comment: adding asn_to to asn_master
ALTER TABLE inventory_smart.asn_master ADD COLUMN if not exists active_asn_flag bool null;

--changeset abijithsarath.menon:req_date_change_v1 stripComments:false splitStatements:false context:pacsun_inv_smart labels:pacsun_asn_master_add_columns_asn_flag
--comment: changing constraint for requirement date 
ALTER TABLE inventory_smart.asn_master
ALTER COLUMN requirement_date DROP NOT NULL;

--changeset abijithsarath.menon:req_date_change_v2 stripComments:false splitStatements:false context:pacsun_inv_smart labels:pacsun_asn_master_add_columns_asn_flag
--comment: changing constraint for requirement date 
ALTER TABLE inventory_smart.asn_master ADD COLUMN if not exists appointment_date date null;