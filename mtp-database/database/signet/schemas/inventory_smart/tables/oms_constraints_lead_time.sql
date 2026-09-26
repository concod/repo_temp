--liquibase formatted sql
--changeset liquibase:oms_constraints_lead_time stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for oms_constraints_lead_time
CREATE TABLE inventory_smart.oms_constraints_lead_time (
  id serial4 NOT NULL,
  product_code varchar NOT NULL,
  loc_code varchar NOT NULL,
  vendor_code varchar NOT NULL,
  lead_time int4 NOT NULL,
  variance float8 NOT NULL,
  created_by varchar NOT NULL,
  created_at timestamptz NOT NULL,
  updated_by varchar NULL,
  updated_at timestamptz NULL,
  CONSTRAINT pk_oms_constraints_lead_time PRIMARY KEY (vendor_code, loc_code, product_code)
);
  