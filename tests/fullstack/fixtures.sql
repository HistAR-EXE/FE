\set ON_ERROR_STOP on

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Remove only rows owned by this fixture. Production migrations and seed data are untouched.
DELETE FROM assignment_submissions
WHERE assignment_id IN (
    SELECT id FROM assignments WHERE field_trip_id IN (
        SELECT id FROM field_trips WHERE created_by = 'e2000000-0000-4000-8000-000000000015'
    )
);
DELETE FROM assignments
WHERE field_trip_id IN (
    SELECT id FROM field_trips WHERE created_by = 'e2000000-0000-4000-8000-000000000015'
);
DELETE FROM field_trip_report_snapshots
WHERE field_trip_id IN (
    SELECT id FROM field_trips WHERE created_by = 'e2000000-0000-4000-8000-000000000015'
);
DELETE FROM study_group_members
WHERE group_id IN (
    SELECT id FROM study_groups WHERE field_trip_id IN (
        SELECT id FROM field_trips WHERE created_by = 'e2000000-0000-4000-8000-000000000015'
    )
);
DELETE FROM study_groups
WHERE field_trip_id IN (
    SELECT id FROM field_trips WHERE created_by = 'e2000000-0000-4000-8000-000000000015'
);
DELETE FROM field_trips WHERE created_by = 'e2000000-0000-4000-8000-000000000015';
DELETE FROM visit_sessions
WHERE user_id = 'e2000000-0000-4000-8000-000000000016'
  AND location_id = 'e2000000-0000-4000-8000-000000000001';
DELETE FROM checkins
WHERE user_id = 'e2000000-0000-4000-8000-000000000016'
  AND location_id = 'e2000000-0000-4000-8000-000000000001';
DELETE FROM user_quest_progress
WHERE user_id = 'e2000000-0000-4000-8000-000000000016'
  AND quest_id = 'e2000000-0000-4000-8000-000000000002';
DELETE FROM site_content_versions WHERE site_code = 'e2e-site';
DELETE FROM site_onboarding_requests WHERE site_code = 'e2e-site';
DELETE FROM site_memberships WHERE site_code = 'e2e-site';
DELETE FROM refresh_tokens
WHERE user_id IN (
    'e2000000-0000-4000-8000-000000000011',
    'e2000000-0000-4000-8000-000000000012',
    'e2000000-0000-4000-8000-000000000013',
    'e2000000-0000-4000-8000-000000000014',
    'e2000000-0000-4000-8000-000000000015',
    'e2000000-0000-4000-8000-000000000016',
    'e2000000-0000-4000-8000-000000000017'
);

