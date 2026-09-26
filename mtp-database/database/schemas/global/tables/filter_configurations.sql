--liquibase formatted sql
--changeset liquibase:filter_configurations stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for filter_configurations
CREATE TABLE "global".filter_configurations (
	fc_code serial4 NOT NULL,
	"name" varchar NOT NULL,
	screens _varchar NOT NULL DEFAULT ARRAY[]::character varying[],
	is_deleted bool NOT NULL DEFAULT false,
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now(),
	created_by int4 NULL,
	updated_by int4 NULL,
	special_classification varchar NULL,
	description text NULL,
	application int4 NULL,
	CONSTRAINT fil_c_name_check CHECK ((length((name)::text) > 0)),
	CONSTRAINT ufc_pk PRIMARY KEY (fc_code),
	CONSTRAINT filter_configurations_created_by_fk FOREIGN KEY (created_by)
        REFERENCES global.user_master (user_code) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE SET NULL,
    CONSTRAINT filter_configurations_updated_at_fk FOREIGN KEY (updated_by)
        REFERENCES global.user_master (user_code) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE SET NULL
);

--changeset arnab.nandy@impactanalytics.co:filter_configurations_dimension_column stripComments:false splitStatements:false context:MTP-28616 labels:MTP-28616
--comment: creating dimension column of type text[]
ALTER TABLE global.filter_configurations
ADD COLUMN dimensions text[];

--changeset shreeraksha.n@impactanalytics.co:filter_configurations_is_tool_edited stripComments:false splitStatements:false context:MTP-111455 labels:MTP-111455
--comment: creating is_tool_edited column of type boolean
ALTER TABLE global.filter_configurations
ADD COLUMN is_tool_edited BOOLEAN DEFAULT FALSE;