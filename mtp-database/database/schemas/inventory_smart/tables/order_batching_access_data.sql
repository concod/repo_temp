--liquibase formatted sql
--changeset shreyansh.pandey@impactanalytics.co:order_batching_access_data_schema_fixed_1 stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:liquibase_project_start
--comment: First changeset for order_batching_access_data

CREATE TABLE inventory_smart.order_batching_access_data (
    id int4 GENERATED ALWAYS AS IDENTITY (
        INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START 1 CACHE 1 NO CYCLE
    ) NOT NULL,
    hierarchies jsonb NULL,
    hierarchy_hash text NULL,
    locked_flag bool DEFAULT true NULL,
    locked_by_user_id int4 NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    expire_by timestamptz NULL,
    notifyee _int4 DEFAULT ARRAY[]::integer[] NULL,
    status integer,
    CONSTRAINT order_batching_access_data_pkey PRIMARY KEY (id),
    CONSTRAINT fk_locked_by_user FOREIGN KEY (locked_by_user_id) REFERENCES global.user_master(user_code)
);

--changeset osho.sharma@impactanalytics.co:order_batching_access_data_add_status_column stripComments:false splitStatements:false context:Release_1_1
--comment: Adding status column to order_batching_access_data for lock validation

ALTER TABLE inventory_smart.order_batching_access_data
ADD COLUMN IF NOT EXISTS status integer NULL;

--changeset shreyansh.pandey@impactanalytics.co:ph_configuration_mapping stripComments:false splitStatements:false context:Release_1_1 labels:MTP-24756
--comment: auto_allocation_status column added
ALTER TABLE inventory_smart.order_batching_access_data
DROP COLUMN locked_flag;
