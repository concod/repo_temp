--liquibase formatted sql
--changeset liquibase:user_access_hierarchy_mapping_psp stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for user_access_hierarchy_mapping 
CREATE TABLE IF NOT EXISTS "global".user_access_hierarchy_mapping (
	user_code int4 NULL,
	acl_code int4 NULL,
	access_hierarchy jsonb NULL DEFAULT '[]'::jsonb,
	hierarchy_id serial4 NOT NULL,
	filters jsonb NULL DEFAULT '[]'::jsonb,
	CONSTRAINT user_access_hierarchy_mapping_pk PRIMARY KEY (hierarchy_id),
	CONSTRAINT user_access_hierarchy_mapping_un UNIQUE (user_code, acl_code)
);

--changeset srishti.kumari@impactanalytics.co:MTP-112462__ stripComments:false splitStatements:false context:Release_1_0 labels:MTP-29880_MTP-29881_updated_at
--comment: added new column updated_at for user_access_hierarchy_mapping table
ALTER TABLE "global".user_access_hierarchy_mapping 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

--changeset srishti.kumari@impactanalytics.co:_MTP-112462 stripComments:false splitStatements:false context:Release_1_0 labels:MTP-29880_MTP-29881_updated_by
--comment: added new column updated_by for user_access_hierarchy_mapping table
ALTER table "global".user_access_hierarchy_mapping
ADD COLUMN IF NOT EXISTS updated_by INT4 NULL;

--changeset srishti.kumari:MTP-updateconstraint stripComments:false splitStatements:false context:Release_1_0 labels:acl_code_fk
--comment: constraint added for acl_code
ALTER TABLE global.user_access_hierarchy_mapping DROP CONSTRAINT IF EXISTS user_access_hierarchy_mapping_fk;

ALTER TABLE global.user_access_hierarchy_mapping
ADD CONSTRAINT user_access_hierarchy_mapping_fk
FOREIGN KEY (acl_code) REFERENCES global.acl_master(acl_code);


--changeset srishti.kumari@impactanalytics.co:MTP-112462 stripComments:false splitStatements:false context:Release_1_0 labels:update_constraint_to_delete_entry
--comment: updated constraint to delete entry from uahm if anything gets deleted from user master_
ALTER TABLE global.user_access_hierarchy_mapping DROP CONSTRAINT IF EXISTS user_access_hierarchy_mapping_fk_1;

ALTER TABLE global.user_access_hierarchy_mapping
ADD CONSTRAINT user_access_hierarchy_mapping_fk_1
FOREIGN KEY (user_code) REFERENCES global.user_master(user_code) ON DELETE CASCADE;

--changeset srishti.kumari@impactanalytics.co:MTP-112462_ stripComments:false splitStatements:false context:Release_1_0 labels:unique_application_per_user_constraint
--comment: added constraint to ensure multiple acl_code entries for same user_code belong to different applications
ALTER TABLE global.user_access_hierarchy_mapping
ADD CONSTRAINT user_access_hierarchy_mapping_unique_app_per_user
EXCLUDE USING btree (user_code WITH =, global.get_application_code_from_acl(acl_code) WITH =);