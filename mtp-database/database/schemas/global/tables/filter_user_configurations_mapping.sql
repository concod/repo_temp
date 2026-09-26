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

--changeset abhishek.jha@impactanalytics.co:MTP-61295-modify stripComments:false splitStatements:false context:Release_1_0 labels:MTP-61295
--comment: Added new column "description" to save and retrieve description when saving filters.  
ALTER TABLE "global".filter_user_configurations_mapping ADD COLUMN IF NOT EXISTS description varchar DEFAULT NULL;


--changeset akshay.jain@impactanalytics.co:filter_configurations_mapping_modify stripComments:false splitStatements:false context:Release_3 labels:initial changeset for updating constraint
--comment: drop old constraint and new one as delete cascade

ALTER TABLE "global".filter_user_configurations_mapping DROP CONSTRAINT filter_user_configurations_screen_code_fk;

ALTER TABLE "global".filter_user_configurations_mapping ADD CONSTRAINT filter_user_configurations_screen_code_fk FOREIGN KEY (screen_code) REFERENCES "global".screen_master(screen_code) ON DELETE CASCADE;

--changeset srishti.kumari@impactanalytics.co:filter_user_configurations_mapping stripComments:false splitStatements:false context:Release_3 labels:initial changeset for updating constraint
--comment: Added is_deleted column and modified unique constraint to support soft deletes | MTP-95928
ALTER TABLE "global".filter_user_configurations_mapping ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;

ALTER TABLE "global".filter_user_configurations_mapping DROP CONSTRAINT unique_name_check;

ALTER TABLE "global".filter_user_configurations_mapping ADD CONSTRAINT unique_name_check_not_deleted 
EXCLUDE (fuc_name WITH =, created_by WITH =, screen_code WITH =) WHERE (is_deleted = FALSE);



--changeset akshay.jain@impactanalytics.co:filter_user_configurations_mapping stripComments:false splitStatements:false context:Release_1 labels:updating_constraints
--comment: Added constraints for now letting user see duplicates on UI
-- 1a) Per-user, per-screen unique when NOT broadcast
-- (doesn't consider screen_code=3 yet—trigger will enforce cross-screen overlap)
CREATE UNIQUE INDEX IF NOT EXISTS uq_user_screen_name
ON "global".filter_user_configurations_mapping (fuc_name, created_by, screen_code)
WHERE (is_deleted = false AND is_broadcast = false);

-- 1b) Only one broadcasted name per concrete screen for everyone
CREATE UNIQUE INDEX IF NOT EXISTS uq_broadcast_per_screen
ON "global".filter_user_configurations_mapping (fuc_name, screen_code)
WHERE (is_deleted = false AND is_broadcast = true AND screen_code <> 3);

-- 1c) Only one broadcasted “global” name (screen_code = 3) for everyone
CREATE UNIQUE INDEX IF NOT EXISTS uq_broadcast_global
ON "global".filter_user_configurations_mapping (fuc_name)
WHERE (is_deleted = false AND is_broadcast = true AND screen_code = 3);
