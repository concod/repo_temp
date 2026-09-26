--liquibase formatted sql
--changeset liquibase:downstream_logs stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for downstream_logs

-- DROP TABLE IF EXISTS inventory_smart.downstream_logs;
CREATE TABLE IF NOT EXISTS inventory_smart.downstream_logs (
	unique_id varchar NOT NULL,
	type varchar NOT NULL,
	status varchar NOT NULL,
	created_by int4 NULL,
	created_at timestamptz DEFAULT now() NOT null,
    updated_by int4 NULL,
    updated_at timestamptz DEFAULT now() NOT null,
    CONSTRAINT unique_id_pk PRIMARY KEY (unique_id,type),
	CONSTRAINT invs_downstream_logs_created_by_fk FOREIGN KEY (created_by) REFERENCES "global".user_master(user_code) ON DELETE SET NULL,
    CONSTRAINT invs_downstream_logs_updated_by_fk FOREIGN KEY (updated_by) REFERENCES "global".user_master(user_code) ON DELETE SET NULL
);

CREATE INDEX downstream_logs_unique_id_idx ON inventory_smart.downstream_logs USING btree (unique_id);