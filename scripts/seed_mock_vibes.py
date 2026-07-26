#!/usr/bin/env python3
"""Seed mock DIY + curated vibes across existing venues (idempotent).

Reads NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from
web-app-admin/.env.local (or env). Safe to re-run — clears prior MOCK_SEED_049 rows first.
"""

from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

SEED_TAG = "[WTVA_MOCK_SEED_049]"
MOCK_SLUG_PREFIX = "mock-"

# venue_id substring / exact id → (slot, title, price_cents, window, highlight)
OFFER_BLUEPRINTS: list[dict] = [
    # Brunch / restaurant
    {
        "venue": "ciel-8e849390",
        "slot": "brunch",
        "title": "CIEL Brunch Table",
        "price": 9500,
        "window": "11:00 AM – 2:00 PM",
        "why": "Reserved brunch table with bottomless mimosas energy.",
        "duration": "2.5 Hours",
        "dress": "Brunch chic",
    },
    {
        "venue": "spiveys-famous-bistro-031bd0bc",
        "slot": "brunch",
        "title": "Spivey's Famous Brunch",
        "price": 8500,
        "window": "10:30 AM – 1:30 PM",
        "why": "Classic Houston brunch plate + reserved seating.",
        "duration": "2 Hours",
        "dress": "Casual chic",
    },
    {
        "venue": "juliet-6e5ca777",
        "slot": "brunch",
        "title": "Juliet Midday Table",
        "price": 11000,
        "window": "11:30 AM – 2:30 PM",
        "why": "Elevated restaurant start before the night run.",
        "duration": "2 Hours",
        "dress": "Smart casual",
    },
    {
        "venue": "frnds-ee9b0ca7",
        "slot": "brunch",
        "title": "FRNDS Day Table",
        "price": 9000,
        "window": "12:00 PM – 3:00 PM",
        "why": "Restaurant + lounge hybrid — easy group brunch.",
        "duration": "2.5 Hours",
        "dress": "Stylish casual",
    },
    {
        "venue": "red-rooster-2e49ad6c",
        "slot": "brunch",
        "title": "Red Rooster Brunch Set",
        "price": 8000,
        "window": "11:00 AM – 2:00 PM",
        "why": "Crowd-pleasing brunch before downtown nightlife.",
        "duration": "2 Hours",
        "dress": "Casual",
    },
    # Day / rooftop
    {
        "venue": "privilege-2059577d",
        "slot": "day_party",
        "title": "Privilege Rooftop Day Pass",
        "price": 15000,
        "window": "2:00 PM – 7:00 PM",
        "why": "Rooftop day-party energy with skyline views.",
        "duration": "4 Hours",
        "dress": "Day party / stylish",
    },
    {
        "venue": "reset-e656d361",
        "slot": "day_party",
        "title": "Reset Rooftop Session",
        "price": 14000,
        "window": "3:00 PM – 8:00 PM",
        "why": "Golden-hour rooftop before the main night.",
        "duration": "3.5 Hours",
        "dress": "Trendy casual",
    },
    {
        "venue": "seaside-5eceb313",
        "slot": "day_party",
        "title": "Seaside Day Lounge",
        "price": 13000,
        "window": "1:00 PM – 6:00 PM",
        "why": "Patio / lounge day energy — great bridge stop.",
        "duration": "3 Hours",
        "dress": "Resort casual",
    },
    {
        "venue": "sekai-cc2ddaa7",
        "slot": "day_party",
        "title": "Sekai Day Party",
        "price": 16000,
        "window": "2:00 PM – 7:00 PM",
        "why": "Day-to-night venue — keep the crew moving.",
        "duration": "4 Hours",
        "dress": "Stylish",
    },
    {
        "venue": "xo-lounge-b385861b",
        "slot": "lounge",
        "title": "XO Sky Cocktails",
        "price": 12000,
        "window": "6:00 PM – 10:00 PM",
        "why": "Sky lounge cocktails before prime time.",
        "duration": "2.5 Hours",
        "dress": "Upscale casual",
    },
    # Lounge
    {
        "venue": "love-bar-dbfd9cc6",
        "slot": "lounge",
        "title": "Love Bar Cocktail Hour",
        "price": 10000,
        "window": "7:00 PM – 10:00 PM",
        "why": "Intimate cocktail warm-up before the club.",
        "duration": "2 Hours",
        "dress": "Smart casual",
    },
    {
        "venue": "chapman-kirby-8a0a5ed2",
        "slot": "lounge",
        "title": "Chapman & Kirby Lounge",
        "price": 11500,
        "window": "6:30 PM – 10:00 PM",
        "why": "Polished lounge stop for date night energy.",
        "duration": "2.5 Hours",
        "dress": "Date night",
    },
    {
        "venue": "lounge-2727-1d7f0e1d",
        "slot": "lounge",
        "title": "2727 Lounge Table",
        "price": 12500,
        "window": "8:00 PM – 11:00 PM",
        "why": "Table-focused lounge before late night.",
        "duration": "2.5 Hours",
        "dress": "Upscale",
    },
    {
        "venue": "atlas-24f87ca4",
        "slot": "lounge",
        "title": "Atlas Ultra Lounge",
        "price": 13500,
        "window": "9:00 PM – 12:00 AM",
        "why": "Ultra-lounge bridge into the main event.",
        "duration": "2.5 Hours",
        "dress": "Night upscale",
    },
    {
        "venue": "tipsy-199efc56",
        "slot": "lounge",
        "title": "Tipsy Pre-Game",
        "price": 9000,
        "window": "7:00 PM – 10:00 PM",
        "why": "Easy pre-game lounge for birthday crews.",
        "duration": "2 Hours",
        "dress": "Casual stylish",
    },
    {
        "venue": "the-savoy-61fc7856",
        "slot": "lounge",
        "title": "Savoy Evening Table",
        "price": 14000,
        "window": "8:00 PM – 11:30 PM",
        "why": "Elevated lounge table — luxury without the club crush.",
        "duration": "3 Hours",
        "dress": "Upscale night",
    },
    # Night
    {
        "venue": "dome-6e6192da",
        "slot": "night",
        "title": "Dome Guest List",
        "price": 18000,
        "window": "10:30 PM – 1:30 AM",
        "why": "Prime-time club energy with host walk-in.",
        "duration": "3 Hours",
        "dress": "Nightclub",
    },
    {
        "venue": "dnd-83045850",
        "slot": "night",
        "title": "DND HTX Main Event",
        "price": 20000,
        "window": "11:00 PM – 2:00 AM",
        "why": "Peak Houston nightlife — bottle-ready rooms.",
        "duration": "3 Hours",
        "dress": "Upscale night",
    },
    {
        "venue": "playground-1580b55b",
        "slot": "night",
        "title": "Playground Night Pass",
        "price": 17500,
        "window": "10:00 PM – 1:00 AM",
        "why": "High-energy night stop for girls night / birthday.",
        "duration": "3 Hours",
        "dress": "Club chic",
    },
    {
        "venue": "faces-7bad9361",
        "slot": "night",
        "title": "Faces HTX Night",
        "price": 19000,
        "window": "10:30 PM – 2:00 AM",
        "why": "Packed dance floor + VIP host path.",
        "duration": "3 Hours",
        "dress": "Night out",
    },
    {
        "venue": "victory-0fc23f36",
        "slot": "night",
        "title": "Victory Night Package",
        "price": 18500,
        "window": "10:00 PM – 1:30 AM",
        "why": "Big-room energy for out-of-town crews.",
        "duration": "3 Hours",
        "dress": "Stylish night",
    },
    {
        "venue": "one-night-9871e379",
        "slot": "night",
        "title": "One Night VIP",
        "price": 22000,
        "window": "11:00 PM – 2:00 AM",
        "why": "VIP finish — skip the line, claim the night.",
        "duration": "3 Hours",
        "dress": "Luxury night",
    },
    {
        "venue": "the-domain-5c39a7e0",
        "slot": "night",
        "title": "Domain Night Session",
        "price": 17000,
        "window": "10:00 PM – 1:00 AM",
        "why": "Uptown night stop with easy group logistics.",
        "duration": "3 Hours",
        "dress": "Upscale casual",
    },
    # After hours
    {
        "venue": "bad-habits-acd92521",
        "slot": "after_hours",
        "title": "Bad Habits Afterhours",
        "price": 15000,
        "window": "1:30 AM – 4:00 AM",
        "why": "Keep the night going when everything else closes.",
        "duration": "2.5 Hours",
        "dress": "Night casual",
    },
    {
        "venue": "euphoria-lounge-f8d991bb",
        "slot": "after_hours",
        "title": "Euphoria Late Lounge",
        "price": 14000,
        "window": "1:00 AM – 3:30 AM",
        "why": "Late lounge wind-down (or second wind).",
        "duration": "2 Hours",
        "dress": "Casual night",
    },
]

