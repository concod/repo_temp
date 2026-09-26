-- liquibase formatted sql
-- changeset akashkumar.rana@impactanalytics.co:mv_style_ruleset_mapping_updates-2 stripComments:false runOnChange:true splitStatements:false context:mv_style_ruleset_mapping_updated-draft-thing-2 labels:mv_style_ruleset_mapping_updated-draft-thing-2 
-- comment: update changeset for mv_style_ruleset_mapping_2   

DROP MATERIALIZED VIEW IF EXISTS size_smart.mv_style_ruleset_mapping;

-- Properly optimized version of the materialized view with master rule fallback
-- size_smart.mv_style_ruleset_mapping source

CREATE MATERIALIZED VIEW size_smart.mv_style_ruleset_mapping
AS WITH style_size_ranges AS (
         SELECT mv_hierarchy_size_ranges.l0_name,
            mv_hierarchy_size_ranges.l1_name,
            mv_hierarchy_size_ranges.l2_name,
            mv_hierarchy_size_ranges.l3_name,
            mv_hierarchy_size_ranges.l4_name,
            mv_hierarchy_size_ranges.l5_name,
            mv_hierarchy_size_ranges.l6_name,
            mv_hierarchy_size_ranges.l7_name,
            mv_hierarchy_size_ranges.l8_name,
            mv_hierarchy_size_ranges.size_range_id
           FROM size_smart.mv_hierarchy_size_ranges
        ), rules_with_specificity AS (
         SELECT r.id AS rule_id,
            r.name AS rule_name,
            r.tag AS rule_tag,
            r.levels,
                CASE
                    WHEN r.levels IS NULL THEN 0
                    ELSE
                    CASE
                        WHEN (r.levels -> 'l0_name'::text) IS NOT NULL THEN 1
                        ELSE 0
                    END +
                    CASE
                        WHEN (r.levels -> 'l1_name'::text) IS NOT NULL THEN 1
                        ELSE 0
                    END +
                    CASE
                        WHEN (r.levels -> 'l2_name'::text) IS NOT NULL THEN 1
                        ELSE 0
                    END +
                    CASE
                        WHEN (r.levels -> 'l3_name'::text) IS NOT NULL THEN 1
                        ELSE 0
                    END +
                    CASE
                        WHEN (r.levels -> 'l4_name'::text) IS NOT NULL THEN 1
                        ELSE 0
                    END +
                    CASE
                        WHEN (r.levels -> 'l5_name'::text) IS NOT NULL THEN 1
                        ELSE 0
                    END +
                    CASE
                        WHEN (r.levels -> 'l6_name'::text) IS NOT NULL THEN 1
                        ELSE 0
                    END +
                    CASE
                        WHEN (r.levels -> 'l7_name'::text) IS NOT NULL THEN 1
                        ELSE 0
                    END +
                    CASE
                        WHEN (r.levels -> 'l8_name'::text) IS NOT NULL THEN 1
                        ELSE 0
                    END
                END AS specificity
           FROM size_smart.tb_rule_config r
          WHERE r.type::text = 'default'::text AND r.is_deleted = false AND r.status::text = 'Active'::text
        ), hierarchy_rule_matches AS (
         SELECT s.l0_name,
            s.l1_name,
            s.l2_name,
            s.l3_name,
            s.l4_name,
            s.l5_name,
            s.l6_name,
            s.l7_name,
            s.l8_name,
            s.size_range_id,
            r.rule_id,
            r.rule_name,
            r.rule_tag,
            r.specificity,
                CASE
                    WHEN r.rule_tag::text = 'master'::text THEN 1
                    ELSE 0
                END AS match_priority
           FROM style_size_ranges s
             CROSS JOIN rules_with_specificity r
          WHERE r.rule_tag::text = 'master'::text OR r.rule_tag::text <> 'master'::text AND r.levels IS NOT NULL AND ((r.levels -> 'l0_name'::text) IS NULL OR (r.levels -> 'l0_name'::text) @> to_jsonb(COALESCE(s.l0_name, ''::character varying))) AND ((r.levels -> 'l1_name'::text) IS NULL OR (r.levels -> 'l1_name'::text) @> to_jsonb(COALESCE(s.l1_name, ''::character varying))) AND ((r.levels -> 'l2_name'::text) IS NULL OR (r.levels -> 'l2_name'::text) @> to_jsonb(COALESCE(s.l2_name, ''::character varying))) AND ((r.levels -> 'l3_name'::text) IS NULL OR (r.levels -> 'l3_name'::text) @> to_jsonb(COALESCE(s.l3_name, ''::character varying))) AND ((r.levels -> 'l4_name'::text) IS NULL OR (r.levels -> 'l4_name'::text) @> to_jsonb(COALESCE(s.l4_name, ''::character varying))) AND ((r.levels -> 'l5_name'::text) IS NULL OR (r.levels -> 'l5_name'::text) @> to_jsonb(COALESCE(s.l5_name, ''::character varying))) AND ((r.levels -> 'l6_name'::text) IS NULL OR (r.levels -> 'l6_name'::text) @> to_jsonb(COALESCE(s.l6_name, ''::character varying))) AND ((r.levels -> 'l7_name'::text) IS NULL OR (r.levels -> 'l7_name'::text) @> to_jsonb(COALESCE(s.l7_name, ''::character varying))) AND ((r.levels -> 'l8_name'::text) IS NULL OR (r.levels -> 'l8_name'::text) @> to_jsonb(COALESCE(s.l8_name, ''::character varying)))
        ), best_rules AS (
         SELECT hierarchy_rule_matches.l0_name,
            hierarchy_rule_matches.l1_name,
            hierarchy_rule_matches.l2_name,
            hierarchy_rule_matches.l3_name,
            hierarchy_rule_matches.l4_name,
            hierarchy_rule_matches.l5_name,
            hierarchy_rule_matches.l6_name,
            hierarchy_rule_matches.l7_name,
            hierarchy_rule_matches.l8_name,
            hierarchy_rule_matches.size_range_id,
            hierarchy_rule_matches.rule_id,
            hierarchy_rule_matches.rule_name,
            hierarchy_rule_matches.rule_tag,
            hierarchy_rule_matches.specificity,
            hierarchy_rule_matches.match_priority
           FROM hierarchy_rule_matches
        ), style_rulesets AS (
         SELECT ranked_rules.l0_name,
            ranked_rules.l1_name,
            ranked_rules.l2_name,
            ranked_rules.l3_name,
            ranked_rules.l4_name,
            ranked_rules.l5_name,
            ranked_rules.l6_name,
            ranked_rules.l7_name,
            ranked_rules.l8_name,
            ranked_rules.size_range_id,
            ranked_rules.rule_id,
            ranked_rules.rule_tag,
            ranked_rules.ruleset_id
           FROM ( SELECT br.l0_name,
                    br.l1_name,
                    br.l2_name,
                    br.l3_name,
                    br.l4_name,
                    br.l5_name,
                    br.l6_name,
                    br.l7_name,
                    br.l8_name,
                    br.size_range_id,
                    br.rule_id,
                    br.rule_tag,
                    rs.id AS ruleset_id,
                    row_number() OVER (PARTITION BY br.l0_name, br.l1_name, br.l2_name, br.l3_name, br.l4_name, br.l5_name, br.l6_name, br.l7_name, br.l8_name, br.size_range_id ORDER BY br.match_priority, br.specificity DESC, br.rule_id DESC) AS final_rank
                   FROM best_rules br
                     LEFT JOIN size_smart.tb_ruleset_config rs ON rs.rule_config_id = br.rule_id AND rs.status::text = 'Active'::text
                  WHERE br.rule_tag::text = 'master'::text OR br.rule_tag::text <> 'master'::text AND rs.id IS NOT NULL AND (EXISTS ( SELECT 1
                           FROM size_smart.tb_ruleset_config_size_range rcsr
                          WHERE rcsr.ruleset_config_id = rs.id AND rcsr.size_config_mst_id = br.size_range_id))) ranked_rules
          WHERE ranked_rules.final_rank = 1
        ), size_ranges AS (
         SELECT sr_1.size_range_id,
            COALESCE(jsonb_agg(DISTINCT s.name ORDER BY s.name) FILTER (WHERE s.name IS NOT NULL), '[]'::jsonb) AS size_ranges
           FROM ( SELECT DISTINCT style_rulesets.size_range_id
                   FROM style_rulesets) sr_1
             LEFT JOIN size_smart.tb_size_config sc ON sc.size_master_id = sr_1.size_range_id
             LEFT JOIN size_smart.tb_size s ON s.id = sc.size_id
          GROUP BY sr_1.size_range_id
         HAVING COALESCE(jsonb_agg(DISTINCT s.name ORDER BY s.name) FILTER (WHERE s.name IS NOT NULL), '[]'::jsonb) <> '[]'::jsonb
        ), product_attribute_counts AS (
         SELECT rcpa.ruleset_config_id,
            count(*) AS attribute_count
           FROM size_smart.tb_ruleset_config_product_attribute rcpa
          WHERE (rcpa.ruleset_config_id IN ( SELECT DISTINCT style_rulesets.ruleset_id
                   FROM style_rulesets
                  WHERE style_rulesets.ruleset_id IS NOT NULL))
          GROUP BY rcpa.ruleset_config_id
        ), escalation_levels AS (
         SELECT rcel.ruleset_config_id AS ruleset_id,
            COALESCE(jsonb_agg(ph."values" || jsonb_build_array(COALESCE(sh.name, ''::character varying)) ORDER BY rcel."order"), '[]'::jsonb) AS escalation_levels
           FROM size_smart.tb_ruleset_config_escalation_level rcel
             JOIN size_smart.tb_escalation_level el_1 ON el_1.id = rcel.escalation_level_id
             JOIN size_smart.tb_product_hierarchy ph ON ph.id = el_1.product_hierarchy_id
             LEFT JOIN size_smart.tb_store_hierarchy sh ON sh.id = el_1.store_hierarchy_id
          WHERE (rcel.ruleset_config_id IN ( SELECT DISTINCT style_rulesets.ruleset_id
                   FROM style_rulesets
                  WHERE style_rulesets.ruleset_id IS NOT NULL))
          GROUP BY rcel.ruleset_config_id
        ), current_planning_month AS (
         SELECT to_char(CURRENT_DATE, 'Mon YYYY'::text) AS planning_month_year
        ), current_active_season AS (
         SELECT asm.active_season,
            asm.planning_month_year
           FROM size_smart.active_season_mapping asm
             CROSS JOIN current_planning_month cpm
          WHERE asm.planning_month_year = cpm.planning_month_year
          LIMIT 1
        ), prior_season_dates AS (
         SELECT asm.season_start_date,
            asm.season_end_date
           FROM size_smart.active_season_mapping asm
             CROSS JOIN current_active_season cas
          WHERE asm.active_season = ((cas.active_season::integer - 10)::text)
          LIMIT 1
        ), ruleset_ly_values AS (
         SELECT rt.ruleset_config_id,
            COALESCE(sum(t.weightage), 0.3::real) AS ly_value
           FROM size_smart.tb_ruleset_timeline rt
             JOIN size_smart.tb_timeline t ON t.id = rt.timeline_id
          WHERE (t.time_value::text = ANY (ARRAY['LY'::character varying::text, 'LLY'::character varying::text]))
          GROUP BY rt.ruleset_config_id
        ), timelines AS (
         SELECT sr.ruleset_id,
            sr.rule_tag,
                CASE
                    WHEN sr.rule_tag::text = 'master'::text THEN jsonb_build_object('TY',
                        CASE
                            WHEN psd.season_start_date IS NOT NULL AND psd.season_end_date IS NOT NULL THEN jsonb_build_array(jsonb_build_array(to_char(psd.season_start_date, 'YYYY-MM-DD'::text), to_char(psd.season_end_date, 'YYYY-MM-DD'::text), round(COALESCE((1.0::numeric - rlv.ly_value::numeric), 0.7::numeric), 1)::real))
                            ELSE jsonb_build_array(jsonb_build_array(to_char(CURRENT_DATE, 'YYYY-MM-DD'::text), to_char(CURRENT_DATE, 'YYYY-MM-DD'::text), round(COALESCE((1.0::numeric - rlv.ly_value::numeric), 0.7::numeric), 1)::real))
                        END, 'LY', COALESCE(rlv.ly_value, 0.3::real))
                    ELSE jsonb_build_object('TY', COALESCE(( SELECT jsonb_agg(jsonb_build_array(to_char(COALESCE(t.start_date, CURRENT_DATE), 'YYYY-MM-DD'::text), to_char(COALESCE(t.end_date, CURRENT_DATE), 'YYYY-MM-DD'::text), COALESCE(t.weightage, 0::real)))
                           FROM size_smart.tb_ruleset_timeline rt
                             JOIN size_smart.tb_timeline t ON t.id = rt.timeline_id
                          WHERE rt.ruleset_config_id = sr.ruleset_id AND (t.time_value::text <> ALL (ARRAY['LY'::character varying::text, 'LLY'::character varying::text]))), '[]'::jsonb), 'LY', COALESCE(rlv.ly_value, 0.3::real))
                END AS timelines
           FROM ( SELECT DISTINCT style_rulesets.ruleset_id,
                    style_rulesets.rule_tag
                   FROM style_rulesets
                  WHERE style_rulesets.ruleset_id IS NOT NULL) sr
             LEFT JOIN ruleset_ly_values rlv ON rlv.ruleset_config_id = sr.ruleset_id
             LEFT JOIN prior_season_dates psd ON sr.rule_tag::text = 'master'::text
        ), product_attributes_single AS (
         SELECT rcpa.ruleset_config_id,
            COALESCE(rcpa.product_attribute_values, '{}'::jsonb) AS attrs
           FROM size_smart.tb_ruleset_config_product_attribute rcpa
             JOIN product_attribute_counts pac ON pac.ruleset_config_id = rcpa.ruleset_config_id
          WHERE pac.attribute_count = 1 AND (rcpa.ruleset_config_id IN ( SELECT DISTINCT style_rulesets.ruleset_id
                   FROM style_rulesets
                  WHERE style_rulesets.ruleset_id IS NOT NULL))
        ), product_attributes_multiple AS (
         SELECT rcpa.ruleset_config_id,
            COALESCE(rcpa.product_attribute_values, '{}'::jsonb) AS attrs
           FROM size_smart.tb_ruleset_config_product_attribute rcpa
             JOIN product_attribute_counts pac ON pac.ruleset_config_id = rcpa.ruleset_config_id
          WHERE pac.attribute_count > 1 AND (rcpa.ruleset_config_id IN ( SELECT DISTINCT style_rulesets.ruleset_id
                   FROM style_rulesets
                  WHERE style_rulesets.ruleset_id IS NOT NULL)) AND rcpa.id = (( SELECT min(rcpa2.id) AS min
                   FROM size_smart.tb_ruleset_config_product_attribute rcpa2
                  WHERE rcpa2.ruleset_config_id = rcpa.ruleset_config_id))
        ), product_attributes AS (
         SELECT product_attributes_single.ruleset_config_id,
            product_attributes_single.attrs
           FROM product_attributes_single
        UNION ALL
         SELECT product_attributes_multiple.ruleset_config_id,
            product_attributes_multiple.attrs
           FROM product_attributes_multiple
        )
 SELECT DISTINCT sr.l0_name,
    sr.l1_name AS l6_name,
    sr.l2_name AS l1_name,
    sr.l4_name AS global_fit_platform,
    sr.l3_name,
    sr.l5_name AS l4_name,
    sr.l6_name AS l5_name,
    sr.l7_name AS l7_code,
    sr.l8_name AS display_article,
    sr.size_range_id,
    sr.rule_id,
    sr.ruleset_id,
    sr.rule_tag,
    COALESCE(el.escalation_levels, be.best_escalation::jsonb, '[]'::jsonb) AS escalation_level,
    COALESCE(szr.size_ranges, '[]'::jsonb) AS size_range,
    COALESCE(pa.attrs, '{}'::jsonb) AS attributes,
        CASE
            WHEN tl.timelines IS NULL THEN jsonb_build_object('TY', jsonb_build_array(jsonb_build_array(to_char(CURRENT_DATE::timestamp with time zone, 'YYYY-MM-DD'::text), to_char(CURRENT_DATE::timestamp with time zone, 'YYYY-MM-DD'::text), 0)), 'LY', NULL::unknown)
            WHEN (tl.timelines -> 'TY'::text) = '[]'::jsonb THEN jsonb_build_object('TY', jsonb_build_array(jsonb_build_array(to_char(CURRENT_DATE::timestamp with time zone, 'YYYY-MM-DD'::text), to_char(CURRENT_DATE::timestamp with time zone, 'YYYY-MM-DD'::text), 0)), 'LY', COALESCE((tl.timelines ->> 'LY'::text)::numeric, 0.3))
            ELSE tl.timelines
        END AS timeline
   FROM style_rulesets sr
     LEFT JOIN escalation_levels el ON el.ruleset_id = sr.ruleset_id
     LEFT JOIN size_smart.tb_best_escalation be ON be.l0_name::text = sr.l0_name::text AND be.l2_name::text = sr.l2_name::text AND be.l3_name::text = sr.l3_name::text
     LEFT JOIN size_ranges szr ON szr.size_range_id = sr.size_range_id
     LEFT JOIN product_attributes pa ON pa.ruleset_config_id = sr.ruleset_id
     LEFT JOIN timelines tl ON tl.ruleset_id = sr.ruleset_id
  WHERE COALESCE(szr.size_ranges, '[]'::jsonb) <> '[]'::jsonb
