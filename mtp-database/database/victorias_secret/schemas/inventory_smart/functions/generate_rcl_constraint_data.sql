--liquibase formatted sql
--changeset linu.nazil@impactanalytics.co:generate_rcl_constraint_data runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:MTP-64876
--comment: Modified changeset for VS generate_rcl_constraint_data to include new choices.
--rollback: SELECT 1
DROP FUNCTION if exists "inventory_smart".generate_rcl_constraint_data(_inputs jsonb, _module_code integer, _date date);
DROP FUNCTION if exists "inventory_smart".generate_rcl_constraint_data(_inputs varchar, _module_code integer, _date date, _hide_non_match boolean);
DROP FUNCTION if exists inventory_smart.generate_rcl_constraint_data(text, int4, bool);
DROP FUNCTION IF EXISTS inventory_smart.generate_rcl_constraint_data(_constraint_resolution_input_table character varying, _module_code integer, _date date, _hide_non_match boolean, _is_auto_allocation boolean);
CREATE OR REPLACE FUNCTION inventory_smart.generate_rcl_constraint_data(_constraint_resolution_input_table character varying, _module_code integer, _date date, _hide_non_match boolean DEFAULT true, _is_auto_allocation boolean DEFAULT false)
 RETURNS TABLE(product_code text, store_code text, article text, rcl_code integer, wos real, transit_time real, safety_stock real, min_stock real, max_stock real, min_distribution character varying, aps real, ros real, st real)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
	_rcl_codes int[];
	_ph record;
	_q_parts text[] := '{}'::text[];
	_q_part text;
	_sql text;
	_version text  := gen_random_uuid()::varchar;
--	_new_table_name text :=  _constraint_resolution_input_table || '_updated';
	_new_table_name text :=  'updated_' || regexp_replace(_constraint_resolution_input_table,'public.', '');
	_nc_count int;
begin
	IF _is_auto_allocation THEN 
        _sql := format($$
            SELECT 
                res.product_code::text,
                res.store_code::text,
                res.article::text,
                res.rcl_code::int4,
                res.wos::float4,
                res.dos::float4,
                res.transit_time::float4,
                res.safety_stock::float4,
                res.min_stock::float4,
                res.max_stock::float4,
                res.min_distribution::varchar,
                res.aps::float4,
                res.ros::float4,
                res.st::float4
            FROM inventory_smart.final_result_table res
            JOIN %1$s ri 
              ON ri.product_code = res.product_code 
             AND ri.store_code = res.store_code
        $$, _constraint_resolution_input_table);

        RAISE NOTICE 'Auto allocation path SQL: %', _sql;
        RETURN QUERY EXECUTE _sql;
    END IF;
	execute 'select count(1) from ' || _constraint_resolution_input_table || ' x 
		 left join inventory_smart.alerts_product_level apl on x.article = apl.article where apl.launch_date is not null
		' into _nc_count;
	if _nc_count = 0 then
		select
				array_agg(a.rcl_code order by priority asc) into _rcl_codes
			from 
			(
			select r.rcl_code, r.priority, r.updated_at, r.created_at, r.is_deleted
			from global.rcl_master r where
				not is_deleted
				and module_code =  170 
				and validity @> current_date
			group by 1, 2
		union 
			select 
				b.rcl_code, b.priority, b.updated_at, b.created_at, b.is_deleted
			from 
			(
				select r.rcl_code, r.priority, r.updated_at, r.created_at, r.is_deleted
				from global.rcl_master  r
				left join ( select distinct delivery_date from inventory_smart.asn_to_allocate_alert) a on true
				where
					not is_deleted
					and module_code = 170 
					and validity @> a.delivery_date
				group by 1, 2
			) b ) a 
			group by is_deleted;
	
		execute ' drop table if exists ' || _new_table_name  || ' cascade;';
		execute ' create unlogged table ' || _new_table_name  || ' as
		select distinct x.product_code, x.article, coalesce(aaa.delivery_date, current_date) as launch_date from  ' || _constraint_resolution_input_table || ' x
		left join inventory_smart.asn_to_allocate_alert aaa on x.article = aaa.article;';
	elseif _nc_count > 0 then
		execute '
			select 
				coalesce(array_agg(rcl_code order by priority asc),''{}'')
			from 
			(
				select distinct rcl_code,priority
				from global.rcl_master 
				left join ( select distinct launch_date from inventory_smart.alerts_product_level) a on true
				where
					not is_deleted
					and module_code = ' || _module_code || '
					and validity @> a.launch_date
			) a
			; ' into _rcl_codes;

		execute ' drop table if exists ' || _new_table_name  || ' cascade;';
		execute ' create unlogged table ' || _new_table_name  || ' as
			select distinct x.product_code, x.article, apl.launch_date as launch_date from  ' || _constraint_resolution_input_table || ' x
			join inventory_smart.alerts_product_level apl on x.article = apl.article ';