# Curated packages: slug → metadata + ordered venue_ids matching OFFER_BLUEPRINTS slots
CURATED = [
    {
        "slug": "mock-date-night-houston",
        "title": "Date Night Houston",
        "subtitle": "Brunch → cocktails → night — one checkout.",
        "tagline": "A polished night for two (or four).",
        "template_key": "date_night",
        "vibe_tags": ["Date Night", "Intimate", "Upscale"],
        "featured": True,
        "sort": 10,
        "venues": ["juliet-6e5ca777", "chapman-kirby-8a0a5ed2", "the-savoy-61fc7856"],
        "labels": ["11:30 AM", "7:00 PM", "10:00 PM"],
    },
    {
        "slug": "mock-girls-night-out",
        "title": "Girls Night Out",
        "subtitle": "Day party → lounge → club.",
        "tagline": "Photos, playlists, and zero planning stress.",
        "template_key": "girls_night",
        "vibe_tags": ["Girls Night", "Rooftops", "Club"],
        "featured": True,
        "sort": 11,
        "venues": ["privilege-2059577d", "tipsy-199efc56", "playground-1580b55b"],
        "labels": ["2:00 PM", "7:00 PM", "10:30 PM"],
    },
    {
        "slug": "mock-birthday-celebration",
        "title": "Birthday Celebration",
        "subtitle": "Brunch welcome → lounge → main event.",
        "tagline": "Make the birthday the whole day.",
        "template_key": "birthday",
        "vibe_tags": ["Birthday", "Group", "VIP"],
        "featured": True,
        "sort": 12,
        "venues": ["ciel-8e849390", "atlas-24f87ca4", "dnd-83045850"],
        "labels": ["11:00 AM", "9:00 PM", "11:00 PM"],
    },
    {
        "slug": "mock-luxury-night",
        "title": "Luxury Night",
        "subtitle": "Sky lounge → ultra lounge → VIP finish.",
        "tagline": "Skip the line. Keep the standard high.",
        "template_key": "luxury",
        "vibe_tags": ["Luxury", "VIP", "Rooftops"],
        "featured": True,
        "sort": 13,
        "venues": ["xo-lounge-b385861b", "the-savoy-61fc7856", "one-night-9871e379"],
        "labels": ["6:00 PM", "8:30 PM", "11:00 PM"],
    },
    {
        "slug": "mock-out-of-town-weekend",
        "title": "Out of Town Weekend",
        "subtitle": "Brunch → day party → night → after hours.",
        "tagline": "Houston like a local — four stops, one plan.",
        "template_key": "out_of_town",
        "vibe_tags": ["Visitors", "Full Day", "Nightlife"],
        "featured": False,
        "sort": 14,
        "venues": [
            "spiveys-famous-bistro-031bd0bc",
            "sekai-cc2ddaa7",
            "dome-6e6192da",
            "bad-habits-acd92521",
        ],
        "labels": ["10:30 AM", "2:00 PM", "10:30 PM", "1:30 AM"],
    },
]