INSERT INTO organizations (
    id, slug, name, plan, plan_type, contact_email, plan_start_date, plan_end_date,
    status, max_ccu, max_verified_accounts, max_ai_queries_per_month, invite_code,
    invite_code_expires_at, created_at
)
VALUES (
    'e2000000-0000-4000-8000-000000000004', 'fullstack-school', 'Trường Full-stack HistAR',
    'org_premium', 'PREMIUM', 'fullstack-teacher@histar.test', CURRENT_DATE,
    CURRENT_DATE + 365, 'ACTIVE', 40, 400, 30000, 'E2EFULL1', NOW() + INTERVAL '365 days', NOW()
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    plan = EXCLUDED.plan,
    plan_type = EXCLUDED.plan_type,
    contact_email = EXCLUDED.contact_email,
    plan_start_date = EXCLUDED.plan_start_date,
    plan_end_date = EXCLUDED.plan_end_date,
    status = EXCLUDED.status,
    max_ccu = EXCLUDED.max_ccu,
    max_verified_accounts = EXCLUDED.max_verified_accounts,
    max_ai_queries_per_month = EXCLUDED.max_ai_queries_per_month,
    invite_code = EXCLUDED.invite_code,
    invite_code_expires_at = EXCLUDED.invite_code_expires_at;

INSERT INTO profiles (
    id, email, password_hash, provider, role, tier, display_name, level, total_points,
    city, created_at, email_verified, email_verified_at, org_id, org_subscription, account_status
)
VALUES
    ('e2000000-0000-4000-8000-000000000011', 'fullstack-admin@histar.test', crypt('Fullstack@2026', gen_salt('bf', 6)), 'local', 'ADMIN', 'PREMIUM', 'Quản trị Full-stack', 1, 0, 'TP.HCM', NOW(), TRUE, NOW(), NULL, 'NONE', 'ACTIVE'),
    ('e2000000-0000-4000-8000-000000000012', 'fullstack-manager@histar.test', crypt('Fullstack@2026', gen_salt('bf', 6)), 'local', 'USER', 'PREMIUM', 'Quản lý Full-stack', 1, 0, 'TP.HCM', NOW(), TRUE, NOW(), NULL, 'NONE', 'ACTIVE'),
    ('e2000000-0000-4000-8000-000000000013', 'fullstack-editor@histar.test', crypt('Fullstack@2026', gen_salt('bf', 6)), 'local', 'USER', 'PREMIUM', 'Biên tập Full-stack', 1, 0, 'TP.HCM', NOW(), TRUE, NOW(), NULL, 'NONE', 'ACTIVE'),
    ('e2000000-0000-4000-8000-000000000014', 'fullstack-reviewer@histar.test', crypt('Fullstack@2026', gen_salt('bf', 6)), 'local', 'USER', 'PREMIUM', 'Duyệt Full-stack', 1, 0, 'TP.HCM', NOW(), TRUE, NOW(), NULL, 'NONE', 'ACTIVE'),
    ('e2000000-0000-4000-8000-000000000015', 'fullstack-teacher@histar.test', crypt('Fullstack@2026', gen_salt('bf', 6)), 'local', 'TEACHER', 'PREMIUM', 'Giáo viên Full-stack', 1, 0, 'TP.HCM', NOW(), TRUE, NOW(), 'e2000000-0000-4000-8000-000000000004', 'PREMIUM', 'ACTIVE'),
    ('e2000000-0000-4000-8000-000000000016', 'fullstack-learner@histar.test', crypt('Fullstack@2026', gen_salt('bf', 6)), 'local', 'USER', 'PREMIUM', 'Học sinh Full-stack', 1, 0, 'TP.HCM', NOW(), TRUE, NOW(), 'e2000000-0000-4000-8000-000000000004', 'PREMIUM', 'ACTIVE'),
    ('e2000000-0000-4000-8000-000000000017', 'fullstack-trip-manager@histar.test', crypt('Fullstack@2026', gen_salt('bf', 6)), 'local', 'USER', 'PREMIUM', 'Quản lý chuyến Full-stack', 1, 0, 'TP.HCM', NOW(), TRUE, NOW(), NULL, 'NONE', 'ACTIVE')
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    password_hash = EXCLUDED.password_hash,
    provider = EXCLUDED.provider,
    role = EXCLUDED.role,
    tier = EXCLUDED.tier,
    display_name = EXCLUDED.display_name,
    email_verified = TRUE,
    email_verified_at = NOW(),
    org_id = EXCLUDED.org_id,
    org_subscription = EXCLUDED.org_subscription,
    account_status = 'ACTIVE';

INSERT INTO organization_members (organization_id, user_id, org_role, invited_at, accepted_at)
VALUES
    ('e2000000-0000-4000-8000-000000000004', 'e2000000-0000-4000-8000-000000000015', 'teacher', NOW(), NOW()),
    ('e2000000-0000-4000-8000-000000000004', 'e2000000-0000-4000-8000-000000000016', 'student', NOW(), NOW())
ON CONFLICT (organization_id, user_id) DO UPDATE SET
    org_role = EXCLUDED.org_role,
    accepted_at = NOW();

INSERT INTO locations (
    id, site_code, name, description, latitude, longitude, city, cover_image,
    created_at, rating, is_ar_available, sources, formatted_address
)
VALUES (
    'e2000000-0000-4000-8000-000000000001', 'e2e-site', 'Di tích kiểm thử E2E',
    'Hồ sơ fixture trước khi xuất bản.', 10.7769, 106.7009, 'TP.HCM',
    '/brand/logo-histar.png', NOW(), 5.0, FALSE, 'Fixture kiểm thử tự động', 'Khu kiểm thử HistAR'
)
ON CONFLICT (id) DO UPDATE SET
    site_code = EXCLUDED.site_code,
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    latitude = EXCLUDED.latitude,
    longitude = EXCLUDED.longitude,
    city = EXCLUDED.city,
    cover_image = EXCLUDED.cover_image,
    sources = EXCLUDED.sources,
    formatted_address = EXCLUDED.formatted_address;

INSERT INTO stations (id, site_code, code, name, sort_order, lat, lng, quest_step_key, is_active, created_at)
VALUES (
    'e2000000-0000-4000-8000-000000000005', 'e2e-site', 'ST01', 'Trạm Full-stack',
    1, 10.7769, 106.7009, 'fullstack-st01', TRUE, NOW()
)
ON CONFLICT (id) DO UPDATE SET
    site_code = EXCLUDED.site_code,
    code = EXCLUDED.code,
    name = EXCLUDED.name,
    sort_order = EXCLUDED.sort_order,
    lat = EXCLUDED.lat,
    lng = EXCLUDED.lng,
    quest_step_key = EXCLUDED.quest_step_key,
    is_active = TRUE;

INSERT INTO quests (
    id, location_id, title, description, points_reward, required_order, steps_total,
    unlock_level, status_default, created_at, completion_trigger, require_onsite_checkin,
    row_version, track, sort_order, difficulty
)
VALUES (
    'e2000000-0000-4000-8000-000000000002', 'e2000000-0000-4000-8000-000000000001',
    'Nhiệm vụ Full-stack', 'Nhiệm vụ dành riêng cho cổng Playwright.', 25, 1, 1, 1,
    'not_started', NOW(), 'checkin', TRUE, 0, 'ONSITE', 1, 'EASY'
)
ON CONFLICT (id) DO UPDATE SET
    location_id = EXCLUDED.location_id,
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    points_reward = EXCLUDED.points_reward,
    steps_total = EXCLUDED.steps_total,
    completion_trigger = EXCLUDED.completion_trigger,
    require_onsite_checkin = EXCLUDED.require_onsite_checkin,
    deleted_at = NULL,
    track = EXCLUDED.track,
    sort_order = EXCLUDED.sort_order,
    difficulty = EXCLUDED.difficulty;

INSERT INTO quest_campaigns (
    id, quest_id, campaign_type, title, starts_at, ends_at, enabled,
    pilot_status, release_decision, release_note, release_decided_by, release_decided_at
)
VALUES (
    'e2000000-0000-4000-8000-000000000003', 'e2000000-0000-4000-8000-000000000002',
    'COHORT', 'Chiến dịch Full-stack', NOW() - INTERVAL '1 day', NOW() + INTERVAL '30 days',
    TRUE, 'PASSED', 'APPROVED', 'Fixture Playwright',
    'e2000000-0000-4000-8000-000000000011', NOW()
)
ON CONFLICT (id) DO UPDATE SET
    quest_id = EXCLUDED.quest_id,
    campaign_type = EXCLUDED.campaign_type,
    title = EXCLUDED.title,
    starts_at = EXCLUDED.starts_at,
    ends_at = EXCLUDED.ends_at,
    enabled = TRUE,
    pilot_status = 'PASSED',
    release_decision = 'APPROVED',
    release_note = EXCLUDED.release_note,
    release_decided_by = EXCLUDED.release_decided_by,
    release_decided_at = NOW();

INSERT INTO site_workspace_settings (site_code, requires_trip_confirmation, updated_by, updated_at)
VALUES ('e2e-site', TRUE, 'e2000000-0000-4000-8000-000000000011', NOW())
ON CONFLICT (site_code) DO UPDATE SET
    requires_trip_confirmation = TRUE,
    updated_by = EXCLUDED.updated_by,
    updated_at = NOW();

INSERT INTO site_memberships (site_code, user_id, role, active, granted_by, created_at, updated_at)
VALUES (
    'e2e-site', 'e2000000-0000-4000-8000-000000000017', 'SITE_MANAGER', TRUE,
    'e2000000-0000-4000-8000-000000000011', NOW(), NOW()
)
ON CONFLICT (site_code, user_id) DO UPDATE SET
    role = 'SITE_MANAGER',
    active = TRUE,
    granted_by = EXCLUDED.granted_by,
    updated_at = NOW();

COMMIT;
