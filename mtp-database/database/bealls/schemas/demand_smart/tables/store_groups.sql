--liquibase formatted sql
--changeset adil.nawaz@impactanalytics.co:store_groups stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start

CREATE TABLE IF NOT EXISTS "demand_smart".store_groups (
    sg_code serial4 NOT NULL,
    sg_name varchar NOT NULL,
    sg_type varchar NOT NULL,
    sg_method varchar NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    created_by varchar(255) NULL,
    updated_by varchar(255) NULL,
    sg_description varchar NULL,
    channel varchar NULL,
    sg_selection_metadata jsonb DEFAULT '{}'::jsonb NOT null,
    CONSTRAINT usg_pk PRIMARY KEY (sg_code)
);

CREATE UNIQUE INDEX IF NOT EXISTS store_groups_name_idx ON demand_smart.store_groups USING btree (sg_name);
ALTER TABLE IF EXISTS "demand_smart".store_groups 
ADD CONSTRAINT store_groups_sg_name_unique UNIQUE (sg_name);

-- "demand_smart".store_groups_sg_code_seq definition

-- DROP SEQUENCE "demand_smart".store_groups_sg_code_seq;

CREATE SEQUENCE IF NOT EXISTS "demand_smart".store_groups_sg_code_seq
    INCREMENT BY 1
    MINVALUE 1
    MAXVALUE 2147483647
    START 1
    CACHE 1
    NO cycle
    OWNED BY demand_smart.store_groups.sg_code;