--liquibase formatted sql
--changeset nikhil.madhusudan@impactanalytics.co:get_budget_hierarchy_label_1 runOnChange:true stripComments:false splitStatements:false context:Release_1_3 labels:MTP-91512
--comment: Returns budget hierarchy label per (hierarchy_value, dc) for OMS High Level Summary. Used in both Placement and Receipt timeline views.
--rollback: SELECT 1

DROP FUNCTION IF EXISTS oms.get_budget_hierarchy_label(text, text[], text[]);
DROP FUNCTION IF EXISTS oms.get_budget_hierarchy_label(text, text[], text[], jsonb);
DROP FUNCTION IF EXISTS oms.get_budget_hierarchy_label(text, text[], text[], jsonb, text[], text[]);

CREATE OR REPLACE FUNCTION oms.get_budget_hierarchy_label(
  selected_hierarchy text,
  hierarchy_values text[],
  dc_or_channels text[],
  hierarchy_filters jsonb DEFAULT '{}'::jsonb,
  p_fiscal_year_week text[] DEFAULT ARRAY[]::text[],
  p_fiscal_year_month text[] DEFAULT ARRAY[]::text[]
)
 RETURNS TABLE(hierarchy_value text, dc_or_channel text, budget_hierarchy_label text)
 LANGUAGE plpgsql
AS $function$
DECLARE
  budget_hierarchy_condition text := '';
  hierarchy_values_list text := '';
  dc_name_condition text := '';
  dc_list text := '';
  label_sql text := '';
  coarser_branch text := '';
  bph_filters_condition text := '';
  paf_filters_condition text := '';
  filter_col text;
  filter_list text;
  v_week_keys_sql text := '';
  v_month_keys_sql text := '';
  v_btp_time_condition text := '1=0';
