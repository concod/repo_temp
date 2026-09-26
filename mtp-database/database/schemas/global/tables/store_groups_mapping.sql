--liquibase formatted sql
--changeset liquibase:store_groups_mapping stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for store_groups_mapping
CREATE TABLE "global".store_groups_mapping (
	sg_code int4 NOT NULL,
	store_code varchar NOT NULL,
	ref_sg_code int4 NULL,
	CONSTRAINT store_groups_mapping_un UNIQUE (sg_code, store_code),
	CONSTRAINT store_groups_mapping_fk FOREIGN KEY (sg_code) REFERENCES "global".store_groups(sg_code) ON DELETE CASCADE,
	CONSTRAINT store_groups_mapping_store_fk FOREIGN KEY (store_code) REFERENCES "global".store_master(store_code) ON DELETE CASCADE
);


--changeset kamaleshwaran.k@impactanalytics.co:store_groups_mapping_1 stripComments:false splitStatements:false context:Release_2 labels:initial changeset for updating the primary key 
--comment: initial changeset for updating the primary key 

ALTER TABLE global.store_groups_mapping 
ADD CONSTRAINT store_groups_mapping_pk 
PRIMARY KEY (sg_code, store_code);

ALTER TABLE global.store_groups_mapping 
DROP CONSTRAINT store_groups_mapping_un;