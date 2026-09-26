--liquibase formatted sql
--changeset swapnil.bhange:product_dc_mapping_v2 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:001
--comment: added vendoe column for product_dc_mapping
--rollback: SELECT 1
DROP VIEW IF EXISTS global.product_dc_mapping;
create or replace
view global.product_dc_mapping as
select
	mapping_code,
	product_code,
	dc_code,
	vendor,
	validity
from
	global.product_mapping
where
	mapping_type = 'product_dc'
	and product_mapping.is_active;
