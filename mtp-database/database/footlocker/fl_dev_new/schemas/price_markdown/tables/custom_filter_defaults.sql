--liquibase formatted sql
--changeset harshita.kona@impactanalytics.co:custom_filters_defaults stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for custom_filters_defaults

CREATE TABLE IF NOT EXISTS price_markdown.custom_filters_defaults (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    screen_name VARCHAR(100) NOT NULL,
    filter_id INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(user_id, screen_name),
    FOREIGN KEY (filter_id) REFERENCES price_markdown.custom_filters(filter_id) ON DELETE CASCADE
);