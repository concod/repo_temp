--liquibase formatted sql
--changeset liquibase:tb_data_sync_audit_trail stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_data_sync_audit_trail

CREATE TABLE price_promo.tb_data_sync_audit_trail (
	id serial4 NOT NULL,
    event_id int4 NULL,
	promo_sync_direction_status int2 NOT NULL,
	created_by int4 NOT NULL,
	created_at timestamptz NOT NULL,
    execution_status text NOT NULL,
    error text NULL,
    CONSTRAINT tb_data_sync_audit_trail_pkey PRIMARY KEY (id),
    CONSTRAINT chk_execution_status CHECK (execution_status IN ('successful', 'partially successful', 'failed'))
);


--changeset liquibase:tb_data_sync_audit_trail_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: make created_by as null and also set default timestamp

ALTER TABLE price_promo.tb_data_sync_audit_trail
ALTER COLUMN created_by DROP NOT NULL,
ALTER COLUMN created_at TYPE timestamp USING created_at::timestamp,
ALTER COLUMN created_at SET DEFAULT now() at time zone 'UTC';


--changeset liquibase:tb_data_sync_audit_trail_2 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: make created_by as null and also set default timestamp
ALTER TABLE price_promo.tb_data_sync_audit_trail
DROP CONSTRAINT chk_execution_status,
ADD COLUMN status_code int4 DEFAULT 0 NULL,
ADD COLUMN process_id uuid NULL;