--liquibase formatted sql
--changeset linu.nazil:dynamic_ddl_for_replication stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for dynamic_ddl_for_replication
create table if not exists global.dynamic_ddl_for_replication(
    tablename varchar not null,
    dynamic_def text not null,
    hash_value varchar not null,
    created_by varchar not null,
    created_at timestamptz DEFAULT now() NOT null,
    CONSTRAINT dynamic_def_hash PRIMARY KEY (hash_value)
);

--changeset ashish:dynamic_ddl_for_replication_end stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: end changeset for dynamic_ddl_for_replication
drop table if exists global.dynamic_ddl_for_replication cascade;
