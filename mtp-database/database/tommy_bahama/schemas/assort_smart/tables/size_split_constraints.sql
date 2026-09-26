--liquibase formatted sql
--changeset pramodgowda.kl@impactanalytics.co:assort_smart.size_split_constraints stripComments:false splitStatements:false context:MTP-96105 labels:create_table
--comment: initial changeset for size_split_constraints

CREATE TABLE IF NOT EXISTS assort_smart.size_split_constraints (
    id serial8 NOT NULL,
    hierarchy_code VARCHAR NOT NULL,
    final_level VARCHAR NOT NULL,
    season_code INT NOT NULL,
    min_per_size INT NOT NULL DEFAULT 12,
    max_per_size INT,
    pack_per_size INT,
    CONSTRAINT size_split_constraints_pkey PRIMARY KEY (id),
    CONSTRAINT size_split_constraints_unique_key UNIQUE (hierarchy_code, final_level, season_code)
);