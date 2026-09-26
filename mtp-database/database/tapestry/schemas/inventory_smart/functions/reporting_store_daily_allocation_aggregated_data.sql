--liquibase formatted sql
--changeset tarun.tyagi:reporting_store_daily_allocation_aggregated_data runOnChange:true stripComments:false splitStatements:false context:MTP-59420 labels:MTP-59420
--comment: updated kpi query based on MTP-59420 query updates
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.reporting_store_daily_allocation_aggregated_data(input refcursor, product_attributes jsonb, store_attributes jsonb, _current_date character varying);
CREATE OR REPLACE FUNCTION inventory_smart.reporting_store_daily_allocation_aggregated_data(
    input refcursor,
    product_attributes jsonb,
    store_attributes jsonb,
    _current_date character varying
    ) RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
DECLARE
    _query_pm TEXT := '';
    _query_pa TEXT := '';
    _query_sa TEXT := '';
    _query_store_details TEXT := '';
    _query_reserve_units TEXT := '';
    _query_allocations TEXT := '';
    _query_product_details TEXT := '';
    _pm_filter TEXT := '';
    _query_combine TEXT := '';
    _channel text := inventory_smart.get_channel_from_input(store_attributes);
BEGIN
    RAISE NOTICE '%', store_attributes->>'channel';
    product_attributes := product_attributes || jsonb_build_object('channel', _channel);
    IF _current_date IS NOT NULL AND _current_date != '' THEN
        _pm_filter := format('WHERE (created_at AT TIME ZONE ''Pacific/Auckland'')::date = %L::date AND status = 3 AND is_deleted = false', _current_date);
    ELSE
        _pm_filter := 'WHERE status = 3 AND is_deleted = false and (created_at::timestamptz AT TIME ZONE ''Pacific/Auckland'')::date = now()::date';
    END IF;
   	
   	_query_sa := global.form_main_table_filters('store_attributes_filter', store_attributes);
    _query_pa := global.form_main_table_filters('product_attributes_filter', product_attributes);
   	IF _query_pa = '' THEN
        _query_pa := 'WHERE TRUE';
    END IF;
	IF _query_sa = '' THEN
        _query_sa := 'WHERE TRUE';
    END IF;
	RAISE NOTICE 'query pa --> %', _query_pa;
	RAISE NOTICE 'query sa --> %', _query_sa;

    _query_combine := '
		WITH plan_master AS
		(
			SELECT plan_code
			FROM   inventory_smart.plan_master
			WHERE  (
							created_at at time zone ''Pacific/Auckland'' ) :: date = (' || quote_literal(_current_date) || ') :: date
			AND    status = 3
			AND    is_deleted = false), store_details AS
		(
			SELECT store_code
			FROM   global.store_attributes_filter
			' || _query_sa || '
		), product_details AS
		(
						SELECT DISTINCT article,
										style_name,
										l0_name,
										l1_name,
										l2_name,
										l3_name,
										l4_name,
										l5_name
						FROM            global.product_attributes_filter
						' || _query_pa || '
		), reserved_units AS
		(
				SELECT   article,
						sum(quantity) AS reserve_quantity
				FROM	 inventory_smart.dc_reserve_quantity
				WHERE    (
								reservation_till_date at time zone ''Pacific/Auckland'' ) :: date = (' || quote_literal(_current_date) || ') :: date
				GROUP BY article), gurobi AS
		(
				SELECT   allocation_code,
						article,
						sum(alloc) alloc,
						avg(inv)   inv
				FROM     (
									SELECT     allocation_code,
												article,
												store,
												sum(inv_avai)             inv,
												sum(allocated_total)      alloc,
												sum(original_forecast)    OF,
												sum(constrained_forecast) cf ,
												sum(demand)               demand,
												sum(oh)                   oh,
												sum(oo)                   oo,
												sum(it)                   it,
												avg(min)                  min,
												avg(max)                  max,
												sum(oh + oo + it)         invv,
												avg(wos)                  wos
									FROM       inventory_smart.create_allocation_result_flat_gurobi x
									INNER JOIN product_details paf
									using     (article)
									INNER JOIN store_details saf
									ON         x.store = saf.store_code
									WHERE      allocation_code IN
												(
													SELECT *
													FROM   plan_master)
									GROUP BY   1,
												2,
												3) y
				GROUP BY 1,
						2)
		SELECT count(DISTINCT
			CASE
					WHEN alloc > 0 THEN allocation_code
			END) 								allocation_count,
			count(DISTINCT
			CASE
					WHEN alloc > 0 THEN article
			END)                                style_color_count,
			sum(alloc)                          unit_allocated,
			sum(inv) - sum(alloc) - sum(res) AS dc_available
		FROM   (
						SELECT    a.*,
								COALESCE(reserve_quantity, 0) res
						FROM      gurobi a
						LEFT JOIN reserved_units b
						using     (article)) c
		WHERE  alloc > 0;
	';
    
    RAISE NOTICE 'query combine --> %', _query_combine;

    OPEN input FOR EXECUTE _query_combine;
    RETURN input;
END
$function$
;
