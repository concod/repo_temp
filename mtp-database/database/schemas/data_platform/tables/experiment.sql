--liquibase formatted sql
--changeset manoj.solanki@impactanalytics.co:experiment stripComments:false splitStatements:false context:Release_1_1 labels:liquibase_project_start
--comment: initial changeset for experiment
CREATE TABLE IF NOT EXISTS data_platform.experiment
(
    experiment_id serial4 NOT NULL, 
    experiment_name character varying  NOT NULL,
    config_id integer NOT NULL,
    workstream_id integer NOT NULL,
    result_id character varying ,
    status character varying ,
    result json,
    progress integer,
    created_by integer NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_by integer,
    updated_at timestamp with time zone,
    deleted_by integer,
    deleted_at timestamp with time zone,
    is_deleted boolean NOT NULL DEFAULT false,
    is_finalized boolean NOT NULL DEFAULT false,
    module_id integer NOT NULL,
    CONSTRAINT experiment_pk PRIMARY KEY (experiment_id),
    CONSTRAINT experiment_type_uk UNIQUE (config_id, workstream_id),
	CONSTRAINT module_fk FOREIGN KEY (module_id) REFERENCES global.module_master(module_code) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE,
    CONSTRAINT config_fk FOREIGN KEY (config_id)
        REFERENCES data_platform.config (config_id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE,
    CONSTRAINT workstream_fk FOREIGN KEY (workstream_id)
        REFERENCES data_platform.workstream (workstream_id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE
);


CREATE UNIQUE INDEX IF NOT EXISTS experiment_finalize_uk
    ON data_platform.experiment USING btree
    (workstream_id ASC NULLS LAST, module_id ASC NULLS LAST)
    WHERE is_finalized = true;
	

CREATE UNIQUE INDEX IF NOT EXISTS experiment_name_uk
    ON data_platform.experiment USING btree
    (experiment_name ASC NULLS LAST)
    WHERE is_deleted = false;