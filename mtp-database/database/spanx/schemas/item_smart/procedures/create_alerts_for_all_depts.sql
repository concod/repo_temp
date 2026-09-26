--liquibase formatted sql
--changeset jaya.khandelwal@impactanalytics.co:create_alerts_for_all_depts_chg2 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:item_smart_initial_commit
--comment: initial changeset for create_alerts_for_all_depts
--rollback: SELECT 1
DROP PROCEDURE if exists item_smart.create_alerts_for_all_depts();
DROP PROCEDURE IF EXISTS item_smart.create_alerts_for_all_depts(p_mode text);
create or replace procedure item_smart.create_alerts_for_all_depts(p_mode text)
language plpgsql
as $procedure$
declare
    _worker text;
    _workers text[];
    _workers_status bool := true;
    _worker_status bool;
    _depts text[];
    _dept text;
begin
 
    select array_agg(distinct l1_name)
    into _depts
    from item_smart.mv_product_hierarchies_filter;
    
    raise notice '_depts: %', _depts;
    -- serialized execution
    if p_mode = 'serialized' then
        foreach _dept in array _depts
        loop
            call item_smart.create_alerts(_dept);
        end loop;
    -- parallel execution
    elsif p_mode = 'parallel' then
        foreach _dept in array _depts
        loop
            select async_query into _worker 
            from public.async_query('call item_smart.create_alerts(''' || _dept || ''')');
            _workers := array_append(_workers, _worker);
        end loop;
        -- wait for all parallel executions to complete
        foreach _worker in array _workers 
        loop
            select async_query_status into _worker_status 
            from public.async_query_status(_worker, 'cleanup');
            _workers_status := _workers_status and _worker_status;
        end loop;
        raise notice '_workers_status: %', _workers_status;
    else
        raise exception 'invalid mode: %. use ''serial'' or ''parallel''.', p_mode;
    end if;
end;
$procedure$
;