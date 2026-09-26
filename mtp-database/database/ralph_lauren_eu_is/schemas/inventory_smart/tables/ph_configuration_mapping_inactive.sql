--liquibase formatted sql
--changeset jugal.mehra@impactanalytics.co:ph_configuration_mapping_inactive stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for ph_configuration_mapping_inactive
CREATE TABLE inventory_smart.ph_configuration_mapping_inactive (
	ph_code int4 NOT NULL,
	channel varchar NOT NULL,
	default_product_profile int4 NULL,
	default_store_groups _int4 DEFAULT ARRAY[]::integer[] NULL,
	default_dcs _int4 DEFAULT ARRAY[]::integer[] NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	updated_at timestamptz DEFAULT now() NULL,
	updated_by int4 NULL,
	created_by int4 NULL,
	default_store_groups_selected _int4 DEFAULT ARRAY[]::integer[] NULL,
	upload_flag varchar DEFAULT 'false'::character varying NOT NULL,
	CONSTRAINT ph_configuration_mapping_inactive_un UNIQUE (ph_code, channel)
);


-- inventory_smart.ph_configuration_mapping_inactive foreign keys

ALTER TABLE inventory_smart.ph_configuration_mapping_inactive ADD CONSTRAINT pcma_created_by_fk FOREIGN KEY (created_by) REFERENCES "global".user_master(user_code) ON DELETE SET NULL;
ALTER TABLE inventory_smart.ph_configuration_mapping_inactive ADD CONSTRAINT pcma_updated_by_fk FOREIGN KEY (updated_by) REFERENCES "global".user_master(user_code) ON DELETE SET NULL;
ALTER TABLE inventory_smart.ph_configuration_mapping_inactive ADD CONSTRAINT ph_configuration_mapping_inactive_fk FOREIGN KEY (ph_code) REFERENCES "global".product_hierarchies_filter(hierarchy_code) ON DELETE RESTRICT ON UPDATE RESTRICT;