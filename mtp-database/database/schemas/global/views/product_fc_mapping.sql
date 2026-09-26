--liquibase formatted sql
--changeset liquibase:product_fc_mapping runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_fc_mapping
--rollback: SELECT 1
DROP VIEW IF EXISTS global.product_fc_mapping;
create or replace
view global.product_fc_mapping as
select
	mapping_code,
	product_code,
	fc_code
from
	global.product_mapping
where
	mapping_type = 'product_fc'
	and is_active;
