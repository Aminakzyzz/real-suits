import shutil

import cv2
import numpy as np
import pytest
from pydantic import ValidationError

from touchline_vision.identity import IdentityResolver, JerseyReader, MatchRoster


def roster():
    return MatchRoster.model_validate({"home": {"name": "Blue Club", "color": "#0000ff", "players": [{"id": "home-27", "name": "Demo Player", "number": 27}]},
        "away": {"name": "Red Club", "color": "#ff0000", "players": [{"id": "away-27", "name": "Other Player", "number": 27}]}})


def test_identity_requires_independent_repeated_evidence_and_roster_match():
    model = IdentityResolver(roster())
    assert model.vote("track-1", 0, "home", .95, 27, .96) is None
    assert model.vote("track-1", 1000, "home", .95, 27, .96) is None
    result = model.vote("track-1", 2000, "home", .95, 27, .96)
    assert result["playerId"] == "home-27"
    assert result["evidence"]["readings"] == 3
    assert result["evidence"]["firstPtsMs"] == 0
    assert result["evidence"]["lastPtsMs"] == 2000
    for pts in (0, 1000, 2000):
        assert model.vote("track-2", pts, "home", .95, 99, .96) is None


def test_low_quality_duplicates_gaps_and_conflicts_do_not_create_a_name():
    model = IdentityResolver(roster())
    for pts in range(10):
        assert model.vote("duplicate", pts, "home", 1, 27, 1) is None
    for pts in (0, 1000, 2000):
        assert model.vote("weak-kit", pts, "home", .79, 27, 1) is None
        assert model.vote("weak-ocr", pts, "home", 1, 27, .84) is None
    for pts in (0, 1000, 2000):
        model.vote("good", pts, "home", 1, 27, 1)
    assert model.resolve("good", 2000)
    assert model.vote("good", 3000, "home", 1, 72, 1) is None
    assert model.resolve("good", 3000) is None
    assert model.vote("good", 10000, "home", 1, 27, 1) is None
    model.reset()
    assert model.resolve("good", 2000) is None


def test_same_number_is_resolved_with_team_evidence_and_invalid_roster_is_rejected():
    model = IdentityResolver(roster())
    for pts in (0, 1000, 2000):
        result = model.vote("red", pts, "away", 1, 27, 1)
    assert result["playerId"] == "away-27"
    bad = roster().model_dump()
    bad["away"]["players"][0]["id"] = "home-27"
    with pytest.raises(ValidationError):
        MatchRoster.model_validate(bad)
    bad = roster().model_dump()
    bad["away"]["color"] = bad["home"]["color"]
    with pytest.raises(ValidationError):
        MatchRoster.model_validate(bad)
    bad = roster().model_dump()
    bad["home"]["players"][0]["name"] = "Name\nInjected line"
    with pytest.raises(ValidationError):
        MatchRoster.model_validate(bad)


def test_ambiguous_kit_and_small_unreadable_crop_abstain():
    resolver = IdentityResolver(roster())
    ambiguous = np.zeros((80, 80, 3), np.uint8)
    ambiguous[:, :40] = (255, 0, 0)
    ambiguous[:, 40:] = (0, 0, 255)
    assert resolver.classify_kit(ambiguous) is None
    assert JerseyReader().read(np.zeros((10, 10, 3), np.uint8)) is None


@pytest.mark.skipif(not shutil.which("tesseract"), reason="Optional local Tesseract is not installed")
def test_actual_ocr_and_repeated_identity_on_controlled_readable_crop():
    # A synthetic positive control validates the OCR path, not football accuracy.
    frame = np.full((220, 220, 3), (255, 0, 0), np.uint8)
    cv2.putText(frame, "27", (75, 110), cv2.FONT_HERSHEY_SIMPLEX, 1.6, (255, 255, 255), 3, cv2.LINE_AA)
    resolver = IdentityResolver(roster())
    base = {"scene": "wide", "players": [{"trackId": "same", "box": [.15, 0, .85, 1], "confidence": .95, "team": None}]}
    for pts in (0, 1000, 2000):
        result = resolver.observe(frame, {**base, "sourcePtsMs": pts})
    assert result["players"][0]["identity"]["playerId"] == "home-27"
    unreadable = np.full_like(frame, (255, 0, 0))
    assert "identity" not in resolver.observe(unreadable, {**base, "sourcePtsMs": 2500})["players"][0]
    assert "identity" not in resolver.observe(frame, {**base, "scene": "cut", "sourcePtsMs": 3000})["players"][0]


def test_narrator_names_only_an_evidenced_identity_and_never_assigns_possession():
    from touchline_vision.narration import Narrator
    resolver = IdentityResolver(roster())
    for pts in (0, 1000, 2000):
        identity = resolver.vote("track", pts, "home", .95, 27, .96)
    for language in ("en", "es", "fr"):
        event = Narrator(language).consider({"sourcePtsMs": 2000, "observedThroughPtsMs": 2000, "scene": "wide", "ball": None,
            "players": [{"trackId": "track", "identity": identity}]})
        assert event["type"] == "player_identified" and event["actorId"] == "home-27"
        assert "Demo Player" in event["text"] and "27" in event["text"]
        assert not any(word in event["text"].lower() for word in ("scores", "possess", "goal"))
