--liquibase formatted sql
--changeset liquibase:plan_master stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for plan_master
CREATE TABLE assort.plan_master (
    plan_code serial4 NOT NULL,
    name varchar NOT NULL,
    description text,
    selling_period_sdate date NOT NULL,
    selling_period_edate date NOT NULL,
    status smallint DEFAULT 0 NOT NULL,
    compare_year smallint DEFAULT '-1'::integer NOT NULL,
    special_classification varchar,
    is_deleted boolean DEFAULT false NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now(),
    created_by integer,
    updated_by integer,
    steps numeric(2,1) DEFAULT 1.1 NOT NULL,
    channel varchar[] DEFAULT '{}'::varchar[] NOT NULL,
    hierarchy_level varchar NOT NULL,
    CONSTRAINT assort_plan_egs CHECK ((selling_period_edate > selling_period_sdate))
);
ALTER TABLE assort.plan_master
    ADD CONSTRAINT assort_plan_master_pkey PRIMARY KEY (plan_code);
ALTER TABLE assort.plan_master
    ADD CONSTRAINT assort_plan_master_created_by_fk FOREIGN KEY (created_by) REFERENCES global.user_master(user_code) ON DELETE SET NULL;
ALTER TABLE assort.plan_master
    ADD CONSTRAINT assort_plan_master_updated_by_fk FOREIGN KEY (updated_by) REFERENCES global.user_master(user_code) ON DELETE SET NULL;
ALTER TABLE assort.plan_master ADD constraint plan_master_un  UNIQUE (name);


--changeset pradiksha.k@impactanalytics.co:plan_master_1 stripComments:false splitStatements:false context:MTP-23511 labels:liquibase_project_start
--comment: added a new column plan_sub_step

ALTER TABLE assort.plan_master
ADD plan_sub_step varchar NULL
DEFAULT 'l2_budget_table';
