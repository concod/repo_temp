--liquibase formatted sql
--changeset sidharth.harish@impactanalytics.co:fn_approval_carry_forward runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for price_markdown.fn_approval_carry_forward

DROP FUNCTION if exists price_markdown.fn_approval_carry_forward;
CREATE OR REPLACE FUNCTION price_markdown.fn_approval_carry_forward(in_user_id integer, lead_time integer)
 RETURNS TABLE(strategy_id integer, strategy_name text, min_strategy_disc_id integer, max_strategy_disc_id integer, pcds text, product_count bigint, user_id integer, insert_discount_time integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
	strategy_ids integer[];
	strategy_id_item integer;
	temp_query text := '';
	start_time TIMESTAMP;
	end_time TIMESTAMP;
	total_time_taken integer;
	_query_combine text := '';

begin
	start_time := clock_timestamp();

	temp_query := 'drop table if exists tb_cas_temp_1;';
	execute temp_query;

	temp_query := Format(
		'create temp table tb_cas_temp_1 as (
			select
				strategy_id , pcd_id , min(pcd_start_date) as pcd_start_date
			from price_markdown.tb_strategy_pcd as stg_pcd
			join price_markdown.tb_strategy_master as sm
			using (strategy_id)
			where
			stg_pcd.pcd_start_date = date(timezone(
							(select
								remarks
							from
								metaschema.tb_app_sub_master
							where
								name = ''client_timezone''),
							now())) + %1$L::integer --and pcd_start_date >= current_date
			and sm.status = 3
			group by 1,2
		)',lead_time);
	execute temp_query;
	raise notice 'SQL 1 statement: %', temp_query;


	temp_query := 'select array_agg(distinct strategy_id) from tb_cas_temp_1';
	execute temp_query into strategy_ids;


	temp_query := 'drop table if exists tb_cas_temp_2;';
	execute temp_query;
	temp_query := Format(
		'create temp table tb_cas_temp_2 as (
			select distinct
				sd.strategy_id,
				sd.product_level_id,
				sd.pcd_id,
				sd.channel_info
			from price_markdown.tb_strategy_discount sd
			join tb_cas_temp_1 as cas
			on
			sd.strategy_id = cas.strategy_id
		    and sd.pcd_id = cas.pcd_id
			where sd.strategy_id = ANY(%1$L)
			--pcd_id in (select pcd_id from tb_cas_temp_1)
			and approval_status <> ''Finally Approved''
		);', strategy_ids);
	execute temp_query;
	raise notice 'SQL 2 statement: %', temp_query;


	temp_query := 'drop table if exists tb_temp_int;';
	execute temp_query;
	temp_query := Format(
		'create temp table tb_temp_int as (
			select
				sd.strategy_id,
				sd.product_level_id,
				sd.store_level_id,
				sd.pcd_id,
				sd.channel_info,
				spcd.pcd_start_date,
				row_number() over (
					partition by
					sd.strategy_id, sd.product_level_id, sd.store_level_id
					order by spcd.pcd_start_date) as rank_1
				from price_markdown.tb_strategy_discount as sd
				join price_markdown.tb_strategy_pcd as spcd
					    on sd.strategy_id = spcd.strategy_id and sd.pcd_id = spcd.pcd_id
				where sd.strategy_id = ANY(%1$L)
		);', strategy_ids);
	execute temp_query;
	raise notice 'SQL 3 statement: %', temp_query;


	temp_query := 'drop table if exists temp_1;';
	execute temp_query;
	temp_query := Format('
		create temp table temp_1 as (
			select
			    sd.strategy_id,
			    sd.product_level_id,
			    sd.store_level_id,
			    sd.pcd_id,
			    sd.channel_info,
				''Finally Approved''::price_markdown.strategy_approval_status_enum as approval_status,
				''Auto-Discount Roll-over''::price_markdown.action_status_enum as action_status,
				case
					when spcd.rank_1 = 1 then sd.markdown_percentage
					else sd.previous_markdown_percentage
				end as markdown_percentage,
				spcd.pcd_start_date
			from price_markdown.tb_strategy_discount as sd
			join tb_cas_temp_2 as input_data
                on
                sd.strategy_id = input_data.strategy_id
                and sd.product_level_id = input_data.product_level_id
                and sd.pcd_id = input_data.pcd_id
				and sd.channel_info = input_data.channel_info
			join tb_temp_int spcd
			on
			    sd.strategy_id = spcd.strategy_id
			    and sd.product_level_id = spcd.product_level_id
			    and sd.pcd_id = spcd.pcd_id
			    and sd.store_level_id  = spcd.store_level_id
			where sd.strategy_id = ANY(%1$L)
	);', strategy_ids);
	execute temp_query;
	raise notice 'SQL 4 statement: %', temp_query;


	temp_query := 'drop table if exists temp_2;';
	execute temp_query;

	temp_query :=  'drop table if exists temp_2;';
	execute temp_query;
	temp_query:= Format('
	create temp table temp_2 as (
	with cte_1 as (
	select
	    sd.strategy_id,
	    sd.product_level_value,
	    sd.store_level_value,
	    sd.pcd_id,
		spcd.pcd_start_date as spcd_pcd_start_date,
	    temp_1.pcd_start_date as temp_1_pcd_start_date,
	    case when spcd.pcd_start_date > temp_1.pcd_start_date then
		greatest (
	        sd.markdown_percentage,
	        temp_1.markdown_percentage
	    )
		when spcd.pcd_start_date = temp_1.pcd_start_date then temp_1.markdown_percentage
		else sd.markdown_percentage end as markdown_percentage,
	    sd.is_locked,
	    sd.created_at,
	    now() as updated_at,
	    sd.created_by,
	    %2$L as updated_by,
	    sd.product_level_id,
	    sd.store_level_id,
	    sd.id,
        temp_1.approval_status as approval_status_temp_1,
	    sd.approval_status as approval_status_1,
		sd.action_status as action_status_1,
	    lag(sd.pcd_id) over (
	        partition by sd.strategy_id, sd.product_level_id, sd.store_level_id order by spcd.pcd_start_date
	    ) as previous_pcd_id,
	    sd.channel_info,
	    sd.average_retail_price,
		--sd.markdown_type
		rank() over (
			partition by
			sd.strategy_id, sd.product_level_id, sd.store_level_id
			order by case when spcd.pcd_start_date > temp_1.pcd_start_date then
		greatest (
	        sd.markdown_percentage,
	        temp_1.markdown_percentage
	    )
		when spcd.pcd_start_date = temp_1.pcd_start_date then temp_1.markdown_percentage
		else sd.markdown_percentage end) as rank_md
	from price_markdown.tb_strategy_discount as sd
	join temp_1
	on
	    sd.strategy_id = temp_1.strategy_id
	    and sd.product_level_id = temp_1.product_level_id
	    and sd.store_level_id  = temp_1.store_level_id
	join price_markdown.tb_strategy_pcd as spcd
	on sd.strategy_id = spcd.strategy_id and sd.pcd_id = spcd.pcd_id
	where sd.strategy_id = ANY(%1$L)
	)
	select * from (
		select *,
		coalesce(
	        lag(markdown_percentage) over (
	            partition by strategy_id, product_level_id, store_level_id order by spcd_pcd_start_date), 0
	    ) as previous_markdown_percentage,
		price_markdown.fn_get_incremental_discount(
	        markdown_percentage,
	        coalesce(
	            lag(markdown_percentage) over (
	                partition by strategy_id, product_level_id, store_level_id order by spcd_pcd_start_date), 0
	        )
	    ) as incremental_discount,
		case
			when rank_md = 1 then ''First Markdown''
			else ''Final Sale Price''
		end as markdown_type,
		case
			when spcd_pcd_start_date = temp_1_pcd_start_date then approval_status_temp_1
			else approval_status_1
		end as approval_status,
		case
			when spcd_pcd_start_date = temp_1_pcd_start_date then ''Auto-Discount Roll-over''::price_markdown.action_status_enum
			else action_status_1
		end as action_status
from cte_1) temp_1
	where spcd_pcd_start_date >= temp_1_pcd_start_date
	--order by 1,2,4, spcd.pcd_start_date
	);', strategy_ids, in_user_id);
	execute temp_query;
	raise notice 'SQL 5 statement: %', temp_query;


	temp_query := 'DELETE FROM price_markdown.tb_strategy_discount where id in (select id from temp_2);';
	execute temp_query;


	temp_query := 'drop table if exists tb_temp_3;';
	execute temp_query;
	temp_query := Format('
		create temp table tb_temp_3 as (
		with new_data as (
			INSERT INTO price_markdown.tb_strategy_discount (strategy_id, product_level_value, store_level_value, pcd_id, markdown_percentage, is_locked, created_at, updated_at, created_by, updated_by, product_level_id, store_level_id, previous_markdown_percentage, incremental_discount, approval_status, previous_pcd_id, channel_info, average_retail_price, action_status, markdown_type)
			select strategy_id, product_level_value, store_level_value, pcd_id, markdown_percentage, is_locked, created_at, updated_at, created_by, updated_by::int, product_level_id, store_level_id, previous_markdown_percentage, incremental_discount, approval_status, previous_pcd_id, channel_info, average_retail_price, action_status, markdown_type
			from temp_2
			RETURNING
			strategy_id, id, pcd_id, product_level_id)
		select
		new_data.strategy_id,
		min(sm.strategy_name) as strategy_name,
		min(new_data.id) as min_strategy_disc_id,
		max(new_data.id) as max_strategy_disc_id,
		array_to_string(array_agg(distinct new_data.pcd_id), '','') as pcds,
		count(distinct new_data.product_level_id) as product_count,
		%1$L::int as user_id
		from new_data
		join price_markdown.tb_strategy_master as sm
		using(strategy_id)
		group by 1);',
	in_user_id);
	execute temp_query;
	raise notice 'SQL 6 statement: %', temp_query;

	end_time := clock_timestamp();

	total_time_taken := round(extract(second
	from
	(end_time - start_time)));

	raise notice 'Time taken SQL 2-B statement: %',
	total_time_taken;

	if array_length(strategy_ids, 1) > 0 then
		FOREACH strategy_id_item IN ARRAY strategy_ids
	        LOOP
				perform price_markdown.fn_populate_step4_data(strategy_id_item);
			END LOOP;
	end if;

	_query_combine := format('select
		tb_temp_3.*,
		%1$L::int as insert_discount_time
		from tb_temp_3',
	total_time_taken);

	return query execute _query_combine;
end;

$function$
;
