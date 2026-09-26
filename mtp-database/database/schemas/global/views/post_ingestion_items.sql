--liquibase formatted sql
--changeset ashish@impactanalytics.co:post_ingestion_items runOnChange:true stripComments:false splitStatements:false context:context:ASync_Procedures labels:DAT-832
--comment: initial changeset for post_ingestion_items
--rollback: SELECT 1
DROP VIEW IF EXISTS global.post_ingestion_items;
create view global.post_ingestion_items as
select
	bucket,
	array_agg(jsonb_build_object('def',
	def,
	'type',
	(case
		when "type" in ('f', 'c', 'u') then 'constraint'
		when "type" in ('i') then 'index'
	end))) as defs
from
	(
	select
		row_number() over(partition by schema_name, table_name
		order by position("type" in 'i, u, c, f')) as bucket,
		*
	from
		global.index_drop_create where table_name not in('product_attributes')) idc
group by
	bucket
order by
	bucket;
