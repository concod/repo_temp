--liquibase formatted sql
--changeset liquibase:dc_fc_mapping runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for dc_fc_mapping
--rollback: SELECT 1
DROP VIEW IF EXISTS global.dc_fc_mapping;
create or replace
view global.dc_fc_mapping as
select
	mapping_code,
	dc_code,
	fc_code
from
	global.product_mapping
where
	mapping_type = 'dc_fc'
	and product_mapping.is_active;
