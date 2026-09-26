--liquibase formatted sql
--changeset rishabh.swarnkar@impactanalytics.co:match_with_v2 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:item_smart_initial_commit
--comment: initial changeset for match_with_wp_edit.sql
--rollback: SELECT 1

DROP FUNCTION IF EXISTS item_smart.match_with_wp_edit(date, date, jsonb, text, _text, _text, text, text);

CREATE OR REPLACE FUNCTION item_smart.match_with_wp_edit(sdate date, edate date, filters jsonb, dept text, channels text[], subchannels text[], editable_kpi text, planing_level text)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
DECLARE
  updated_row_count INTEGER := 0;
  where_clause TEXT := '';
  wp_table_name TEXT;
  select_query TEXT;
  filter JSONB;
  attribute_name TEXT;
  values TEXT;
  operator TEXT;
  update_query1 TEXT;
  update_query2 TEXT;
  _st timestamptz;
  v_gen_random_uuid text := gen_random_uuid()::varchar;
BEGIN
  -- Drop the temporary table
  DROP TABLE IF EXISTS complete_data;
  wp_table_name := 'item_smart.wp_master_' || dept;

  -- Build the WHERE clause dynamically from the filters
  FOR filter IN SELECT * FROM jsonb_array_elements(filters)
  LOOP
    attribute_name := filter->>'attribute_name';
    values := (
      SELECT string_agg(quote_literal(value), ', ')
      FROM jsonb_array_elements_text(filter->'value') value
    );
    operator := filter->>'operator';

    -- Append the where_clause
    IF where_clause = '' THEN
      where_clause := attribute_name || ' ' || operator || ' (' || values || ')';
    ELSE
      where_clause := where_clause || ' AND ' || attribute_name || ' ' || operator || ' (' || values || ')';
    END IF;
  END LOOP;

  RAISE NOTICE 'v_sql : %', where_clause;

  -- perform sp log
  PERFORM global.sp_log(
    v_gen_random_uuid,
    'item_smart.match_with_wp_edit',
    'before executing select_query',
    select_query,
    jsonb_build_object('sdate',$1,'edate',$2,'filters',$3,'dept',$4,'channels',$5,'subchannels',$6,'editable_kpi',$7,'planing_level',$8)
  );

  -- Form the SELECT query to populate the temporary table
  _st := clock_timestamp();
  select_query := format(
    '
    CREATE TEMP TABLE complete_data AS
    WITH hierarchy_data AS (
      SELECT DISTINCT
        fdm.fiscal_year_week,
        pa.hierarchy_code
      FROM item_smart.mv_product_hierarchies_filter pa
      CROSS JOIN "global".fiscal_date_mapping fdm
      WHERE %s
        AND fdm.calendar_date BETWEEN %L AND %L
    ),
    wp_data AS (
      SELECT
        id.hierarchy_code,
        id.current_week,
        id.channel,
        id.sub_channel,
		id.fully_loaded_cost as auc_fully_loaded,
		id.recomm_receipt_units


      FROM %s id
      JOIN hierarchy_data hd
        ON hd.hierarchy_code = id.hierarchy_code
       AND hd.fiscal_year_week = id.current_week
      WHERE id.channel = ANY(%L)

    ',
    where_clause,
    sdate,
    edate,
    wp_table_name,
    channels
  );

 -- Add the sub_channel filter if subchannels are provided
    IF array_length(subchannels, 1) > 0 THEN
        select_query := select_query || ' AND id.sub_channel = ANY(%L)';
        select_query := format(select_query, subchannels);  -- format subchannels into the query
    END IF;

  -- Final part of the query
    select_query := select_query || '
        )
        SELECT * FROM wp_data;
    ';

  RAISE NOTICE 'Formed SELECT query: %', select_query;
   -- Execute the dynamic SELECT query to create and populate the temporary table
  EXECUTE select_query;

  RAISE NOTICE '_time: %, select statement', (clock_timestamp() - _st);

  _st := clock_timestamp();
  CREATE INDEX idx_complete_data ON complete_data(hierarchy_code, current_week, channel, sub_channel);
  RAISE NOTICE '_time: %, indexing', (clock_timestamp() - _st);

  _st := clock_timestamp();
  update_query1 := format(
    '
    UPDATE %s wp
       SET %s
    FROM complete_data cd
    WHERE wp.hierarchy_code = cd.hierarchy_code
      AND wp.current_week = cd.current_week
      AND wp.channel = cd.channel
      AND wp.sub_channel = cd.sub_channel
    ',
    wp_table_name,

	CASE
           WHEN editable_kpi = 'recomm_receipt_units' THEN
              'on_order_unplaced_total_unit = cd.recomm_receipt_units'
		   WHEN editable_kpi = 'written_auc' THEN
              'written_auc = cd.auc_fully_loaded'
           
           ELSE 'NULL'
       END
    
  );
  RAISE NOTICE 'Formed UPDATE query 1: %', update_query1;
  -- Execute the dynamic UPDATE queries sequentially
  EXECUTE update_query1;

  PERFORM global.sp_log(
    v_gen_random_uuid,
    'item_smart.match_with_wp_edit',
    'After executing update_query1',
    update_query1,
    jsonb_build_object('sdate',$1,'edate',$2,'filters',$3,'dept',$4,'channels',$5,'subchannels',$6,'editable_kpi',$7,'planing_level',$8)
  );
  RAISE NOTICE '_time: %, update 1', (clock_timestamp() - _st);

  _st := clock_timestamp();
  update_query2 := format(
    '
    UPDATE %s wp
       SET %s
    FROM complete_data cd
    WHERE wp.hierarchy_code = cd.hierarchy_code
      AND wp.current_week = cd.current_week
      AND wp.channel = cd.channel
      AND wp.sub_channel = cd.sub_channel
    ',
    wp_table_name,
		CASE
           WHEN editable_kpi = 'recomm_receipt_units' THEN
			'on_order_unplaced_total_cost= (COALESCE(wp.on_order_unplaced_total_unit, 0) * COALESCE(wp.auc_landed, 0)),
		    total_receipt_units= (COALESCE(wp.on_order_unplaced_total_unit, 0) + COALESCE(wp.on_order_placed_total_unit, 0)),
		    total_receipt_cost= (COALESCE(wp.on_order_unplaced_total_unit, 0) * COALESCE(wp.auc_landed, 0)) + COALESCE(wp.on_order_placed_total_cost, 0),
		    total_receipt_auc= ((COALESCE(wp.on_order_unplaced_total_unit, 0) * COALESCE(wp.auc_landed, 0)) + COALESCE(wp.on_order_placed_total_cost, 0)) / NULLIF((COALESCE(wp.on_order_unplaced_total_unit, 0) + COALESCE(wp.on_order_placed_total_unit, 0)), 0)
'
           
          WHEN editable_kpi = 'written_auc' THEN
		    'written_sales_cost= (COALESCE(wp.written_sales_units, 0)) * COALESCE(wp.written_auc, 0),
		    written_gm_dollar= (COALESCE(wp.written_sales_dollars, 0)) - ((COALESCE(wp.written_sales_units, 0)) * COALESCE(wp.written_auc, 0)),
		    written_gm_perc= (COALESCE(wp.written_sales_dollars, 0)) - ((COALESCE(wp.written_sales_units, 0)) * COALESCE(wp.written_auc, 0))/ NULLIF(COALESCE(wp.written_sales_dollars, 0), 0)
'
		ELSE 'NULL'
       END
  );
  RAISE NOTICE 'Formed UPDATE query 2: %', update_query2;
  EXECUTE update_query2;
  RAISE NOTICE '_time: %, update 2', (clock_timestamp() - _st);

  -- Update the row count
  GET DIAGNOSTICS updated_row_count = ROW_COUNT;

  -- perform sp log
  PERFORM global.sp_log(
    v_gen_random_uuid,
    'item_smart.match_with_wp_edit',
    'After executing update_query2',
    update_query2,
    jsonb_build_object('sdate',$1,'edate',$2,'filters',$3,'dept',$4,'channels',$5,'subchannels',$6,'editable_kpi',$7,'planing_level',$8)
  );

  RETURN updated_row_count;
END;
$function$
;
