--liquibase formatted sql
--changeset liquibase:store_fc_mapping runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for store_fc_mapping
--rollback: SELECT 1
DROP VIEW IF EXISTS global.store_fc_mapping;
create or replace
view global.store_fc_mapping as
select
	mapping_code,
	store_code,
	fc_code
from
	global.product_mapping
where
	mapping_type = 'store_fc'
	and is_active;
