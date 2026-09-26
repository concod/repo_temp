--liquibase formatted sql
--changeset liquibase:ph_configuration_mapping stripComments:false splitStatements:false context:Release_1_1 labels:MTP-24756
--comment: auto_allocation_status column added
CREATE TABLE inventory_smart.ph_configuration_mapping (
	ph_code int4 NOT NULL,
	channel varchar NOT NULL,
	default_product_profile int4 NULL,
	default_store_groups _int4 NULL DEFAULT ARRAY[]::integer[],
	default_dcs _int4 NULL DEFAULT ARRAY[]::integer[],
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NULL DEFAULT now(),
	updated_by int4 NULL,
	created_by int4 NULL,
	CONSTRAINT ph_configuration_mapping_un UNIQUE (ph_code, channel)
);
ALTER TABLE inventory_smart.ph_configuration_mapping ADD CONSTRAINT pcm_created_by_fk FOREIGN KEY (created_by) REFERENCES "global".user_master(user_code) ON DELETE SET NULL;
ALTER TABLE inventory_smart.ph_configuration_mapping ADD CONSTRAINT pcm_updated_by_fk FOREIGN KEY (updated_by) REFERENCES "global".user_master(user_code) ON DELETE SET NULL;
ALTER TABLE inventory_smart.ph_configuration_mapping ADD CONSTRAINT ph_configuration_mapping_fk FOREIGN KEY (ph_code) REFERENCES "global".product_hierarchies_filter(hierarchy_code) ON DELETE RESTRICT ON UPDATE RESTRICT;

--changeset kailash.kangne@impactanalytics.co:ph_configuration_mapping stripComments:false splitStatements:false context:Release_1_1 labels:MTP-24756
--comment: auto_allocation_status column added
ALTER TABLE inventory_smart.ph_configuration_mapping ADD COLUMN auto_allocation_status BOOLEAN DEFAULT FALSE, ADD COLUMN auto_allocation_update BOOLEAN DEFAULT FALSE;