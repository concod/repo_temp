--liquibase formatted sql
--changeset linu.nazil:update_article_allocation_tracker runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:new_sp
--comment: initial changeset for update_article_allocation_tracker_new
--rollback: SELECT 1
drop procedure if exists inventory_smart.update_article_allocation_tracker(plan_code varchar);
create or replace procedure inventory_smart.update_article_allocation_tracker(plan_code varchar)
 language plpgsql
as $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'inventory_smart.update_article_allocation_tracker';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
	insert
	into
	inventory_smart.article_allocation_tracker(article,
	updated_at)
select
	article,
	max(p.updated_at)
from
	inventory_smart.plan_master p
join inventory_smart.create_allocation_result_flat_gurobi c on
	c.allocation_code = p.plan_code
where
	p.plan_code = $1
group by 1
ON CONFLICT (article) DO UPDATE
set
	updated_at = excluded.updated_at;
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
end
$procedure$
;
