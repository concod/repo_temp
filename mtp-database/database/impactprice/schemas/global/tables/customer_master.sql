--liquibase formatted sql
--changeset sriraj.varanasi@impactanalytics.co:actual_forex_rate  stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for actual_forex_rate

CREATE TABLE IF NOT EXISTS "global".customer_master (
	c0_name text NULL,
	c0_id int4 NULL,
	c1_name text NULL,
	c1_id int4 NULL,
	c2_name text NULL,
	c2_id int4 NULL,
	customer_id int4 NOT NULL,
	customer_name text NULL,
	CONSTRAINT pk_customer_master PRIMARY KEY (customer_id)
);

--changeset divyasree.bingimalla@impactanalytics.co:customer_master  stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for customer_master

ALTER TABLE "global".customer_master
ADD COLUMN customer_reco_level text
GENERATED ALWAYS AS (
    (
        COALESCE(c0_id::text, '1') || '_' ||
        COALESCE(c1_id::text, '1') || '_' ||
        COALESCE(c2_id::text, '1')
    )
) STORED;

--changeset siddharth.bajpai@impactanalytics.co:fix_customer_master_reco_level_20251216 stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:customer_master
--comment: Fix customer_reco_level generated column expression to match dev DB DDL

ALTER TABLE "global".customer_master DROP COLUMN IF EXISTS customer_reco_level CASCADE;
ALTER TABLE "global".customer_master
ADD COLUMN customer_reco_level text GENERATED ALWAYS AS ((((COALESCE(c0_id::text, '1'::text) || '_'::text) || COALESCE(c1_id::text, '1'::text)) || '_'::text) || COALESCE(c2_id::text, '1'::text)) STORED NULL;