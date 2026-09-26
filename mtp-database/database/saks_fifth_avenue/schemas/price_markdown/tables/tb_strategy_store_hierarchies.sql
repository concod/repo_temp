--liquibase formatted sql
--changeset vamsi.balaga@impactanalytics.co:tb_strategy_store_hierarchies_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_strategy_store_hierarchies

CREATE TABLE price_markdown.tb_strategy_store_hierarchies (
	strategy_id int4 NULL,
	s0_ids _int8 NULL,
	s1_ids _int8 NULL,
	s2_ids _int8 NULL,
	s3_ids _int8 NULL,
	s4_ids _int8 NULL,
	s5_ids _int8 NULL
);
insert into price_markdown.tb_strategy_store_hierarchies
(strategy_id,s0_ids,s1_ids,s2_ids,s3_ids,s4_ids,s5_ids)
select
	strategy_id,
	array_agg(hierarchy_value) filter (where hierarchy_level = 0) as s0_ids,
	array_agg(hierarchy_value) filter (where hierarchy_level = 1) as s1_ids,
	array_agg(hierarchy_value) filter (where hierarchy_level = 2) as s2_ids,
	array_agg(hierarchy_value) filter (where hierarchy_level = 3) as s3_ids,
	array_agg(hierarchy_value) filter (where hierarchy_level = 4) as s4_ids,
	array_agg(hierarchy_value) filter (where hierarchy_level = 5) as s5_ids
from 
	price_markdown.tb_strategy_hierarchy
where is_product_hierarchy = 0
group by strategy_id;