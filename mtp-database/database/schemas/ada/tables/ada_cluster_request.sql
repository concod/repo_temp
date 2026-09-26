--liquibase formatted sql
--changeset liquibase:ada_cluster_request stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for ada_cluster_request
CREATE TABLE ada.ada_cluster_request (
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    created_by integer,
    metrics json,
    time_period_start date,
    time_period_end date,
    status character varying,
    id character varying NOT NULL,
    name character varying,
    message character varying
);
ALTER TABLE ada.ada_cluster_request
    ADD CONSTRAINT ada_cluster_request_pk PRIMARY KEY (id);
