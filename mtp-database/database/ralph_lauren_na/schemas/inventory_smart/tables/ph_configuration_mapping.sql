--liquibase formatted sql
--changeset liquibase:ph_configuration_mapping stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for ph_configuration_mapping
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


--changeset renugopal:ph_configuration_mapping stripComments:false splitStatements:false context:Release_2_0 labels:MTP-19440
--comment: add selections for SG ph config - product rules
ALTER TABLE inventory_smart.ph_configuration_mapping ADD default_store_groups_selected _int4 NULL DEFAULT ARRAY[]::integer[];

--changeset kailash:ph_configuration_mapping stripComments:false splitStatements:false context:Release_2_0 labels:MTP-38411
--comment: MTP-38411 upload flag
ALTER TABLE inventory_smart.ph_configuration_mapping ADD upload_flag varchar NOT NULL DEFAULT 'false'::character varying;

--changeset kailash:ph_configuration_mapping_1 stripComments:false splitStatements:false context:Release_3_0 labels:MTP-49876
--comment: MTP-49876 cross_country_allocation
ALTER TABLE inventory_smart.ph_configuration_mapping ADD cross_country_allocation varchar NOT NULL DEFAULT 'Not Allowed'::character varying;