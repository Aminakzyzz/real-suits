"""Evidence-gated roster identity; no names inferred from track IDs.

Configured kit colours and repeated legible jersey readings are experimental
signals. This module does not establish possession, face identity or calibrated
accuracy. It must abstain on ambiguous kits, conflicting digits and camera cuts.
"""
from __future__ import annotations

from collections import Counter, deque
import csv
import io
import re
import shutil
import subprocess

import cv2
import numpy as np
from pydantic import BaseModel, ConfigDict, Field, model_validator


class RosterPlayer(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: str = Field(min_length=1, max_length=80)
    name: str = Field(min_length=1, max_length=100, pattern=r"^[^\x00-\x1f]+$")
    number: int = Field(ge=1, le=99, strict=True)


class RosterTeam(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: str = Field(min_length=1, max_length=100, pattern=r"^[^\x00-\x1f]+$")
    color: str = Field(pattern=r"^#[0-9a-fA-F]{6}$")
    players: list[RosterPlayer] = Field(max_length=30)


class MatchRoster(BaseModel):
    model_config = ConfigDict(extra="forbid")
    home: RosterTeam
    away: RosterTeam

    @model_validator(mode="after")
    def unique_entries(self):
        ids = set()
        for team in (self.home, self.away):
            numbers = set()
            for player in team.players:
                if player.id in ids or player.number in numbers:
                    raise ValueError("Player IDs and each team's shirt numbers must be unique.")
                ids.add(player.id)
                numbers.add(player.number)
        if self.home.color.lower() == self.away.color.lower():
            raise ValueError("Use distinct visible kit colours for the two teams.")
        return self


class JerseyReader:
    """An optional bounded local OCR adapter; small crops remain unknown."""
    def __init__(self, executable: str = "tesseract"):
        self.executable = shutil.which(executable)

    def read(self, torso: np.ndarray) -> tuple[int, float] | None:
        if not self.executable or torso.shape[0] < 48 or torso.shape[1] < 24:
            return None
        gray = cv2.cvtColor(torso, cv2.COLOR_BGR2GRAY)
        if float(gray.std()) < 15:
            return None
        gray = cv2.resize(gray, None, fx=3, fy=3, interpolation=cv2.INTER_CUBIC)
        ok, png = cv2.imencode(".png", gray)
        if not ok:
            return None
        try:
            result = subprocess.run([self.executable, "stdin", "stdout", "-l", "eng", "--psm", "7", "-c", "tessedit_char_whitelist=0123456789", "tsv"],
                input=png.tobytes(), capture_output=True, timeout=2, check=False)
            if result.returncode:
                return None
            tokens = [row for row in csv.DictReader(io.StringIO(result.stdout.decode("utf-8")), delimiter="\t") if row.get("text", "").strip()]
            if len(tokens) != 1:
                return None
            row = tokens[0]
            text, confidence = row["text"].strip(), float(row["conf"])
            if not re.fullmatch(r"[1-9][0-9]?", text) or confidence < 85 or int(row["height"]) < 24 or int(row["width"]) < 12:
                return None
            return int(text), confidence / 100
        except (OSError, subprocess.TimeoutExpired, UnicodeDecodeError, ValueError, KeyError):
            return None


class IdentityResolver:
    def __init__(self, roster: MatchRoster, *, reader: JerseyReader | None = None):
        self.roster = roster
        self.reader = reader or JerseyReader()
        self.history: dict[str, deque] = {}
        self.last_seen: dict[str, int] = {}
        self.previous_pts = -1
        self.targets = []
        for side in ("home", "away"):
            value = getattr(roster, side).color
            rgb = [int(value[i:i+2], 16) for i in (1, 3, 5)]
            lab = cv2.cvtColor(np.array([[rgb[::-1]]], dtype=np.uint8), cv2.COLOR_BGR2LAB)[0, 0].astype(float)
            self.targets.append(lab)

    def reset(self):
        self.history.clear()
        self.last_seen.clear()
        self.previous_pts = -1

    def classify_kit(self, torso: np.ndarray) -> tuple[str, float] | None:
        if torso.size == 0:
            return None
        lab = cv2.cvtColor(cv2.resize(torso, (24, 32)), cv2.COLOR_BGR2LAB).reshape(-1, 3).astype(float)
        fractions = []
        for target in self.targets:
            delta = lab-target
            delta[:, 0] *= .5  # Moderate shadows without ignoring colour/chroma.
            fractions.append(float((np.linalg.norm(delta, axis=1) < 32).mean()))
        best = int(np.argmax(fractions))
        if fractions[best] < .80 or fractions[best]-fractions[1-best] < .30:
            return None
        return ("home", "away")[best], fractions[best]

    def vote(self, track_id: str, pts: int, team: str, team_confidence: float, number: int, ocr_confidence: float) -> dict | None:
        if team not in ("home", "away") or team_confidence < .8 or ocr_confidence < .85:
            return None
        history = self.history.setdefault(track_id, deque(maxlen=8))
        if history and (pts < history[-1][0] or pts-history[-1][0] > 3000):
            history.clear()
        if history and pts-history[-1][0] < 400:
            return self.resolve(track_id, pts)
        history.append((pts, team, number, team_confidence, ocr_confidence))
        return self.resolve(track_id, pts)

    def resolve(self, track_id: str, pts: int) -> dict | None:
        history = self.history.get(track_id)
        if not history or pts-history[-1][0] > 3000:
            return None
        readings = [r for r in history if 0 <= pts-r[0] <= 12000]
        if not readings:
            return None
        key, count = Counter((r[1], r[2]) for r in readings).most_common(1)[0]
        support = [r for r in readings if (r[1], r[2]) == key]
        # Contradictory fresh evidence immediately withdraws an old identity.
        if count < 3 or count/len(readings) < .8 or support[-1][0]-support[0][0] < 1200 or (readings[-1][1], readings[-1][2]) != key:
            return None
        team, number = key
        player = next((p for p in getattr(self.roster, team).players if p.number == number), None)
        if not player:
            return None
        return {"playerId": player.id, "name": player.name, "number": number, "team": team,
            "evidence": {"method": "configured-kit+repeated-jersey-ocr", "readings": count, "firstPtsMs": support[0][0], "lastPtsMs": support[-1][0],
                "teamScore": min(r[3] for r in support), "ocrScore": min(r[4] for r in support)}}

    def observe(self, image: np.ndarray, observation: dict) -> dict:
        pts = observation["sourcePtsMs"]
        if observation["scene"] == "cut" or pts <= self.previous_pts:
            self.reset()
        self.previous_pts = pts
        self.history = {key: history for key, history in self.history.items() if history and pts-history[-1][0] <= 12000}
        height, width = image.shape[:2]
        players = [dict(player) for player in observation["players"]]
        eligible = []
        for player in players:
            box = player["box"]
            left, top, right, bottom = [int(value*(width if i % 2 == 0 else height)) for i, value in enumerate(box)]
            person_width, person_height = right-left, bottom-top
            # The test is in original pixels. Upscaling a tiny crop does not
            # make its shirt number legible.
            if person_height < 112 or person_width < 40:
                continue
            crop = image[max(0, top+int(person_height*.15)):min(height, top+int(person_height*.65)),
                max(0, left+int(person_width*.15)):min(width, right-int(person_width*.15))]
            kit = self.classify_kit(crop)
            if kit is not None:
                player["team"], player["teamConfidence"] = kit
                eligible.append((player, crop, kit))
        # A bounded, rotating OCR budget prevents 22 expensive processes per frame.
        eligible.sort(key=lambda entry: self.last_seen.get(str(entry[0]["trackId"]), -1))
        for player, crop, kit in eligible[:2]:
            track_id = str(player["trackId"])
            self.last_seen[track_id] = pts
            reading = self.reader.read(crop)
            if reading:
                self.vote(track_id, pts, kit[0], kit[1], reading[0], reading[1])
        # Remove disappeared tracks from scheduling state as well as evidence.
        active = {str(player["trackId"]) for player in players}
        self.last_seen = {key: value for key, value in self.last_seen.items() if key in active}
        for player in players:
            track_id = str(player["trackId"])
            identity = self.resolve(track_id, pts)
            history = self.history.get(track_id)
            # Current legible evidence is mandatory: a fragile image-space track
            # must not carry a person's name through an unreadable view or cut.
            fresh = history and history[-1][0] == pts
            if identity and fresh and player.get("team") == identity["team"]:
                player["identity"] = identity
        counts = Counter(p["identity"]["playerId"] for p in players if "identity" in p)
        for player in players:
            if "identity" in player and counts[player["identity"]["playerId"]] > 1:
                del player["identity"]
        return {**observation, "players": players, "identityEnabled": True}
