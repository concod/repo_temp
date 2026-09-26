--liquibase formatted sql
--changeset konakandla.sujan@impactanalytics.co:ph_scheduler_store_mapping_partition stripComments:false splitStatements:false context:liquibase_project_start labels:partition
--comment: initial changeset for ph_scheduler_store_mapping table
CREATE TABLE inventory_smart.ph_scheduler_store_mapping (
  ph_code int4 NOT NULL,
  article varchar NOT NULL,
  channel varchar NOT NULL,
  store_code varchar NULL,
  l0_name varchar NOT NULL,
  scheduler_code int8 NULL,
  is_active bool NULL DEFAULT true,
  created_by int4 NOT NULL,
  updated_by int4 NULL,
  created_at timestamptz NULL DEFAULT now(),
  updated_at timestamptz NULL DEFAULT now(),
  CONSTRAINT ph_scheduler_store_mapping_uk UNIQUE (article, channel, store_code, l0_name),
  CONSTRAINT ph_scheduler_store_mapping_scheduler_code_fk FOREIGN KEY (scheduler_code) REFERENCES inventory_smart.alloc_rule_master(rule_code) ON DELETE SET NULL
)
PARTITION BY LIST (l0_name);

CREATE TABLE inventory_smart.ph_scheduler_store_mapping_33mensapparel PARTITION OF inventory_smart. ph_scheduler_store_mapping FOR VALUES IN ('33-MENS APPAREL');
CREATE TABLE inventory_smart.ph_scheduler_store_mapping_44womensapparel PARTITION OF inventory_smart. ph_scheduler_store_mapping FOR VALUES IN ('44-WOMENS APPAREL');
CREATE TABLE inventory_smart.ph_scheduler_store_mapping_51accessoriesandfragrance PARTITION of inventory_smart. ph_scheduler_store_mapping  FOR VALUES IN ('51-ACCESSORIES AND FRAGRANCE');
CREATE TABLE inventory_smart.ph_scheduler_store_mapping_61childrens PARTITION OF inventory_smart. ph_scheduler_store_mapping FOR VALUES IN ('61-CHILDRENS');
CREATE TABLE inventory_smart.ph_scheduler_store_mapping_70home PARTITION OF  inventory_smart. ph_scheduler_store_mapping FOR VALUES IN ('70-HOME');
CREATE TABLE inventory_smart.ph_scheduler_store_mapping_82antiquesandvintage PARTITION of inventory_smart. ph_scheduler_store_mapping  FOR VALUES IN ('82-ANTIQUES AND VINTAGE');
CREATE TABLE inventory_smart.ph_scheduler_store_mapping_85finejewelryandwatches PARTITION of inventory_smart. ph_scheduler_store_mapping  FOR VALUES IN ('85-FINE JEWELRY AND WATCHES');
CREATE TABLE inventory_smart.ph_scheduler_store_mapping_92concessionbusinesses PARTITION of inventory_smart. ph_scheduler_store_mapping  FOR VALUES IN ('92-CONCESSION BUSINESSES');
CREATE TABLE inventory_smart.ph_scheduler_store_mapping_94generic PARTITION of inventory_smart. ph_scheduler_store_mapping  FOR VALUES IN ('94-GENERIC');
CREATE TABLE inventory_smart.ph_scheduler_store_mapping_95shortagegroup PARTITION of inventory_smart. ph_scheduler_store_mapping  FOR VALUES IN ('95-SHORTAGE GROUP');
CREATE TABLE inventory_smart.ph_scheduler_store_mapping_97creativeservices PARTITION OF  inventory_smart. ph_scheduler_store_mapping FOR VALUES IN ('97-CREATIVE SERVICES');
CREATE TABLE inventory_smart.ph_scheduler_store_mapping_81innovation PARTITION OF inventory_smart. ph_scheduler_store_mapping FOR VALUES IN ('81-INNOVATION');
