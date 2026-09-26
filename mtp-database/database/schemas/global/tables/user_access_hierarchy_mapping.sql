--liquibase formatted sql
--changeset liquibase:user_access_hierarchy_mapping stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for user_access_hierarchy_mapping
CREATE TABLE "global".user_access_hierarchy_mapping (
	user_code int4 NULL,
	acl_code int4 NULL,
	access_hierarchy jsonb NULL DEFAULT '[]'::jsonb,
	hierarchy_id serial4 NOT NULL,
	filters jsonb NULL DEFAULT '[]'::jsonb,
	CONSTRAINT user_access_hierarchy_mapping_pk PRIMARY KEY (hierarchy_id),
	CONSTRAINT user_access_hierarchy_mapping_un UNIQUE (user_code, acl_code)
);
ALTER TABLE "global".user_access_hierarchy_mapping ADD CONSTRAINT user_access_hierarchy_mapping_fk FOREIGN KEY (acl_code) REFERENCES "global".acl_master(acl_code);
ALTER TABLE "global".user_access_hierarchy_mapping ADD CONSTRAINT user_access_hierarchy_mapping_fk_1 FOREIGN KEY (user_code) REFERENCES "global".user_master(user_code);

--changeset chaitanyaprasad.reddy:MTP-29880_MTP-29881_updated_at stripComments:false splitStatements:false context:Release_1_0 labels:MTP-29880_MTP-29881_updated_at
--comment: added new column updated_at for user_access_hierarchy_mapping table
ALTER TABLE "global".user_access_hierarchy_mapping 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

--changeset chaitanyaprasad.reddy:MTP-29880_MTP-29881_updated_by stripComments:false splitStatements:false context:Release_1_0 labels:MTP-29880_MTP-29881_updated_by
--comment: added new column updated_by for user_access_hierarchy_mapping table
ALTER table "global".user_access_hierarchy_mapping
ADD COLUMN IF NOT EXISTS updated_by INT4 NULL;


--changeset akshay.jain:MTP-updateconstraint stripComments:false splitStatements:false context:Release_1_0 labels:update_constraint_to_delete_entry
--comment: updated constraint to delete entry from uahm if anything gets deleted from user master
ALTER TABLE global.user_access_hierarchy_mapping  DROP CONSTRAINT user_access_hierarchy_mapping_fk_1;

ALTER TABLE global.user_access_hierarchy_mapping
ADD CONSTRAINT user_access_hierarchy_mapping_fk_1
FOREIGN KEY (user_code) REFERENCES global.user_master(user_code) ON DELETE CASCADE;
