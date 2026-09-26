--liquibase formatted sql
--changeset himansh.bhardwaj:due_in_alert_version stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for due_in_alert_version

CREATE TABLE inventory_smart.due_in_alert_version (
    version_code int4 NOT NULL,
    po_code varchar NOT NULL,
    l7_code varchar(50) NULL,
    article varchar NULL,
    color varchar NULL,
    l3_name varchar NULL,
    l4_name varchar NULL,
    l5_name varchar NULL,
    l6_name varchar(50) NULL,
    fiscal_year int4 NULL,
    fiscal_week int4 NULL,
    available_due_in_to_allocate float4 NULL,
    "action" varchar NULL,
    dc_mapped varchar NULL,
    due_in_alert_is_resolved int4 NULL,
    due_in_alert_flag int4 NULL,
    l0_name varchar NULL,
    l2_name varchar NULL,
    article_description varchar NULL,
    display_article varchar NULL,
    product_group varchar[] NULL,
    l1_name varchar NULL,
    dc_assignment varchar NULL,
    CONSTRAINT due_in_alert_version_pk PRIMARY KEY (version_code, po_code)
)
PARTITION BY LIST (version_code);

-- inventory_smart.due_in_alert_version foreign keys

ALTER TABLE inventory_smart.due_in_alert_version ADD CONSTRAINT due_in_alert_version_code_fk FOREIGN KEY (version_code) REFERENCES "global"."versioning"(version_code) ON DELETE CASCADE;

--changeset himansh.bhardwaj@impactanalytics.co:adding_lifecycle_and_mfp stripComments:false splitStatements:false context:Release_1 labels:Custom_Migration_Technique
--comment: adding_lifecycle_and_mfp
ALTER TABLE inventory_smart.due_in_alert_version 
ADD COLUMN IF NOT EXISTS lifecycle varchar NULL,
ADD COLUMN IF NOT EXISTS mfp_categorization varchar NULL;