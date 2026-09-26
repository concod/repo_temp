--liquibase formatted sql
--changeset sidharth.harish@impactanalytics.co:fn_approval_incremental_discount_simulation_3 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:approval
--comment: added security definer

DROP FUNCTION if exists price_markdown.fn_approval_incremental_discount_simulation;
CREATE OR REPLACE FUNCTION price_markdown.fn_approval_incremental_discount_simulation(payload_json jsonb, in_user_id integer, _strategy_id integer[])
 RETURNS TABLE(strategy_id integer, strategy_name text, min_strategy_disc_id integer, max_strategy_disc_id integer, user_id integer, insert_discount_time integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
	vl_test_query text :=  '';
	_query_combine text := '';
   	dummy_data_query text:=    'select null::jsonb';
    simulation_id_filter text := Format('ANY(%L)', _strategy_id);
	start_time TIMESTAMP;
	end_time TIMESTAMP;
	total_time_taken integer;
begin
	start_time := clock_timestamp();
	vl_test_query :=  'drop table if exists input_data_1;';
	execute vl_test_query;

	vl_test_query:= Format(
	'create temp table input_data_1 as (
	select * from json_to_recordset(%L) as d(strategy_id int, product_level_id int, channel_info text, pcd_id int, fin_incremental_discount int)
	)', payload_json
        );
	execute vl_test_query;
    RAISE NOTICE 'SQL 1 statement: %', vl_test_query;

	vl_test_query :=  'drop table if exists tb_temp_1;';
	execute vl_test_query;
	vl_test_query:= Format('
	create temp table tb_temp_1 as (
	select
	    sd.strategy_id,
	    sd.product_level_id,
	    sd.store_level_id,
	    sd.pcd_id,
	    sd.channel_info,
	    case
	        when input_data.fin_incremental_discount = 0 and sd.previous_markdown_percentage is not null then sd.previous_markdown_percentage
	        when input_data.fin_incremental_discount = 0 and sd.previous_markdown_percentage is null then 0
	        else price_markdown.fn_get_total_discount(
	            coalesce(
	            sd.incremental_discount * (input_data.fin_incremental_discount/nullif(sd.incremental_discount,0)),
	            input_data.fin_incremental_discount
	            ), sd.previous_markdown_percentage)
	    end  as total_discount,
	    spcd.pcd_start_date
	from price_markdown.tb_strategy_discount as sd
	join input_data_1 as input_data
	    on
	    sd.strategy_id = input_data.strategy_id
	    and sd.product_level_id = input_data.product_level_id
	    and sd.pcd_id = input_data.pcd_id
	and sd.channel_info = input_data.channel_info
	join price_markdown.tb_strategy_pcd as spcd
	    on sd.strategy_id = spcd.strategy_id and sd.pcd_id = spcd.pcd_id
	where sd.strategy_id = ANY(%L) and sd.approval_status <> ''Finally Approved''
	);', _strategy_id
	);
	execute vl_test_query;
	RAISE NOTICE 'SQL 2 statement: %', vl_test_query;

	vl_test_query :=  'drop table if exists tb_temp_2;';
	execute vl_test_query;
	vl_test_query:= Format('
	create temp table tb_temp_2 as (
	with cte_1 as (
	select
	    sd.strategy_id,
	    sd.product_level_value,
	    sd.store_level_value,
	    sd.pcd_id,
		spcd.pcd_start_date as spcd_pcd_start_date,
	    tb_temp_1.pcd_start_date as tb_temp_1_pcd_start_date,
	    case
			when spcd.pcd_start_date > tb_temp_1.pcd_start_date then
				greatest (
			        sd.markdown_percentage,
			        tb_temp_1.total_discount
			    )
			when spcd.pcd_start_date = tb_temp_1.pcd_start_date then tb_temp_1.total_discount
		else sd.markdown_percentage end as markdown_percentage,
	    sd.is_locked,
	    sd.created_at,
	    now() as updated_at,
	    sd.created_by,
	    %2$L as updated_by,
	    sd.product_level_id,
	    sd.store_level_id,
	    sd.id,
--	    coalesce(
--	        lag(sd.markdown_percentage) over (
--	            partition by sd.strategy_id, sd.product_level_id, sd.store_level_id order by spcd.pcd_start_date), 0
--	    ) as previous_markdown_percentage,
--	    price_markdown.fn_get_incremental_discount(
--	        greatest (
--	            sd.markdown_percentage,
--	            tb_temp_1.total_discount
--	        ),
--	        coalesce(
--	            lag(sd.markdown_percentage) over (
--	                partition by sd.strategy_id, sd.product_level_id, sd.store_level_id order by spcd.pcd_start_date), 0
--	        )
--	    ) as incremental_discount,
	    sd.approval_status,
	    lag(sd.pcd_id) over (
	        partition by sd.strategy_id, sd.product_level_id, sd.store_level_id order by spcd.pcd_start_date
	    ) as previous_pcd_id,
	    sd.channel_info,
	    sd.average_retail_price,
		sd.action_status,
		rank() over (
			partition by
			sd.strategy_id, sd.product_level_id, sd.store_level_id
			order by case when spcd.pcd_start_date > tb_temp_1.pcd_start_date then
		greatest (
	        sd.markdown_percentage,
	        tb_temp_1.total_discount
	    )
		when spcd.pcd_start_date = tb_temp_1.pcd_start_date then tb_temp_1.total_discount
		else sd.markdown_percentage end) as rank_md
	from price_markdown.tb_strategy_discount as sd
	join tb_temp_1
	on
	    sd.strategy_id = tb_temp_1.strategy_id
	    and sd.product_level_id = tb_temp_1.product_level_id
	    and sd.store_level_id  = tb_temp_1.store_level_id
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
		end as markdown_type
from cte_1) temp_1
	where spcd_pcd_start_date >= tb_temp_1_pcd_start_date
	--order by 1,2,4, spcd.pcd_start_date
	);', _strategy_id, in_user_id
	);
	execute vl_test_query;
	RAISE NOTICE 'SQL 3 statement: %', vl_test_query;


	vl_test_query := 'DELETE FROM price_markdown.tb_strategy_discount where id in (select id from tb_temp_2);';
	execute vl_test_query;
	RAISE NOTICE 'SQL 4 statement: %', vl_test_query;


	vl_test_query :=  'drop table if exists tb_temp_3;';
	execute vl_test_query;
	vl_test_query:= Format('
	create temp table tb_temp_3 as (
	with new_data as (
		INSERT INTO price_markdown.tb_strategy_discount (strategy_id, product_level_value, store_level_value, pcd_id, markdown_percentage, is_locked, created_at, updated_at, created_by, updated_by, product_level_id, store_level_id, previous_markdown_percentage, incremental_discount, approval_status, previous_pcd_id, channel_info, average_retail_price, action_status, markdown_type)
		select strategy_id, product_level_value, store_level_value, pcd_id, markdown_percentage, is_locked, created_at, updated_at, created_by, updated_by::int, product_level_id, store_level_id, previous_markdown_percentage, incremental_discount, approval_status, previous_pcd_id, channel_info, average_retail_price, action_status, markdown_type
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
	execute vl_test_query;
	RAISE NOTICE 'SQL 5 statement: %', vl_test_query;

	end_time := clock_timestamp();

	total_time_taken := round(EXTRACT(second FROM (end_time - start_time)));
	RAISE NOTICE 'Time taken SQL 2-B statement: %', total_time_taken;

	_query_combine := format('select
	tb_temp_3.*,
	%1$L::int as insert_discount_time
	from tb_temp_3', total_time_taken);
	return query execute _query_combine;

END;
$function$
;
