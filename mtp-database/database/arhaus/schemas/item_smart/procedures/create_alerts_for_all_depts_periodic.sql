--liquibase formatted sql
--changeset abhimanyu.j@impactanalytics.co:create_alerts_for_all_depts runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:item_smart_initial_commit
--comment: initial changeset for create_alerts_for_all_depts
--rollback: SELECT 1

DROP PROCEDURE IF EXISTS item_smart.create_alerts_for_all_depts_periodic();

CREATE OR REPLACE PROCEDURE item_smart.create_alerts_for_all_depts_periodic()
 LANGUAGE plpgsql
AS $procedure$
declare 
		_worker text;
        _workers text[];
		_workers_status bool := true;
		_worker_status bool;
        _depts text[];
        _dept  text;
	begin
		select array_agg(distinct l2_name)
		into _depts
        from item_smart.mv_product_hierarchies_filter;
       
		foreach _dept in array _depts
        loop
			select async_query into _worker from public.async_query('call item_smart.create_alerts_periodic('''||_dept||''')');
			_workers := array_append(_workers, _worker);
		end loop;

		FOREACH _worker in array _workers 
		loop
			select async_query_status into _worker_status from public.async_query_status(_worker, 'cleanup');
			_workers_status := _workers_status and _worker_status;
		end loop;
		raise notice '_workers_status: %', _workers_status;
end;  
$procedure$
;