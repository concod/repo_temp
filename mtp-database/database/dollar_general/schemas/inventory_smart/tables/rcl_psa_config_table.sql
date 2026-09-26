--liquibase formatted sql
--changeset liquibase:rcl_psa_config_table stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: intial changeset for rcl_psa_config_table
create table if not exists inventory_smart.rcl_psa_config_table(
    id int4 not null, 
    l0_name varchar not null, 
    l1_name varchar not null,
    l3_name varchar not null,
    l4_name varchar not null,
    psa_name varchar not null, 
    psa_code varchar not null, 
    updated_at timestamptz default now(),
    constraint psa_config_table_pk primary key (l0_name, l1_name, l3_name, l4_name, psa_code)
);

--changeset linu.nazil:rcl_master_v4 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: modified changeset for rcl_master
create sequence if not exists inventory_smart.rcl_psa_config_table_id_seq;
alter table "inventory_smart".rcl_psa_config_table alter column id SET DEFAULT nextval('inventory_smart.rcl_psa_config_table_id_seq');

--changeset linu.nazil:rcl_psa_config_table_2 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: intial changeset for rcl_psa_config_table
ALTER TABLE inventory_smart.rcl_psa_config_table ADD COLUMN IF NOT EXISTS l0_id varchar NULL;
ALTER TABLE inventory_smart.rcl_psa_config_table ADD COLUMN IF NOT EXISTS l1_id varchar NULL;
ALTER TABLE inventory_smart.rcl_psa_config_table ADD COLUMN IF NOT EXISTS l3_id varchar NULL;
ALTER TABLE inventory_smart.rcl_psa_config_table ADD COLUMN IF NOT EXISTS l4_id varchar NULL;
ALTER TABLE inventory_smart.rcl_psa_config_table ADD COLUMN IF NOT EXISTS sub_psa_code varchar NULL;

--changeset linu.nazil:rcl_psa_config_table_3 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: intial changeset for rcl_psa_config_table
ALTER TABLE inventory_smart.rcl_psa_config_table ALTER COLUMN psa_name DROP NOT NULL; 