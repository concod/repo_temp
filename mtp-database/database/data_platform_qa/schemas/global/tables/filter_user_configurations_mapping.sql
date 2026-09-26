--liquibase formatted sql
--changeset chaitanyaprasad.reddy@impactanalytics.co:filter_user_configurations_mapping stripComments:false splitStatements:false context:mtp-18795 labels:added new constrains for filter_user_configurations_mapping using alter statement
--comment: added new constrains for filter_user_configurations_mapping using alter statement
CREATE TABLE "global".filter_user_configurations_mapping (
	fuc_code serial4 NOT NULL,
	fuc_name varchar NOT NULL,
	screen_code int4 NOT NULL,
	is_default boolean default false,
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now(),
	created_by int4 NULL,
	updated_by int4 NULL,
	attribute_value varchar NOT NULL,
	CONSTRAINT fuc_pk PRIMARY KEY (fuc_code),
	CONSTRAINT tab_c_name_check CHECK ((length((fuc_name)::text) > 0)),
    CONSTRAINT filter_user_configurations_updated_at_fk FOREIGN KEY (updated_by) REFERENCES "global".user_master(user_code) ON DELETE SET null,
	CONSTRAINT filter_user_configurations_created_by_fk FOREIGN KEY (created_by) REFERENCES "global".user_master(user_code) ON DELETE SET NULL,
	CONSTRAINT filter_user_configurations_screen_code_fk FOREIGN KEY (screen_code) REFERENCES "global".screen_master(screen_code) ON DELETE SET NULL
);

--changeset chaitanyaprasad.reddy:MTP-20620 stripComments:false splitStatements:false context:Release_1_0 labels:MTP-20620
--comment: added new constrains for filter_user_configurations_mapping
ALTER TABLE "global".filter_user_configurations_mapping ADD CONSTRAINT check_same_user_values CHECK ((created_by = updated_by));
ALTER TABLE "global".filter_user_configurations_mapping ADD CONSTRAINT unique_name_check UNIQUE (fuc_name, created_by, screen_code);


--changeset chaitanyaprasad.reddy:MTP-25938_new_column stripComments:false splitStatements:false context:Release_1_0 labels:MTP-25938_new_column
--comment: added new column is_broadcast for filter_user_configurations_mapping
ALTER TABLE "global".filter_user_configurations_mapping ADD COLUMN is_broadcast BOOLEAN DEFAULT FALSE;

--changeset chaitanyaprasad.reddy:MTP-28130_MTP_28133 stripComments:false splitStatements:false context:Release_1_0 labels:MTP-28130_MTP_28133
--comment: added new column is_default_to_users for filter_user_configurations_mapping to support default option for global config
ALTER TABLE "global".filter_user_configurations_mapping ADD COLUMN IF NOT EXISTS is_default_to_users JSONB;

--changeset abhishek.jha@impactanalytics.co:MTP-61295 stripComments:false splitStatements:false context:Release_1_0 labels:MTP-61295
--comment: Added new column "description" to save and retrieve description when saving filters.  
ALTER TABLE "global".filter_user_configurations_mapping ADD COLUMN description varchar DEFAULT NULL;
