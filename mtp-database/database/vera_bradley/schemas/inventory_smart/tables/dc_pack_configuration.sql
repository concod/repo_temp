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

--changeset suryasai.gopal@impactanalytics.co:dc_pack_configuration stripComments:false splitStatements:false context:MTP-15158 labels:liquibase_project_start
--comment: https://impactanalytics.atlassian.net/browse/MTP-15158
ALTER TABLE inventory_smart.dc_pack_configuration ADD parent_article varchar NULL;

ALTER TABLE inventory_smart.dc_pack_configuration ADD pack_description varchar NULL;
