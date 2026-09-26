--liquibase formatted sql
--changeset hisham.mohammed@impactanalytics.co:data_insights_registry stripComments:false splitStatements:false context:Release_1_1 labels:liquibase_project_start
--comment: initial changeset for data_insights_registry

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE data_platform.data_insights_registry (
    tenant TEXT NOT NULL,
    "tables" TEXT[] not null,
    user_question TEXT NOT NULL,
    python_function TEXT,
    embedding vector(384) NOT NULL 
);

CREATE INDEX IF NOT EXISTS data_insights_neighbours
ON data_platform.data_insights_registry
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
ANALYZE data_platform.data_insights_registry;
