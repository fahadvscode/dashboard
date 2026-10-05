-- Broker Guide: site and sales office directory.
-- Run once in the Supabase SQL editor.
-- This script does not read or change canada_properties.

CREATE TABLE IF NOT EXISTS broker_guide_projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  city TEXT NOT NULL,
  project_name TEXT NOT NULL,
  canada_property_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS broker_guide_places (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES broker_guide_projects(id) ON DELETE CASCADE,
  place_type TEXT NOT NULL,
  map_url TEXT,
  cross_streets TEXT,
  address TEXT,
  phone TEXT,
  hours TEXT,
  website TEXT,
  contacts TEXT,
  note TEXT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_broker_guide_projects_city ON broker_guide_projects(city);
CREATE INDEX IF NOT EXISTS idx_broker_guide_places_project ON broker_guide_places(project_id);

ALTER TABLE broker_guide_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE broker_guide_places ENABLE ROW LEVEL SECURITY;

-- No public policies. The app uses the service role, and the Broker access code is checked in the API.

INSERT INTO broker_guide_projects (id, city, project_name) VALUES ('11111111-1111-4111-8111-000000000001', 'Brampton', 'Spruce Trails') ON CONFLICT (id) DO NOTHING;
INSERT INTO broker_guide_places (id, project_id, place_type, map_url, cross_streets, address, phone, hours, website, contacts, note, sort_order) VALUES ('22222222-2222-4222-8222-000000000001', '11111111-1111-4111-8111-000000000001', 'Site and sales', 'https://maps.app.goo.gl/d52L2sfWTbTkAXcT8', 'Bovaird Dr / Heart Lake Rd', '10194 Heart Lake Road (Use address 99 New Pine Trail)', '647-276-0078', 'Mon–Wed 11am–6pm
Thu & Fri Closed
Sat & Sun 11am–5pm', NULL, NULL, NULL, 0) ON CONFLICT (id) DO NOTHING;

INSERT INTO broker_guide_projects (id, city, project_name) VALUES ('11111111-1111-4111-8111-000000000002', 'Brampton', 'Cornerstone by Primont') ON CONFLICT (id) DO NOTHING;
INSERT INTO broker_guide_places (id, project_id, place_type, map_url, cross_streets, address, phone, hours, website, contacts, note, sort_order) VALUES ('22222222-2222-4222-8222-000000000002', '11111111-1111-4111-8111-000000000002', 'Site and sales', 'https://maps.app.goo.gl/Kb6SjCkrZRNfbrFA6', 'Wanless Dr / Mississauga Rd', '2005 Wanless Dr, Brampton, ON L7A 0A6', '647-921-5241', 'Mon–Thu 12–6pm (Not confirmed)
Sat–Sun 12–5pm', NULL, NULL, NULL, 0) ON CONFLICT (id) DO NOTHING;

INSERT INTO broker_guide_projects (id, city, project_name) VALUES ('11111111-1111-4111-8111-000000000003', 'Brampton', 'Mayfield Village') ON CONFLICT (id) DO NOTHING;
INSERT INTO broker_guide_places (id, project_id, place_type, map_url, cross_streets, address, phone, hours, website, contacts, note, sort_order) VALUES ('22222222-2222-4222-8222-000000000003', '11111111-1111-4111-8111-000000000003', 'Site and sales', 'https://maps.app.goo.gl/11NgJFRo8civCadCA', 'Regalcrest', '4585 Mayfield Rd, Brampton, ON L6R 0B8', NULL, 'Monday & Tuesday 1pm–7pm
Saturday & Sunday 12pm–5pm', NULL, NULL, NULL, 0) ON CONFLICT (id) DO NOTHING;

INSERT INTO broker_guide_projects (id, city, project_name) VALUES ('11111111-1111-4111-8111-000000000004', 'Brampton', 'Aspenridge Mayfield') ON CONFLICT (id) DO NOTHING;
INSERT INTO broker_guide_places (id, project_id, place_type, map_url, cross_streets, address, phone, hours, website, contacts, note, sort_order) VALUES ('22222222-2222-4222-8222-000000000004', '11111111-1111-4111-8111-000000000004', 'Site', 'https://maps.app.goo.gl/11NgJFRo8civCadCA', NULL, NULL, '905-230-2592
416-616-1870 Samantha', NULL, NULL, NULL, NULL, 0) ON CONFLICT (id) DO NOTHING;

INSERT INTO broker_guide_projects (id, city, project_name) VALUES ('11111111-1111-4111-8111-000000000005', 'Brampton', 'Classic Drive Branthaven') ON CONFLICT (id) DO NOTHING;
INSERT INTO broker_guide_places (id, project_id, place_type, map_url, cross_streets, address, phone, hours, website, contacts, note, sort_order) VALUES ('22222222-2222-4222-8222-000000000005', '11111111-1111-4111-8111-000000000005', 'Siteplan', 'https://maps.app.goo.gl/T6kL4cw9bawvwuzv8', NULL, '8940 Creditview Rd, Brampton', '905-333-6150', NULL, NULL, NULL, NULL, 0) ON CONFLICT (id) DO NOTHING;

INSERT INTO broker_guide_projects (id, city, project_name) VALUES ('11111111-1111-4111-8111-000000000006', 'Brampton', 'Castlemile') ON CONFLICT (id) DO NOTHING;
INSERT INTO broker_guide_places (id, project_id, place_type, map_url, cross_streets, address, phone, hours, website, contacts, note, sort_order) VALUES ('22222222-2222-4222-8222-000000000006', '11111111-1111-4111-8111-000000000006', 'Sales office', 'https://maps.app.goo.gl/iPbnrsAFiBb7jeNQ7', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0) ON CONFLICT (id) DO NOTHING;
INSERT INTO broker_guide_places (id, project_id, place_type, map_url, cross_streets, address, phone, hours, website, contacts, note, sort_order) VALUES ('22222222-2222-4222-8222-000000000007', '11111111-1111-4111-8111-000000000006', 'Site', 'https://maps.app.goo.gl/UK1MhQnSeJhQE18Z6', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1) ON CONFLICT (id) DO NOTHING;

INSERT INTO broker_guide_projects (id, city, project_name) VALUES ('11111111-1111-4111-8111-000000000007', 'Brampton', 'Upper Mayfield Estate') ON CONFLICT (id) DO NOTHING;
INSERT INTO broker_guide_places (id, project_id, place_type, map_url, cross_streets, address, phone, hours, website, contacts, note, sort_order) VALUES ('22222222-2222-4222-8222-000000000008', '11111111-1111-4111-8111-000000000007', 'Sales office', 'https://maps.app.goo.gl/GoH1r3QsAzAKDTwT9', NULL, '5875 Mayfield Rd, Brampton', '416-798-7070', NULL, NULL, NULL, NULL, 0) ON CONFLICT (id) DO NOTHING;

INSERT INTO broker_guide_projects (id, city, project_name) VALUES ('11111111-1111-4111-8111-000000000008', 'Caledon', 'Windrose') ON CONFLICT (id) DO NOTHING;
INSERT INTO broker_guide_places (id, project_id, place_type, map_url, cross_streets, address, phone, hours, website, contacts, note, sort_order) VALUES ('22222222-2222-4222-8222-000000000009', '11111111-1111-4111-8111-000000000008', 'Sales office', 'https://maps.app.goo.gl/Pv17eojBWk1ZNuJZ6', 'Mayfield / Chinguacousy', '2068 Mayfield Rd, Caledon', 'O 905-605-6750
C 647-580-8112', 'Mon–Wed 12pm–7pm
Thu & Fri By appointment
Sat & Sun 12pm–5pm', NULL, NULL, NULL, 0) ON CONFLICT (id) DO NOTHING;
INSERT INTO broker_guide_places (id, project_id, place_type, map_url, cross_streets, address, phone, hours, website, contacts, note, sort_order) VALUES ('22222222-2222-4222-8222-000000000010', '11111111-1111-4111-8111-000000000008', 'Site', 'https://maps.app.goo.gl/U6wUtbVoVMEezEC68', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1) ON CONFLICT (id) DO NOTHING;

INSERT INTO broker_guide_projects (id, city, project_name) VALUES ('11111111-1111-4111-8111-000000000009', 'Caledon', 'Crown of Caledon') ON CONFLICT (id) DO NOTHING;
INSERT INTO broker_guide_places (id, project_id, place_type, map_url, cross_streets, address, phone, hours, website, contacts, note, sort_order) VALUES ('22222222-2222-4222-8222-000000000011', '11111111-1111-4111-8111-000000000009', 'Sales office', 'https://maps.app.goo.gl/z9D4BgmoNpq4g1cL6', NULL, NULL, 'O 905-457-0445', 'Mon–Thu 11am–5pm
Fri Closed
Sat & Sun 11am–5pm', NULL, NULL, NULL, 0) ON CONFLICT (id) DO NOTHING;
INSERT INTO broker_guide_places (id, project_id, place_type, map_url, cross_streets, address, phone, hours, website, contacts, note, sort_order) VALUES ('22222222-2222-4222-8222-000000000012', '11111111-1111-4111-8111-000000000009', 'Site', 'https://maps.app.goo.gl/aSKrqFiJp2NC28ZT7', 'Mayfield / Hurontario', NULL, NULL, NULL, NULL, NULL, NULL, 1) ON CONFLICT (id) DO NOTHING;

INSERT INTO broker_guide_projects (id, city, project_name) VALUES ('11111111-1111-4111-8111-000000000010', 'Caledon', 'Caledon Club') ON CONFLICT (id) DO NOTHING;
INSERT INTO broker_guide_places (id, project_id, place_type, map_url, cross_streets, address, phone, hours, website, contacts, note, sort_order) VALUES ('22222222-2222-4222-8222-000000000013', '11111111-1111-4111-8111-000000000010', 'Site / model / sales office', 'https://maps.app.goo.gl/JizRa1mwihZTbcka9', 'Mayfield Rd / McLaughlin', '74 & 76 Lippa Drive, Caledon', 'O 905-247-5052', 'Mon–Thu 1pm–7pm
Fri By appointment
Sat, Sun & Holiday 11am–5pm', NULL, NULL, NULL, 0) ON CONFLICT (id) DO NOTHING;

INSERT INTO broker_guide_projects (id, city, project_name) VALUES ('11111111-1111-4111-8111-000000000011', 'Caledon', 'Wildfield') ON CONFLICT (id) DO NOTHING;
INSERT INTO broker_guide_places (id, project_id, place_type, map_url, cross_streets, address, phone, hours, website, contacts, note, sort_order) VALUES ('22222222-2222-4222-8222-000000000014', '11111111-1111-4111-8111-000000000011', 'Site and sales', 'https://maps.app.goo.gl/aJjSgm6qFpkBZc336', 'Mayfield Rd / The Gore Rd', '14292 The Gore Road, Caledon', 'O 905-695-5137', 'Mon–Thu 12pm–6pm
Fri By appointment
Sat & Sun 12pm–5pm', NULL, NULL, NULL, 0) ON CONFLICT (id) DO NOTHING;

INSERT INTO broker_guide_projects (id, city, project_name) VALUES ('11111111-1111-4111-8111-000000000012', 'Caledon', 'Mayfield Collection') ON CONFLICT (id) DO NOTHING;
INSERT INTO broker_guide_places (id, project_id, place_type, map_url, cross_streets, address, phone, hours, website, contacts, note, sort_order) VALUES ('22222222-2222-4222-8222-000000000015', '11111111-1111-4111-8111-000000000012', 'Site and sales', 'https://maps.app.goo.gl/Ja4PwjTcjyHGresi7', 'Mayfield / Chinguacousy', '22 Stratford Dr, Caledon', '905-216-1163', 'Mon–Wed 1pm–7pm
Sat & Sun 11am–6pm', NULL, NULL, NULL, 0) ON CONFLICT (id) DO NOTHING;

INSERT INTO broker_guide_projects (id, city, project_name) VALUES ('11111111-1111-4111-8111-000000000013', 'Mississauga', 'The Nine') ON CONFLICT (id) DO NOTHING;
INSERT INTO broker_guide_places (id, project_id, place_type, map_url, cross_streets, address, phone, hours, website, contacts, note, sort_order) VALUES ('22222222-2222-4222-8222-000000000016', '11111111-1111-4111-8111-000000000013', 'Site', 'https://maps.app.goo.gl/MCDukKC4GhPoGbEZ9', 'Ninth Line / Britannia Rd', NULL, NULL, NULL, NULL, NULL, NULL, 0) ON CONFLICT (id) DO NOTHING;
INSERT INTO broker_guide_places (id, project_id, place_type, map_url, cross_streets, address, phone, hours, website, contacts, note, sort_order) VALUES ('22222222-2222-4222-8222-000000000017', '11111111-1111-4111-8111-000000000013', 'Sales office', 'https://maps.app.goo.gl/oUPmqJFgKynF2QYr8', NULL, '6578 Ninth Line, Mississauga', '905-997-1170', 'Monday 12pm–8pm
Tuesday 12pm–8pm
Wednesday 12pm–8pm
Thursday 12pm–8pm
Friday Closed
Sat & Sun 11am–6pm', NULL, NULL, NULL, 1) ON CONFLICT (id) DO NOTHING;

INSERT INTO broker_guide_projects (id, city, project_name) VALUES ('11111111-1111-4111-8111-000000000014', 'Mississauga', 'Lakeview') ON CONFLICT (id) DO NOTHING;
INSERT INTO broker_guide_places (id, project_id, place_type, map_url, cross_streets, address, phone, hours, website, contacts, note, sort_order) VALUES ('22222222-2222-4222-8222-000000000018', '11111111-1111-4111-8111-000000000014', 'Sales office', 'https://maps.app.goo.gl/S1DrdKm8ns4VGxNU9', NULL, NULL, NULL, NULL, NULL, NULL, 'Opus / Deco / Caivan / Branthaven / Greenpark / Tridel', 0) ON CONFLICT (id) DO NOTHING;

INSERT INTO broker_guide_projects (id, city, project_name) VALUES ('11111111-1111-4111-8111-000000000015', 'Mississauga', 'South Banks') ON CONFLICT (id) DO NOTHING;
INSERT INTO broker_guide_places (id, project_id, place_type, map_url, cross_streets, address, phone, hours, website, contacts, note, sort_order) VALUES ('22222222-2222-4222-8222-000000000019', '11111111-1111-4111-8111-000000000015', 'Site', 'https://maps.app.goo.gl/89kvYh52BFXzg7va6', NULL, NULL, NULL, NULL, 'https://southbanks.ca', 'Southbanks@deco.ca
Neil Hughes | 647-395-2392 | neil@austinbirch.com
Nicholas Ip | 647-882-8388 | nicholas@austinbirch.com', 'Opus / Deco', 0) ON CONFLICT (id) DO NOTHING;

INSERT INTO broker_guide_projects (id, city, project_name) VALUES ('11111111-1111-4111-8111-000000000016', 'Mississauga', 'Novella') ON CONFLICT (id) DO NOTHING;
INSERT INTO broker_guide_places (id, project_id, place_type, map_url, cross_streets, address, phone, hours, website, contacts, note, sort_order) VALUES ('22222222-2222-4222-8222-000000000020', '11111111-1111-4111-8111-000000000016', 'Site and sales', 'https://maps.app.goo.gl/gR6wmCEp5oHEaJbQ6', 'Ninth Line / Britannia Rd
Lisgar Dr / Doug Leavens Blvd', '6633 Lisgar Drive, Mississauga, ON L5N 6V9', 'O 647-468-8600', 'Monday–Thursday 1pm–7pm
Friday Closed
Saturday & Sunday 11am–5pm', NULL, NULL, NULL, 0) ON CONFLICT (id) DO NOTHING;

INSERT INTO broker_guide_projects (id, city, project_name) VALUES ('11111111-1111-4111-8111-000000000017', 'Mississauga', 'Meadowvale Brooks') ON CONFLICT (id) DO NOTHING;
INSERT INTO broker_guide_places (id, project_id, place_type, map_url, cross_streets, address, phone, hours, website, contacts, note, sort_order) VALUES ('22222222-2222-4222-8222-000000000021', '11111111-1111-4111-8111-000000000017', 'Site and sales', 'https://maps.app.goo.gl/3viToizS4A2o8vR17', 'Derry Rd / McLaughlin Rd', '330 Waterhouse Cres N, Mississauga', 'O 647-276-0078
Ali D 647-969-4498', 'Monday, Tuesday & Wednesday 11:00 a.m.–6:00 p.m.
Thursday & Friday Closed
Saturday & Sunday 11:00 a.m.–5:00 p.m.', NULL, NULL, NULL, 0) ON CONFLICT (id) DO NOTHING;

INSERT INTO broker_guide_projects (id, city, project_name) VALUES ('11111111-1111-4111-8111-000000000018', 'Mississauga', 'Derry Lane') ON CONFLICT (id) DO NOTHING;
INSERT INTO broker_guide_places (id, project_id, place_type, map_url, cross_streets, address, phone, hours, website, contacts, note, sort_order) VALUES ('22222222-2222-4222-8222-000000000022', '11111111-1111-4111-8111-000000000018', 'Site', 'https://maps.app.goo.gl/sVcY26WyrQXkRCEE9', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0) ON CONFLICT (id) DO NOTHING;

INSERT INTO broker_guide_projects (id, city, project_name) VALUES ('11111111-1111-4111-8111-000000000019', 'Milton', 'Hawthorne') ON CONFLICT (id) DO NOTHING;
INSERT INTO broker_guide_places (id, project_id, place_type, map_url, cross_streets, address, phone, hours, website, contacts, note, sort_order) VALUES ('22222222-2222-4222-8222-000000000023', '11111111-1111-4111-8111-000000000019', 'Site', 'https://maps.app.goo.gl/HtYb566i7xrpVEbC6', 'Fourth Line / Louis St. Laurent
Fourth Line / Britannia Rd', NULL, NULL, NULL, NULL, NULL, NULL, 0) ON CONFLICT (id) DO NOTHING;
INSERT INTO broker_guide_places (id, project_id, place_type, map_url, cross_streets, address, phone, hours, website, contacts, note, sort_order) VALUES ('22222222-2222-4222-8222-000000000024', '11111111-1111-4111-8111-000000000019', 'Sales office', 'https://maps.app.goo.gl/oUPmqJFgKynF2QYr8', NULL, '6578 Ninth Line, Mississauga', '905-997-1170', 'Monday 12pm–8pm
Tuesday 12pm–8pm
Wednesday 12pm–8pm
Thursday 12pm–8pm
Friday Closed
Sat & Sun 11am–6pm', NULL, NULL, NULL, 1) ON CONFLICT (id) DO NOTHING;

INSERT INTO broker_guide_projects (id, city, project_name) VALUES ('11111111-1111-4111-8111-000000000020', 'Milton', 'Enclave') ON CONFLICT (id) DO NOTHING;
INSERT INTO broker_guide_places (id, project_id, place_type, map_url, cross_streets, address, phone, hours, website, contacts, note, sort_order) VALUES ('22222222-2222-4222-8222-000000000025', '11111111-1111-4111-8111-000000000020', 'Site and sales', 'https://maps.app.goo.gl/69kJAGnJ9SBNDqaT7', 'Fourth Line / Britannia Rd', '1479 Trudeau Dr, Milton, ON L9E 0E7', 'O 905-462-4000', 'Monday–Wednesday 1 p.m.–8 p.m.
Thursday & Friday Closed
Saturday, Sunday & Holidays 11 a.m.–6 p.m.', NULL, NULL, NULL, 0) ON CONFLICT (id) DO NOTHING;

INSERT INTO broker_guide_projects (id, city, project_name) VALUES ('11111111-1111-4111-8111-000000000021', 'Milton', 'Creekview Collective') ON CONFLICT (id) DO NOTHING;
INSERT INTO broker_guide_places (id, project_id, place_type, map_url, cross_streets, address, phone, hours, website, contacts, note, sort_order) VALUES ('22222222-2222-4222-8222-000000000026', '11111111-1111-4111-8111-000000000021', 'Site and sales', 'https://maps.app.goo.gl/ZKtuMHrzWVBf5Jah6', NULL, '9755 Derry Road W, Milton, ON L9T 6J4', '289-309-2272', 'Monday–Wednesday 12–6pm
Thursday, Friday & Holidays By appointment
Saturday–Sunday 12–5pm', NULL, 'creekviewcollectivesales@branthaven.com', 'Branthaven', 0) ON CONFLICT (id) DO NOTHING;

INSERT INTO broker_guide_projects (id, city, project_name) VALUES ('11111111-1111-4111-8111-000000000022', 'Oakville', 'Upper Joshua Creek') ON CONFLICT (id) DO NOTHING;
INSERT INTO broker_guide_places (id, project_id, place_type, map_url, cross_streets, address, phone, hours, website, contacts, note, sort_order) VALUES ('22222222-2222-4222-8222-000000000027', '11111111-1111-4111-8111-000000000022', 'Site', 'https://maps.app.goo.gl/WxCzJKoKdSL282Xq7', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0) ON CONFLICT (id) DO NOTHING;

INSERT INTO broker_guide_projects (id, city, project_name) VALUES ('11111111-1111-4111-8111-000000000023', 'Oakville', 'Preserve North') ON CONFLICT (id) DO NOTHING;
INSERT INTO broker_guide_places (id, project_id, place_type, map_url, cross_streets, address, phone, hours, website, contacts, note, sort_order) VALUES ('22222222-2222-4222-8222-000000000028', '11111111-1111-4111-8111-000000000023', 'Site', 'https://maps.app.goo.gl/z9Kc5fvjyKiEW2bS7', NULL, NULL, NULL, NULL, NULL, NULL, 'Mattamy', 0) ON CONFLICT (id) DO NOTHING;

INSERT INTO broker_guide_projects (id, city, project_name) VALUES ('11111111-1111-4111-8111-000000000024', 'Oakville', 'Upper Joshua Mattamy Phase 6') ON CONFLICT (id) DO NOTHING;
INSERT INTO broker_guide_places (id, project_id, place_type, map_url, cross_streets, address, phone, hours, website, contacts, note, sort_order) VALUES ('22222222-2222-4222-8222-000000000029', '11111111-1111-4111-8111-000000000024', 'Site', 'https://maps.app.goo.gl/48AZ88bF2v94cAoB9', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0) ON CONFLICT (id) DO NOTHING;

INSERT INTO broker_guide_projects (id, city, project_name) VALUES ('11111111-1111-4111-8111-000000000025', 'Oakville', 'Mattamy Oakville') ON CONFLICT (id) DO NOTHING;
INSERT INTO broker_guide_places (id, project_id, place_type, map_url, cross_streets, address, phone, hours, website, contacts, note, sort_order) VALUES ('22222222-2222-4222-8222-000000000030', '11111111-1111-4111-8111-000000000025', 'Sales office', 'https://maps.app.goo.gl/iHoW1TBFaFAuS5qf6', NULL, '1388 Dundas Street West, Oakville', '905-456-6238', 'Monday 12pm–8pm
Tuesday 12pm–8pm
Wednesday 12pm–8pm
Thursday 12pm–8pm
Friday Closed
Sat & Sun 11am–6pm', NULL, NULL, NULL, 0) ON CONFLICT (id) DO NOTHING;

INSERT INTO broker_guide_projects (id, city, project_name) VALUES ('11111111-1111-4111-8111-000000000026', 'Oakville', 'Five Oaks') ON CONFLICT (id) DO NOTHING;
INSERT INTO broker_guide_places (id, project_id, place_type, map_url, cross_streets, address, phone, hours, website, contacts, note, sort_order) VALUES ('22222222-2222-4222-8222-000000000031', '11111111-1111-4111-8111-000000000026', 'Site', 'https://maps.app.goo.gl/V1P4jiT8G5bo9fnB6', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0) ON CONFLICT (id) DO NOTHING;
INSERT INTO broker_guide_places (id, project_id, place_type, map_url, cross_streets, address, phone, hours, website, contacts, note, sort_order) VALUES ('22222222-2222-4222-8222-000000000032', '11111111-1111-4111-8111-000000000026', 'Sales office', 'https://maps.app.goo.gl/zDzBYaxdPXiAzZW86', NULL, '209 Oak Park Blvd, Oakville', '289-430-0627', 'Mon–Thu 11am–6pm
Friday 12–5pm
Sat & Sun 11am–5pm', NULL, NULL, NULL, 1) ON CONFLICT (id) DO NOTHING;

INSERT INTO broker_guide_projects (id, city, project_name) VALUES ('11111111-1111-4111-8111-000000000027', 'Oakville', 'Artista Oakpoint') ON CONFLICT (id) DO NOTHING;
INSERT INTO broker_guide_places (id, project_id, place_type, map_url, cross_streets, address, phone, hours, website, contacts, note, sort_order) VALUES ('22222222-2222-4222-8222-000000000033', '11111111-1111-4111-8111-000000000027', 'Sales office', 'https://maps.app.goo.gl/427GyaxeUAnppjbs7', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0) ON CONFLICT (id) DO NOTHING;
INSERT INTO broker_guide_places (id, project_id, place_type, map_url, cross_streets, address, phone, hours, website, contacts, note, sort_order) VALUES ('22222222-2222-4222-8222-000000000034', '11111111-1111-4111-8111-000000000027', 'Site', 'https://maps.app.goo.gl/iX8K91wM8M32opGW9', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1) ON CONFLICT (id) DO NOTHING;

INSERT INTO broker_guide_projects (id, city, project_name) VALUES ('11111111-1111-4111-8111-000000000028', 'Oakville', 'Ivy Rouge') ON CONFLICT (id) DO NOTHING;
INSERT INTO broker_guide_places (id, project_id, place_type, map_url, cross_streets, address, phone, hours, website, contacts, note, sort_order) VALUES ('22222222-2222-4222-8222-000000000035', '11111111-1111-4111-8111-000000000028', 'Site', 'https://maps.app.goo.gl/uBi23sp1HcjJES7x6', NULL, NULL, NULL, NULL, NULL, NULL, 'Rosehaven', 0) ON CONFLICT (id) DO NOTHING;
INSERT INTO broker_guide_places (id, project_id, place_type, map_url, cross_streets, address, phone, hours, website, contacts, note, sort_order) VALUES ('22222222-2222-4222-8222-000000000036', '11111111-1111-4111-8111-000000000028', 'Sales office / Model home', 'https://maps.app.goo.gl/pYxQWmbns7AfNe2ZA', NULL, '46 Settlers Rd West, Oakville', NULL, 'Mon–Tue 12–7pm
Wed 12–5pm
Sat, Sun & Holiday 11am–5pm
Thu & Fri By appointment', NULL, NULL, 'Rosehaven', 1) ON CONFLICT (id) DO NOTHING;

INSERT INTO broker_guide_projects (id, city, project_name) VALUES ('11111111-1111-4111-8111-000000000029', 'Oakville', 'Oakpointe') ON CONFLICT (id) DO NOTHING;
INSERT INTO broker_guide_places (id, project_id, place_type, map_url, cross_streets, address, phone, hours, website, contacts, note, sort_order) VALUES ('22222222-2222-4222-8222-000000000037', '11111111-1111-4111-8111-000000000029', 'Site', 'https://maps.app.goo.gl/a59gNiLZjHs419Pi7', NULL, NULL, NULL, NULL, NULL, NULL, 'Great Gulf', 0) ON CONFLICT (id) DO NOTHING;

INSERT INTO broker_guide_projects (id, city, project_name) VALUES ('11111111-1111-4111-8111-000000000030', 'Oakville', 'YT on Fourth') ON CONFLICT (id) DO NOTHING;
INSERT INTO broker_guide_places (id, project_id, place_type, map_url, cross_streets, address, phone, hours, website, contacts, note, sort_order) VALUES ('22222222-2222-4222-8222-000000000038', '11111111-1111-4111-8111-000000000030', 'Sales office', 'https://maps.app.goo.gl/cAqgFVrU6BN2xgpn7', NULL, '1039 Fourth Line, Milton', '416-949-8906', 'Sat–Sun 11am–4pm', NULL, 'sales@yorktrafalgar.com', NULL, 0) ON CONFLICT (id) DO NOTHING;
INSERT INTO broker_guide_places (id, project_id, place_type, map_url, cross_streets, address, phone, hours, website, contacts, note, sort_order) VALUES ('22222222-2222-4222-8222-000000000039', '11111111-1111-4111-8111-000000000030', 'Site', 'https://maps.app.goo.gl/uzQvw5HwxqdohNuM6', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1) ON CONFLICT (id) DO NOTHING;