BEGIN
  IF hierarchy_values IS NULL OR array_length(hierarchy_values, 1) IS NULL OR array_length(hierarchy_values, 1) = 0 THEN
    RETURN;
  END IF;

  -- Time-period scoped label:
  -- Week view -> WEEK keys only.
  -- Month view -> MONTH keys + child WEEK rows under those MONTH keys.
  IF p_fiscal_year_month IS NOT NULL AND array_length(p_fiscal_year_month, 1) > 0 THEN
    v_month_keys_sql := array_to_string(
      ARRAY(
        SELECT quote_literal(p_fiscal_year_month[i])
        FROM generate_series(1, array_length(p_fiscal_year_month, 1)) AS i
      ),
      ', '
    );
    v_btp_time_condition :=
      '(' ||
      '(btp.time_period_type = ''MONTH'' AND btp.time_period_key IN (' || v_month_keys_sql || ')) OR ' ||
      '(btp.time_period_type = ''WEEK'' AND btp.parent_time_period_id IN (' ||
        'SELECT btp_m.time_period_id FROM oms.budget_time_periods btp_m ' ||
        'WHERE btp_m.is_active = true AND btp_m.time_period_type = ''MONTH'' AND btp_m.time_period_key IN (' || v_month_keys_sql || ')' ||
      '))' ||
      ')';
  ELSIF p_fiscal_year_week IS NOT NULL AND array_length(p_fiscal_year_week, 1) > 0 THEN
    v_week_keys_sql := array_to_string(
      ARRAY(
        SELECT quote_literal(p_fiscal_year_week[i])
        FROM generate_series(1, array_length(p_fiscal_year_week, 1)) AS i
      ),
      ', '
    );
    v_btp_time_condition := '(btp.time_period_type = ''WEEK'' AND btp.time_period_key IN (' || v_week_keys_sql || '))';
  END IF;

  FOR filter_col IN
    SELECT unnest(ARRAY['l0_name','l1_name','l2_name','l3_name','l4_name','l5_name'])
  LOOP
    IF hierarchy_filters ? filter_col
      AND jsonb_typeof(hierarchy_filters -> filter_col) = 'array'
      AND jsonb_array_length(hierarchy_filters -> filter_col) > 0 THEN
      filter_list := array_to_string(
        ARRAY(
          SELECT quote_literal(v)
          FROM jsonb_array_elements_text(hierarchy_filters -> filter_col) AS v
          WHERE v IS NOT NULL AND btrim(v) <> ''
        ),
        ', '
      );
      IF filter_list IS NOT NULL AND filter_list <> '' THEN
        bph_filters_condition := bph_filters_condition || ' AND bph.' || filter_col || ' IN (' || filter_list || ')';
        paf_filters_condition := paf_filters_condition || ' AND paf.' || filter_col || ' IN (' || filter_list || ')';
      END IF;
    END IF;
  END LOOP;

  hierarchy_values_list := array_to_string(
    ARRAY(
      SELECT quote_literal(hierarchy_values[i])
      FROM generate_series(1, array_length(hierarchy_values, 1)) AS i
    ), ', ');
  budget_hierarchy_condition := 'bph.' || selected_hierarchy || ' IN (' || hierarchy_values_list || ')';

  -- Filter by dc names (matches get_oms_high_level_summary_monthly which uses dc.name)
  IF dc_or_channels IS NULL OR array_length(dc_or_channels, 1) IS NULL OR array_length(dc_or_channels, 1) = 0 THEN
    dc_name_condition := '1=1';
  ELSE
    dc_list := array_to_string(
      ARRAY(
        SELECT quote_literal(dc_or_channels[i])
        FROM generate_series(1, array_length(dc_or_channels, 1)) AS i
        WHERE dc_or_channels[i] IS NOT NULL
      ), ', ');
    IF dc_list = '' OR dc_list IS NULL THEN
      dc_name_condition := '1=1';
    ELSE
      dc_name_condition := 'dc.name IN (' || dc_list || ')';
    END IF;
  END IF;

  -- Coarser-level branch: when viewing by a level (e.g. l5_name), include budget rows at parent level (e.g. L4)
  -- so that "Budget at Class-DC for 7111" shows label "Class-DC" when View By Subclass for 7012 (subclass of 7111).
  -- Join PAF to map view hierarchy values to their parent; include bph rows at that parent level.
  IF selected_hierarchy = 'l5_name' THEN
    coarser_branch := '
      UNION ALL
      SELECT
        paf.l5_name::text AS hierarchy_value,
        dc.name::text AS dc_or_channel,
        bph.hierarchy_level,
        COALESCE(hr.ranking::text, ''_'' || bph.hierarchy_level) AS level_key
      FROM oms.budget_product_hierarchy bph
      JOIN oms.budget_allocation ba ON ba.hierarchy_id = bph.hierarchy_id
      JOIN oms.budget_time_periods btp ON ba.time_period_id = btp.time_period_id AND btp.is_active = true
      LEFT JOIN oms.hierarchy_rankings hr ON hr.hier_level = (
        CASE WHEN bph.hierarchy_level ~ ''^L[0-9]+$'' THEN LOWER(bph.hierarchy_level) || ''_name''
             ELSE LOWER(bph.hierarchy_level) END
      )
      JOIN global.product_attributes_filter paf ON paf.l4_name = bph.l4_name AND paf.l5_name IN (' || hierarchy_values_list || ')
      LEFT JOIN global.distribution_centres dc ON bph.loc_code = dc.linked_store_code
      WHERE bph.is_active = true
        AND ' || v_btp_time_condition || '
        AND bph.hierarchy_level = ''L4'' AND bph.l5_name IS NULL
        AND ' || dc_name_condition || '
        ' || paf_filters_condition || '
    ';
  ELSIF selected_hierarchy = 'l4_name' THEN
    coarser_branch := '
      UNION ALL
      SELECT
        paf.l4_name::text AS hierarchy_value,
        dc.name::text AS dc_or_channel,
        bph.hierarchy_level,
        COALESCE(hr.ranking::text, ''_'' || bph.hierarchy_level) AS level_key
      FROM oms.budget_product_hierarchy bph
      JOIN oms.budget_allocation ba ON ba.hierarchy_id = bph.hierarchy_id
      JOIN oms.budget_time_periods btp ON ba.time_period_id = btp.time_period_id AND btp.is_active = true
      LEFT JOIN oms.hierarchy_rankings hr ON hr.hier_level = (
        CASE WHEN bph.hierarchy_level ~ ''^L[0-9]+$'' THEN LOWER(bph.hierarchy_level) || ''_name''
             ELSE LOWER(bph.hierarchy_level) END
      )
      JOIN global.product_attributes_filter paf ON paf.l3_name = bph.l3_name AND paf.l4_name IN (' || hierarchy_values_list || ')
      LEFT JOIN global.distribution_centres dc ON bph.loc_code = dc.linked_store_code
      WHERE bph.is_active = true
        AND ' || v_btp_time_condition || '
        AND bph.hierarchy_level = ''L3'' AND bph.l4_name IS NULL
        AND ' || dc_name_condition || '
        ' || paf_filters_condition || '
    ';
  ELSIF selected_hierarchy = 'l3_name' THEN
    coarser_branch := '
      UNION ALL
      SELECT
        paf.l3_name::text AS hierarchy_value,
        dc.name::text AS dc_or_channel,
        bph.hierarchy_level,
        COALESCE(hr.ranking::text, ''_'' || bph.hierarchy_level) AS level_key
      FROM oms.budget_product_hierarchy bph
      JOIN oms.budget_allocation ba ON ba.hierarchy_id = bph.hierarchy_id
      JOIN oms.budget_time_periods btp ON ba.time_period_id = btp.time_period_id AND btp.is_active = true
      LEFT JOIN oms.hierarchy_rankings hr ON hr.hier_level = (
        CASE WHEN bph.hierarchy_level ~ ''^L[0-9]+$'' THEN LOWER(bph.hierarchy_level) || ''_name''
             ELSE LOWER(bph.hierarchy_level) END
      )
      JOIN global.product_attributes_filter paf ON paf.l2_name = bph.l2_name AND paf.l3_name IN (' || hierarchy_values_list || ')
      LEFT JOIN global.distribution_centres dc ON bph.loc_code = dc.linked_store_code
      WHERE bph.is_active = true
        AND ' || v_btp_time_condition || '
        AND bph.hierarchy_level = ''L2'' AND bph.l3_name IS NULL
        AND ' || dc_name_condition || '
        ' || paf_filters_condition || '
    ';
  ELSIF selected_hierarchy = 'l2_name' THEN
    coarser_branch := '
      UNION ALL
      SELECT
        paf.l2_name::text AS hierarchy_value,
        dc.name::text AS dc_or_channel,
        bph.hierarchy_level,
        COALESCE(hr.ranking::text, ''_'' || bph.hierarchy_level) AS level_key
      FROM oms.budget_product_hierarchy bph
      JOIN oms.budget_allocation ba ON ba.hierarchy_id = bph.hierarchy_id
      JOIN oms.budget_time_periods btp ON ba.time_period_id = btp.time_period_id AND btp.is_active = true
      LEFT JOIN oms.hierarchy_rankings hr ON hr.hier_level = (
        CASE WHEN bph.hierarchy_level ~ ''^L[0-9]+$'' THEN LOWER(bph.hierarchy_level) || ''_name''
             ELSE LOWER(bph.hierarchy_level) END
      )
      JOIN global.product_attributes_filter paf ON paf.l1_name = bph.l1_name AND paf.l2_name IN (' || hierarchy_values_list || ')
      LEFT JOIN global.distribution_centres dc ON bph.loc_code = dc.linked_store_code
      WHERE bph.is_active = true
        AND ' || v_btp_time_condition || '
        AND bph.hierarchy_level = ''L1'' AND bph.l2_name IS NULL
        AND ' || dc_name_condition || '
        ' || paf_filters_condition || '
    ';
  ELSE
    coarser_branch := '';
  END IF;

  -- budget_product_hierarchy.hierarchy_level is "L3", "L4", "L5", "article"; hierarchy_rankings.hier_level is "l3_name", "l4_name", etc.
  -- Map L3->l3_name, L4->l4_name for join. Label from global.product_generic_schema_mapping.display_name for that generic_column_name.
  label_sql := '
    WITH budget_levels AS (
      SELECT
        bph.' || selected_hierarchy || '::text AS hierarchy_value,
        dc.name::text AS dc_or_channel,
        bph.hierarchy_level,
        COALESCE(hr.ranking::text, ''_'' || bph.hierarchy_level) AS level_key
      FROM oms.budget_product_hierarchy bph
      JOIN oms.budget_allocation ba ON ba.hierarchy_id = bph.hierarchy_id
      JOIN oms.budget_time_periods btp ON ba.time_period_id = btp.time_period_id AND btp.is_active = true
      LEFT JOIN oms.hierarchy_rankings hr ON hr.hier_level = (
        CASE WHEN bph.hierarchy_level ~ ''^L[0-9]+$'' THEN LOWER(bph.hierarchy_level) || ''_name''
             ELSE LOWER(bph.hierarchy_level) END
      )
      LEFT JOIN global.distribution_centres dc ON bph.loc_code = dc.linked_store_code
      WHERE bph.is_active = true
        AND ' || v_btp_time_condition || '
        AND ' || budget_hierarchy_condition || '
        AND ' || dc_name_condition || '
        ' || bph_filters_condition || '
      ' || coarser_branch || '
    ),
    agg AS (
      SELECT
        hierarchy_value,
        dc_or_channel,
        COUNT(DISTINCT level_key) AS level_count,
        MIN(hierarchy_level) AS single_level
      FROM budget_levels
      GROUP BY 1, 2
    ),
    hier_to_col AS (
      SELECT
        hierarchy_value,
        dc_or_channel,
        level_count,
        single_level,
        CASE WHEN single_level ~ ''^L[0-9]+$'' THEN LOWER(single_level) || ''_name''
             ELSE LOWER(single_level) END AS generic_column_name
      FROM agg
    )
    SELECT
      h.hierarchy_value::text,
      h.dc_or_channel::text,
      (CASE
        WHEN h.level_count = 0 THEN ''NA''
        WHEN h.level_count > 1 THEN ''Mixed''
        ELSE COALESCE(pgsm.display_name, h.single_level::text, ''NA'')
      END)::text AS budget_hierarchy_label
    FROM hier_to_col h
    LEFT JOIN global.product_generic_schema_mapping pgsm
      ON pgsm.generic_column_name = h.generic_column_name
  ';

  RAISE NOTICE 'final query = %', label_sql;

  RETURN QUERY EXECUTE label_sql;
END;
$function$
;