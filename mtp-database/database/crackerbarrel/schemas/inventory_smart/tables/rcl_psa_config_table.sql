--liquibase formatted sql
--changeset liquibase:rcl_psa_config_table_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: intial changeset for rcl_psa_config_table
create table if not exists inventory_smart.rcl_psa_config_table(
    id int4 not null, 
    l0_name varchar not null, 
    psa_name varchar not null, 
    psa_code varchar not null, 
    updated_at timestamptz default now(),
    constraint psa_config_table_pk primary key (l0_name, psa_code)
);

--changeset liquibase:rcl_psa_config_table_2 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: intial changeset for rcl_psa_config_table


ALTER TABLE inventory_smart.rcl_psa_config_table ADD COLUMN IF NOT EXISTS l1_name varchar; 

ALTER TABLE inventory_smart.rcl_psa_config_table DROP CONSTRAINT IF EXISTS psa_config_table_pk;
ALTER TABLE inventory_smart.rcl_psa_config_table ADD CONSTRAINT psa_config_table_pk PRIMARY KEY (l0_name, l1_name, psa_code);

--changeset linu.nazil:rcl_master_v4 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: modified changeset for rcl_master
create sequence if not exists inventory_smart.rcl_psa_config_table_id_seq;
alter table "inventory_smart".rcl_psa_config_table alter column id SET DEFAULT nextval('inventory_smart.rcl_psa_config_table_id_seq');

--changeset linu.nazil:rcl_psa_config_table_2 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: intial changeset for rcl_psa_config_table
ALTER TABLE inventory_smart.rcl_psa_config_table ADD COLUMN IF NOT EXISTS sub_psa_code varchar NULL;

--changeset linu.nazil:rcl_psa_config_table_3 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: intial changeset for rcl_psa_config_table
ALTER TABLE inventory_smart.rcl_psa_config_table ALTER COLUMN psa_name DROP NOT NULL; 

--changeset linu.nazil:rcl_psa_config_table_4 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: intial changeset for rcl_psa_config_table
ALTER TABLE inventory_smart.rcl_psa_config_table 
ADD COLUMN IF NOT EXISTS l2_name varchar NULL,
ADD COLUMN IF NOT EXISTS primary_trait_desc varchar NULL,
ADD COLUMN IF NOT EXISTS l3_name varchar NULL;
ALTER TABLE inventory_smart.rcl_psa_config_table DROP CONSTRAINT IF EXISTS psa_config_table_pk;
ALTER TABLE inventory_smart.rcl_psa_config_table ADD CONSTRAINT psa_config_table_pk PRIMARY KEY (l0_name, l1_name, l2_name, primary_trait_desc, l3_name, psa_code);
