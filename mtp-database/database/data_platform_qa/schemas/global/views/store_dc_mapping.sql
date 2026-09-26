--liquibase formatted sql
--changeset swapnil.bhange:store_dc_mapping_v2 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:001
--comment: added vendoe column for store_dc_mapping
--rollback: SELECT 1
DROP VIEW IF EXISTS global.store_dc_mapping;
create or replace
view global.store_dc_mapping as
select
	mapping_code,
	store_code,
	dc_code,
	vendor
from
	global.product_mapping
where
	mapping_type = 'store_dc'
	and is_active;
