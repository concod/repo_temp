--liquibase formatted sql
--changeset anoop.madamsetty@impactanalytics.co:fn_update_approval_status_ia_reco-3 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: MTP-55539

DROP FUNCTION if exists price_markdown.fn_update_approval_status_ia_reco;

CREATE OR REPLACE FUNCTION price_markdown.fn_update_approval_status_ia_reco(payload jsonb, in_user_id integer)
 RETURNS TABLE(strategy_id integer, strategy_name text, min_strategy_disc_id integer, max_strategy_disc_id integer, user_id integer, insert_discount_time integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
	strategy_ids integer[];
	temp_query text := '';
	start_time TIMESTAMP;
	end_time TIMESTAMP;
	total_time_taken integer;
	_query_combine text := '';
	is_update_strategy_master integer;

begin
	start_time := clock_timestamp();

temp_query := 'drop table if exists tmp_payload;';

execute temp_query;

temp_query := Format(
	'create temp table tmp_payload as (
	select * from json_to_recordset(%L) as d(strategy_id int, product_level_id int, channel_info text, pcd_id int)
	)',
payload
        );

execute temp_query;

raise notice 'SQL 1 statement: %',
temp_query;

temp_query := 'select array_agg(distinct strategy_id) from tmp_payload';

execute temp_query
into
	strategy_ids;

temp_query := 'drop table if exists input_data_1;';

execute temp_query;

temp_query := format('create temp table input_data_1 as (
				select tp.strategy_id, tp.product_level_id, ts.store_level_id, tp.pcd_id, ts.markdown_percentage, tp.channel_info
				from tmp_payload tp left join price_markdown.tb_strategy_discount_ia ts
				on tp.strategy_id = ts.strategy_id and tp.product_level_id = ts.product_level_id and
				tp.channel_info = ts.channel_info and tp.pcd_id = ts.pcd_id
				where tp.strategy_id = any(%1$L)
			);',
strategy_ids);

execute temp_query;

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
						--''Finally Approved''::price_markdown.strategy_approval_status_enum as approval_status,
						--''Accepted IA reco''::price_markdown.action_status_enum as action_status,
					   	input_data.markdown_percentage as markdown_percentage,
					    spcd.pcd_start_date
					from price_markdown.tb_strategy_discount as sd
					join input_data_1 as input_data
					    on
					    sd.strategy_id = input_data.strategy_id
					    and sd.product_level_id = input_data.product_level_id
					    and sd.pcd_id = input_data.pcd_id
					and sd.store_level_id = input_data.store_level_id
					join price_markdown.tb_strategy_pcd as spcd
					    on sd.strategy_id = spcd.strategy_id and sd.pcd_id = spcd.pcd_id
					where sd.strategy_id = ANY(%L) and input_data.markdown_percentage is not null
					);',
strategy_ids
				);

execute temp_query;

raise notice 'SQL 2 statement: %',
temp_query;

temp_query := 'drop table if exists tb_temp_2;';

execute temp_query;

temp_query:= Format('
	create temp table tb_temp_2 as (
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
		sd.markdown_percentage as original_markdown_percentage,
	    sd.is_locked,
	    sd.created_at,
	    now() as updated_at,
	    sd.created_by,
	    %2$L as updated_by,
	    sd.product_level_id,
	    sd.store_level_id,
	    sd.id,
	    sd.approval_status as approval_status_1,
		sd.action_status as action_status_1,
	    lag(sd.pcd_id) over (
	        partition by sd.strategy_id, sd.product_level_id, sd.store_level_id order by spcd.pcd_start_date
	    ) as previous_pcd_id,
	    sd.channel_info,
	    sd.average_retail_price,
	    sd.currency_id,
	    sd.average_retail_price_with_vat,
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
			when spcd_pcd_start_date = temp_1_pcd_start_date then ''Finally Approved''::price_markdown.strategy_approval_status_enum
			when spcd_pcd_start_date > temp_1_pcd_start_date and original_markdown_percentage <> markdown_percentage then ''Initially Approved''::price_markdown.strategy_approval_status_enum
			else approval_status_1
		end as approval_status,
		case
			when spcd_pcd_start_date = temp_1_pcd_start_date then ''Accepted IA reco''::price_markdown.action_status_enum
			else action_status_1
		end as action_status
from cte_1) temp_1
	where spcd_pcd_start_date >= temp_1_pcd_start_date
	--order by 1,2,4, spcd.pcd_start_date
	);', strategy_ids, in_user_id
	);
	execute temp_query;

raise notice 'SQL 3 statement: %',
temp_query;

temp_query := 'DELETE FROM price_markdown.tb_strategy_discount where id in (select id from tb_temp_2);';

execute temp_query;

temp_query :=  'drop table if exists tb_temp_3;';
	execute temp_query;
	temp_query:= Format('
	create temp table tb_temp_3 as (
	with new_data as (
		INSERT INTO price_markdown.tb_strategy_discount (strategy_id, product_level_value, store_level_value, pcd_id, markdown_percentage, is_locked, created_at, updated_at, created_by, updated_by, product_level_id, store_level_id, previous_markdown_percentage, incremental_discount, approval_status, previous_pcd_id, channel_info, average_retail_price, action_status, markdown_type, currency_id, average_retail_price_with_vat)
		select strategy_id, product_level_value, store_level_value, pcd_id, markdown_percentage, is_locked, created_at, updated_at, created_by, updated_by::int, product_level_id, store_level_id, previous_markdown_percentage, incremental_discount, approval_status, previous_pcd_id, channel_info, average_retail_price, action_status, markdown_type, currency_id, average_retail_price_with_vat
		from tb_temp_2
		RETURNING
		strategy_id, id)
	select
	new_data.strategy_id,
	min(sm.strategy_name) as strategy_name,
	min(new_data.id) as min_strategy_disc_id,
	max(new_data.id) as max_strategy_disc_id,
	%1$L::int as user_id
	from new_data
	join price_markdown.tb_strategy_master as sm
	using(strategy_id)
	group by 1);', in_user_id);
	execute temp_query;
	RAISE NOTICE 'SQL 5 statement: %', temp_query;

end_time := clock_timestamp();

total_time_taken := round(EXTRACT(second FROM (end_time - start_time)));
RAISE NOTICE 'Time taken SQL 2-B statement: %', total_time_taken;

SELECT EXISTS (SELECT id FROM tb_temp_2)::int into is_update_strategy_master;

if is_update_strategy_master = 1 then
	temp_query := Format(
	'update
	    price_markdown.tb_strategy_master ts
	set
	    status = 2,
		updated_at = now(),
		updated_by = %2$L::integer
	where
	    ts.strategy_id = ANY(%1$L)
		and ts.status not in (3)',
	strategy_ids, in_user_id
        );

	execute temp_query;
	raise notice 'SQL 6 statement: %',
	temp_query;

end if;

_query_combine := format('select
tb_temp_3.*,
%1$L::int as insert_discount_time
from tb_temp_3', total_time_taken);
return query execute _query_combine;
end;

$function$
;