WITH DATA;

-- View indexes:
CREATE INDEX idx_mv_style_ruleset_mapping_assort_rules ON size_smart.mv_style_ruleset_mapping USING btree (l0_name, l1_name, l3_name, global_fit_platform) WHERE ((rule_tag)::text = 'assort'::text);
CREATE INDEX idx_mv_style_ruleset_mapping_attributes ON size_smart.mv_style_ruleset_mapping USING gin (attributes);
CREATE INDEX idx_mv_style_ruleset_mapping_composite ON size_smart.mv_style_ruleset_mapping USING btree (l0_name, l1_name, l3_name, global_fit_platform);
CREATE INDEX idx_mv_style_ruleset_mapping_composite_key ON size_smart.mv_style_ruleset_mapping USING btree (l0_name, l6_name, l1_name, l3_name, global_fit_platform, l4_name, l5_name, l7_code, display_article);
CREATE INDEX idx_mv_style_ruleset_mapping_escalation_level ON size_smart.mv_style_ruleset_mapping USING gin (escalation_level);
CREATE INDEX idx_mv_style_ruleset_mapping_master_rules ON size_smart.mv_style_ruleset_mapping USING btree (l0_name, l1_name, l3_name) WHERE ((rule_tag)::text = 'master'::text);
CREATE INDEX idx_mv_style_ruleset_mapping_rule_id ON size_smart.mv_style_ruleset_mapping USING btree (rule_id);
CREATE INDEX idx_mv_style_ruleset_mapping_rule_tag ON size_smart.mv_style_ruleset_mapping USING btree (rule_tag);
CREATE INDEX idx_mv_style_ruleset_mapping_ruleset_id ON size_smart.mv_style_ruleset_mapping USING btree (ruleset_id);
CREATE INDEX idx_mv_style_ruleset_mapping_size_range ON size_smart.mv_style_ruleset_mapping USING gin (size_range);
CREATE INDEX idx_mv_style_ruleset_mapping_size_range_id ON size_smart.mv_style_ruleset_mapping USING btree (size_range_id);
CREATE INDEX idx_mv_style_ruleset_mapping_timeline ON size_smart.mv_style_ruleset_mapping USING gin (timeline);
CREATE UNIQUE INDEX idx_mv_style_ruleset_mapping_unique ON size_smart.mv_style_ruleset_mapping USING btree (l0_name, l6_name, l1_name, global_fit_platform, l3_name, l4_name, l5_name, l7_code, display_article, size_range_id, rule_id, ruleset_id);