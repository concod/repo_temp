--liquibase formatted sql
--changeset poojith.krishna@impactanalytics.co:generate_rcl_oms_constraint_data runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:figs_generate_rcl_oms_constraint_data
--comment: initial changeset for generate_rcl_oms_constraint_data
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.generate_rcl_oms_constraint_data();
CREATE OR REPLACE FUNCTION inventory_smart.generate_rcl_oms_constraint_data()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
#variable_conflict use_column
declare
    _rcl_code integer;
    _rcl_codes integer[];
    _hash_query text;
    _hash_cols text;
    _hash_vals text;
    _rcl_last_modified timestamp;
    _query_combine text;
    _query_pa text;
    _query_parts text[] := '{}'::text[];
    _query_parts_app text[] := '{}'::text[];
    _query_parts_sum text[] := '{}'::text[];
    _input_query text;
    _input_table_id varchar;
    _input_table_ids varchar[] := '{}'::varchar[];
    _input_cols varchar;
    _loop_counter int := 0;
    _remaining_inputs int := 99999999;
    _rcl_hash_array_string text;
begin
    select
            array_agg(r.rcl_code order by priority asc),
            string_agg('rcl_hash->>' || quote_literal(r.rcl_code) || ' as rcl_hash_' || r.rcl_code, ', '),
            string_agg('x.rcl_hash_' || r.rcl_code, ', '),
            string_agg('rcl_hash->>' || quote_literal(r.rcl_code), ', '),
            max(greatest(r.updated_at, r.created_at)) into _rcl_codes, _hash_query, _hash_cols, _hash_vals, _rcl_last_modified
        from global.rcl_master r
        where
            not is_deleted
            and module_code = 7001
            and r.validity @> current_date
            and rcl_code in (select rcl_code from inventory_smart.rcl_oms_constraint_master where level_of_application = 'applicable_all')
        group by is_deleted;
    raise notice '_rcl_codes:%, _hash_query:%', _rcl_codes, _hash_query;
------ Get Inputs ------ Must be Async Query because of commit for next call
if _rcl_codes is not null then
    raise  notice '--------Rcl_codes not null---------';
     _input_cols := 'x.product_code, x.article, ' || _hash_cols;
    _input_query := 'select
        product_code::text as product_code,
        article::text as article,
        null::int4 as rcl_code,
        null::float4 as min_replenishment_quantity,
        null::varchar as level_of_application,
        null::float4 as max_replenishment_quantity,
        null::varchar as moq_interval,
        null::float4 as moq_tolerance,
        null::varchar as moq_start_month,
        null::double precision as order_multiple,
        ' || _hash_query || '
    from
global.product_attributes_filter y
    where not is_deleted and active';
---- Loop rcls ------
    foreach _rcl_code in array _rcl_codes loop
        if array_length(_input_table_ids, 1) > 0 then
            _input_query := format($$
                select
                  *
                from
                  cache."%1$s"
                where
                  level_of_application != 'applicable_all' or level_of_application is null  $$, _input_table_id);
        end if;
            _query_combine := format($$
                with inp as materialized (
                    %3$s
                ),
                inp_rule as (
                    select x.*, y.rcl_code as e_rcl_code, y.rule_code as e_rule_code from inp x left join (
                        select
                            rcl_code,
                            rule_code,
                            md5(rcl_dimension::text) as rcl_dimention
                        from
                            inventory_smart.rcl_oms_constraint_master_rule
                        where
                            rcl_code = %1$s
                    ) y on x.rcl_hash_%1$s = y.rcl_dimention
                ),
                rd as materialized (
                    select
                        %2$s,
                        y.rcl_code,
                        y.rule_code,
                        y.min_replenishment_quantity,
                        y.level_of_application,
                        y.max_replenishment_quantity,
                        y.moq_interval,
                        y.moq_tolerance,
                        y.moq_start_month,
                        y.order_multiple
                    from
                      inp_rule x
                      left join (
                        select rcl_code, rule_code,
                          min_replenishment_quantity,
                          level_of_application,
                          max_replenishment_quantity,
                          moq_interval,
                          moq_tolerance,
                          moq_start_month,
                          order_multiple
                        from inventory_smart.rcl_oms_constraint_master where rcl_code = %1$s
                        and validity @> current_date
                      ) y on
                      x.e_rcl_code = y.rcl_code and x.e_rule_code = y.rule_code
                )
                select
                    *
                from
                    rd $$, _rcl_code, _input_cols, _input_query);
            raise notice '_query_combine: %', _query_combine;
            select * from
              cache.wrap_sp('inventory_smart', 'generate_rcl_oms_constraint_master_data',
              jsonb_build_object('input_table', coalesce(_input_table_id, 'primary_inputs'), 'rcl_code', _rcl_code, 'date', current_date),
              _query_combine, '{}'::varchar[], '{schema_name}:{sp_name}:{request}') into _input_table_id;
            raise notice '_input_table_id: %', _input_table_id;
            _input_table_ids := array_append(_input_table_ids, _input_table_id);
    end loop;
    raise notice 'first loop end';
