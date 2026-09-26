--liquibase formatted sql
--changeset samarjit.mazumder@impactanalytics.co:kpi_table stripComments:false splitStatements:false context:Release_1_0 labels:sm_kpi_table
--comment: initial changeset for kpi_table

CREATE TABLE IF NOT EXISTS inventory_smart.kpi_table (
  l0_name varchar NOT NULL,
  l1_name varchar NULL,
  l2_name varchar NULL,
  l3_name varchar NULL,
  l4_name varchar NULL,
  s1_name varchar NULL,
  s2_name varchar NULL,
  channel varchar NOT NULL,
  oh float null,
  oh_it float null,
  oh_oo_it float null,
  fwos float null,
  fwos_oh float null,
  fwos_oh_it float null,
  size_integrity float null,
  size_integrity_oh_it float null,
  size_integrity_oh_oo_it float null,
  product_group varchar  NULL,
  store_group varchar  NULL
);


--changeset samridhi.gupta@impactanalytics.co:store_code added stripComments:false splitStatements:false context:Release_1_0 labels:sm_loss_units1
--comment: lost_units column datatype change changeset for store_code
ALTER TABLE inventory_smart.kpi_table ADD COLUMN IF NOT EXISTS store_code varchar;