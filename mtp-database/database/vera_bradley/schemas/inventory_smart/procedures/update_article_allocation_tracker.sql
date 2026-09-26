--liquibase formatted sql
--changeset linu.nazil:update_article_allocation_tracker_vb runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:new_sp
--comment: initial changeset for update_article_allocation_tracker with channel column added
--rollback: SELECT 1
drop procedure if exists inventory_smart.update_article_allocation_tracker(plan_code varchar);
create or replace procedure inventory_smart.update_article_allocation_tracker(plan_code varchar)
 language plpgsql
as $procedure$
begin
	insert
	into
	inventory_smart.article_allocation_tracker(article,
	updated_at, channel)
select
	article, 
	max(p.updated_at), channel
from
	inventory_smart.plan_master p
join inventory_smart.create_allocation_result_flat_gurobi c on
	c.allocation_code = p.plan_code
join global.store_attributes_filter s on c.store = s.store_code 
where
	p.plan_code = $1
group by 1, 3
ON CONFLICT (article, channel) DO UPDATE
set
	updated_at = excluded.updated_at;
end
$procedure$
;