def load_env() -> tuple[str, str]:
    url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if url and key:
        return url.rstrip("/"), key
    env_path = Path(__file__).resolve().parents[1] / ".env.local"
    vals: dict[str, str] = {}
    for line in env_path.read_text().splitlines():
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        vals[k.strip()] = v.strip().strip('"').strip("'")
    url = vals.get("NEXT_PUBLIC_SUPABASE_URL")
    key = vals.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        raise SystemExit("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
    return url.rstrip("/"), key


def req(method: str, url: str, key: str, path: str, body=None, prefer: str | None = None):
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
    }
    if prefer:
        headers["Prefer"] = prefer
    data = None if body is None else json.dumps(body).encode()
    request = urllib.request.Request(f"{url}{path}", data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(request) as resp:
            raw = resp.read().decode()
            return resp.status, json.loads(raw) if raw else None
    except urllib.error.HTTPError as e:
        err = e.read().decode()
        raise SystemExit(f"{method} {path} failed ({e.code}): {err}") from e


def main() -> None:
    base, key = load_env()
    print(f"Seeding mock vibes against {base}")

    status, venues = req(
        "GET",
        base,
        key,
        "/rest/v1/venues?select=id,name&order=created_at.asc&limit=200",
    )
    venue_ids = {v["id"] for v in venues or []}
    print(f"Found {len(venue_ids)} venues")

    # Clear prior mock curated packages (stops cascade via FK if ON DELETE CASCADE;
    # night_package_stops references packages with CASCADE).
    status, old_pkgs = req(
        "GET",
        base,
        key,
        f"/rest/v1/night_packages?slug=like.{urllib.parse.quote(MOCK_SLUG_PREFIX + '*')}&select=id,slug",
    )
    # PostgREST like needs * wildcard encoded differently — use ilike
    status, old_pkgs = req(
        "GET",
        base,
        key,
        "/rest/v1/night_packages?slug=like.mock-*&select=id,slug",
    )
    for pkg in old_pkgs or []:
        req("DELETE", base, key, f"/rest/v1/night_package_stops?package_id=eq.{pkg['id']}")
        req("DELETE", base, key, f"/rest/v1/night_packages?id=eq.{pkg['id']}")
        print(f"  removed package {pkg['slug']}")

    # Clear prior mock stop offers
    status, old_offers = req(
        "GET",
        base,
        key,
        f"/rest/v1/package_stop_offers?description=like.*{urllib.parse.quote(SEED_TAG)}*&select=id,title",
    )
    # description filter with * may need *
    status, old_offers = req(
        "GET",
        base,
        key,
        "/rest/v1/package_stop_offers?select=id,title,description&limit=1000",
    )
    mock_ids = [
        o["id"]
        for o in (old_offers or [])
        if SEED_TAG in (o.get("description") or "")
    ]
    if mock_ids:
        # Remove package links first
        for oid in mock_ids:
            req("DELETE", base, key, f"/rest/v1/night_package_stops?stop_offer_id=eq.{oid}")
            req("DELETE", base, key, f"/rest/v1/package_stop_offers?id=eq.{oid}")
        print(f"  removed {len(mock_ids)} prior mock stop offers")

    # Also flip existing Love Bar demo stops into DIY pool for Surprise Me testing
    req(
        "PATCH",
        base,
        key,
        "/rest/v1/package_stop_offers?venue_id=eq.love-bar-dbfd9cc6",
        {"diy_pool": True, "is_active": True},
        prefer="return=minimal",
    )
    print("  marked Love Bar existing stops diy_pool=true")

    offer_id_by_venue: dict[str, str] = {}
    created = 0
    skipped = 0
    for bp in OFFER_BLUEPRINTS:
        vid = bp["venue"]
        if vid not in venue_ids:
            print(f"  skip missing venue {vid}")
            skipped += 1
            continue
        payload = {
            "venue_id": vid,
            "title": bp["title"],
            "description": f"{bp['why']} {SEED_TAG}",
            "slot_type": bp["slot"],
            "price_cents": bp["price"],
            "inclusions": [
                "Reserved experience",
                "Host coordination via WTVA",
                "Listed inclusions honored at arrival",
            ],
            "arrival_window": bp["window"],
            "why_picked": bp["why"],
            "duration_label": bp["duration"],
            "dress_code": bp["dress"],
            "crowd_label": "25–35",
            "contract_accepted": True,
            "contract_accepted_at": "2026-07-25T00:00:00Z",
            "status": "approved",
            "is_active": True,
            "diy_pool": True,
        }
        status, rows = req(
            "POST",
            base,
            key,
            "/rest/v1/package_stop_offers",
            payload,
            prefer="return=representation",
        )
        oid = rows[0]["id"]
        offer_id_by_venue[vid] = oid
        created += 1
        print(f"  + stop {bp['title']} @ {vid}")

    print(f"Created {created} DIY/approved stop offers ({skipped} skipped)")

    for pkg in CURATED:
        stop_ids = []
        labels = []
        for i, vid in enumerate(pkg["venues"]):
            oid = offer_id_by_venue.get(vid)
            if not oid:
                print(f"  warn: missing stop for {vid} in {pkg['slug']}")
                continue
            stop_ids.append(oid)
            labels.append(pkg["labels"][i] if i < len(pkg["labels"]) else None)
        if len(stop_ids) < 2:
            print(f"  skip package {pkg['slug']} — not enough stops")
            continue

        status, rows = req(
            "POST",
            base,
            key,
            "/rest/v1/night_packages",
            {
                "slug": pkg["slug"],
                "title": pkg["title"],
                "subtitle": pkg["subtitle"],
                "description": f"Mock curated vibe for testing. {SEED_TAG}",
                "tagline": pkg["tagline"],
                "why_this_works": "Built from live Houston venues so you can test curated → customize → checkout.",
                "template_key": pkg["template_key"],
                "city": "houston",
                "status": "published",
                "published_at": "2026-07-25T00:00:00Z",
                "party_size_min": 2,
                "party_size_max": 12,
                "is_featured": pkg["featured"],
                "sort_order": pkg["sort"],
                "vibe_tags": pkg["vibe_tags"],
                "perfect_for": ["testing the vibe flow", "groups of 2–10"],
                "not_ideal_for": ["production pricing accuracy"],
                "rating": 4.8,
                "groups_booked": 42,
                "energy_score": 8.5,
                "travel_minutes": 20,
                "crowd_label": "25–35",
                "music_tags": ["Hip-Hop", "R&B", "Afrobeats"],
            },
            prefer="return=representation",
        )
        pkg_id = rows[0]["id"]
        links = [
            {
                "package_id": pkg_id,
                "stop_offer_id": sid,
                "sort_order": i,
                "scheduled_label": labels[i],
            }
            for i, sid in enumerate(stop_ids)
        ]
        req(
            "POST",
            base,
            key,
            "/rest/v1/night_package_stops",
            links,
            prefer="return=minimal",
        )
        print(f"  + curated {pkg['slug']} ({len(stop_ids)} stops)")

    # Summary
    _, diy = req(
        "GET",
        base,
        key,
        "/rest/v1/package_stop_offers?diy_pool=eq.true&is_active=eq.true&select=id",
    )
    _, pkgs = req(
        "GET",
        base,
        key,
        "/rest/v1/night_packages?status=eq.published&select=id,slug,title",
    )
    print("---")
    print(f"DIY pool live stops: {len(diy or [])}")
    print("Published packages:")
    for p in pkgs or []:
        print(f"  - {p['slug']}: {p['title']}")
    print("Done. Test Surprise Me / Build Your Own / Curated Vibes.")


if __name__ == "__main__":
    main()