end if;
	----------
	for _ph in execute 'select l0_name, l2_name, l3_name, l4_name, l5_name from global.product_attributes_filter join ' || _new_table_name || ' using(product_code) group by l0_name, l2_name, l3_name, l4_name, l5_name order by count(1) desc' loop 
		_q_parts := array_append(_q_parts, 'CALL inventory_smart.generate_rcl_l01_constraint_data_subset(' || quote_literal(_version) || ', ' || quote_literal(_ph.l0_name) || ', ' || quote_literal(_ph.l2_name) || ', ' || quote_literal(_ph.l3_name) || ', ' || quote_literal(_ph.l4_name) || ', ' || quote_literal(_ph.l5_name) || ', ' || quote_literal(_rcl_codes) || '::int[]' || ', ' || quote_literal(_new_table_name) || ', ' || quote_literal(_date) || ');');
		raise notice '%, %', _rcl_codes, _ph;
	end loop;

	execute 'CREATE unlogged TABLE "rcl_vc_' || _version || '" (
	version_code text NOT NULL,
	l0_name varchar NOT NULL,
	rcl_code int4 NOT NULL,
	rule_code int4 NOT NULL,
	psa_code varchar NULL,
	product_codes _varchar NULL,
	wos float4 NULL,
	transit_time float4 NULL,
	safety_stock float4 NULL,
	min_stock float4 NULL,
	max_stock float4 NULL,
    min_distribution varchar NULL,
	aps float4 NULL,
	ros float4 NULL,
	st float4 NULL,
	store_codes _varchar NULL,
	id bigserial NOT NULL
);';
	raise notice 'tablename: %', 'rcl_vc_' || _version || ';';
	raise notice '_q_parts: %', _q_parts;
	if cardinality(_q_parts) > 0 THEN
		FOREACH _q_part in array _q_parts loop
			raise notice '_q_part: %', _q_part;
			execute _q_part;
		end loop;
	end if;
	execute 'CREATE INDEX "rcl_vc_' || _version || '_idx" ON public."rcl_vc_' || _version || '" USING GIN(store_codes, product_codes);';
	_sql := format($$
		with res as materialized (
			select 
			  r.id,
			  t.product_code, 
			  t.store_code,
              t.article,
			  r.rcl_code, 
			  r.wos, 
			  r.transit_time, 
			  r.safety_stock, 
			  r.min_stock, 
			  r.max_stock, 
			  r.min_distribution, 
			  r.aps, 
			  r.ros, 
			  r.st 
			FROM 
			  %2$s t 
			  join public."rcl_vc_%1$s" r on r.store_codes @> array[t.store_code] :: varchar[] 
			  and r.product_codes @> array[t.product_code] :: varchar[] 
		),
		first_res as (
			select product_code, store_code, min(id) as id from res group by 1,2
		)
		select
		  res.product_code::text, 
		  res.store_code::text, 
		  res.article::text,
		  res.rcl_code, 
		  res.wos, 
		  res.transit_time, 
		  res.safety_stock, 
		  res.min_stock, 
		  res.max_stock, 
		  res.min_distribution, 
		  res.aps, 
		  res.ros, 
		  res.st 
		from res join first_res using(product_code, store_code, id) $$, _version , _constraint_resolution_input_table);
raise notice '_sql: %', _sql;
set local enable_seqscan = off;
		return query execute _sql ;
reset enable_seqscan;
end; 
$function$
;