------ Build final query ------
    foreach _input_table_id in array _input_table_ids loop
        _query_parts := array_append(_query_parts, 'SELECT product_code, article, rcl_code, rule_code, min_replenishment_quantity, level_of_application, max_replenishment_quantity, moq_interval, moq_tolerance, moq_start_month, order_multiple FROM cache."' || _input_table_id || '" WHERE level_of_application = ' || quote_literal('applicable_all'));
    end loop;
    raise notice '_query_parts: %', _query_parts;
    select string_agg(q, ' UNION ALL ') into _query_combine from unnest(_query_parts) as q;
        _query_combine := 'select * from (' || _query_combine || ') X where rcl_code is not null';
    raise notice '_query_combine: %', _query_combine;
    drop table if exists public.constraint_rcl_oms_app_all;
    execute 'CREATE TEMP TABLE constraint_rcl_oms_app_all ON COMMIT DROP AS ' || _query_combine || ';';
ELSE
    CREATE TEMP TABLE constraint_rcl_oms_app_all(rcl_code int,
		  rule_code int,
		  min_replenishment_quantity float4,
		  level_of_application varchar,
		  max_replenishment_quantity float4,
		  moq_interval varchar,
		  moq_tolerance float4,
		  moq_start_month varchar,
		  article varchar,
	 	  product_code varchar,
          order_multiple double precision)
		  ON COMMIT DROP;
END IF;
DROP TABLE IF EXISTS _rcl_codes;
DROP TABLE IF EXISTS _rcl_code;
SELECT
            array_agg(rcl_code order by priority asc),
            string_agg('paf.rcl_hash->>' || quote_literal(rcl_code::text), ', ') into _rcl_codes, _rcl_hash_array_string
        from global.rcl_master where
            not is_deleted
            and module_code = 7001
            and validity @> current_date
            and rcl_code in (select rcl_code from inventory_smart.rcl_oms_constraint_master where level_of_application = 'sum_all')
        group by is_deleted;
    --
    if _rcl_codes is not null then
        raise  notice '--------Rcl_codes not null---------';
        execute 'CREATE TEMP TABLE "constraint_rcl_oms_sum_all" ON COMMIT DROP AS
            select
              rcl_code,
              rule_code,
              article,
              min_replenishment_quantity,
              level_of_application,
              max_replenishment_quantity,
              moq_interval,
              moq_tolerance,
              moq_start_month,
             order_multiple
            from
              (
                select
                  rcl_code,
                  rule_code,
                  array_agg(distinct article) as article
                from
                  global.product_attributes_filter paf
                  join inventory_smart.rcl_oms_constraint_master_rule rcmr on md5(rcmr.rcl_dimension::text) = any(array[' || _rcl_hash_array_string || ']::text[])
                where
                  paf.active
                  and not paf.is_deleted
                  and rcmr.rcl_code = any(''' || _rcl_codes::text || '''::int4[])
                group by
                  rcl_code,
                  rule_code
              ) x
              join inventory_smart.rcl_oms_constraint_master rcm using(rcl_code, rule_code)
            where
              rcm.level_of_application != ''applicable_all''
              and rcm.validity @> current_date';
ELSE
 CREATE TEMP TABLE constraint_rcl_oms_sum_all(rcl_code int,
		  rule_code int,
		  min_replenishment_quantity float4,
		  article varchar[],
		  max_replenishment_quantity float4,
		  level_of_application varchar,
		  moq_interval varchar,
		  moq_tolerance float4,
		  moq_start_month varchar,
           order_multiple double precision)
		  ON COMMIT DROP;
 END IF;
	raise notice '=========Resolution Complete========';
		DROP TABLE IF EXISTS public.final_oms_resolved_table;
        CREATE TABLE public.final_oms_resolved_table as
        select
          rcl_code,
          rule_code,
          min_replenishment_quantity,
          level_of_application,
          max_replenishment_quantity,
          moq_interval,
          0.1 as moq_tolerance,
          moq_start_month,
          choice,
          product_code,
          order_multiple
        from constraint_rcl_oms_sum_all
        cross join unnest(article) as choice
        join global.product_attributes_filter p on choice = p.article
        union all
        select rcl_code,
          rule_code,
          min_replenishment_quantity,
          level_of_application, 
          max_replenishment_quantity,
          moq_interval,
          0.1 as moq_tolerance,
          moq_start_month,
          article as choice,
          product_code,
          order_multiple
         from constraint_rcl_oms_app_all;
end
$function$
;