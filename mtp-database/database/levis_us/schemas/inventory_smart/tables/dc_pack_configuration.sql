-- liquibase formatted sql
-- changeset ramkumar.vahanan@impactanalytics.co:dc_pack_configuration stripComments:false splitStatements:false context:MTP-75831 labels:MTP-75831 
-- comment: initial changeset for dc_pack_configuration

CREATE TABLE inventory_smart.dc_pack_configuration (
	pack_type_id varchar NULL,
	pack_type varchar NULL,
	product_code varchar NULL,
	"size" varchar NULL,
	units_in_pack float8 NULL,
	pack_description int4 NULL,
	article varchar NULL
);

-- changeset himansh.bhardwaj@impactanalytics.co:pack_desc should be string stripComments:false splitStatements:false context:MTP-75831 labels:MTP-75831 
-- comment: pack_desc should be string
-- ALTER TABLE inventory_smart.dc_pack_configuration
-- ALTER COLUMN pack_description TYPE VARCHAR;

-- changeset srinivasgowda.sg@impactanalytics.co:pack_desc stripComments:false splitStatements:false context:MTP-75831 labels:MTP-75831
-- comment: adding index
CREATE INDEX IF NOT EXISTS idx_dc_pack_configuration_join ON inventory_smart.dc_pack_configuration USING btree (pack_type_id, article, pack_type, product_code);

-- changeset pradeep.nayak@impactanalytics.co:pack_desc stripComments:false splitStatements:false context:Optimisation labels:MTP-75831
-- comment: adding index on packtypeid, article , size
CREATE INDEX IF NOT EXISTS idx_dc_pack_configuration_join_on_size ON inventory_smart.dc_pack_configuration USING btree (pack_type_id, article, size);
