--liquibase formatted sql
--changeset liquibase:dc_pack_configuration stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for dc_pack_configuration
CREATE TABLE inventory_smart.dc_pack_configuration (
	article varchar NULL,
	pack_type_id varchar NULL,
	pack_type varchar NULL,
	product_code varchar NULL,
	"size" varchar NULL,
	units_in_pack int4 NULL
);

--changeset kamuju.mahaveer@impactanalytics.co:dc_pack_configuration_updated stripComments:false splitStatements:false context:Victorias_Secret_InventorySmart labels:VPP-310
--comment: Adding one column-'pack_description'
ALTER TABLE inventory_smart.dc_pack_configuration ADD pack_description varchar NULL;

