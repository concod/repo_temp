--liquibase formatted sql
--changeset liquibase:store_master stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for store_master
CREATE TABLE "global".store_master (
	store_code varchar NOT NULL,
	store_name varchar NOT NULL,
	store_description text NULL,
	active bool NOT NULL DEFAULT true,
	special_classification varchar NULL,
	created_at timestamptz NULL DEFAULT now(),
	updated_at timestamptz NULL DEFAULT now(),
	created_by int4 NULL,
	updated_by int4 NULL,
	dc_code int4 NULL,
	fc_code int4 NULL,
	is_deleted bool NULL DEFAULT false,
	CONSTRAINT dc_fc_code_check CHECK (((
CASE
    WHEN (dc_code IS NULL) THEN 0
    ELSE 1
END +
CASE
    WHEN (fc_code IS NULL) THEN 0
    ELSE 1
END) <> 2)),
	CONSTRAINT store_code_check CHECK (((length((store_code)::text) > 0) AND (length(regexp_replace((store_code)::text, '[a-zA-Z0-9\-\.\w]+'::text, ''::text, 'g'::text)) = 0))),
	CONSTRAINT store_master_pk PRIMARY KEY (store_code)
);
ALTER TABLE "global".store_master ADD CONSTRAINT store_master_created_by_fk FOREIGN KEY (created_by) REFERENCES "global".user_master(user_code) ON DELETE SET NULL;
ALTER TABLE "global".store_master ADD CONSTRAINT store_master_fc_fk FOREIGN KEY (fc_code) REFERENCES "global".fulfilment_centres(fc_code) ON UPDATE SET NULL;
ALTER TABLE "global".store_master ADD CONSTRAINT store_master_updated_by_fk FOREIGN KEY (updated_by) REFERENCES "global".user_master(user_code) ON DELETE SET NULL;
