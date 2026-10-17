"""Grounded observation narration: explicit, conservative and past-only.

This first adapter reports visible play. It deliberately cannot promote scores,
names, referee decisions or career facts from a generic object detector.
"""
from __future__ import annotations
import uuid


class Narrator:
    def __init__(self, language: str):
        self.language = language
        self.last_spoken_ms = -10000
        self.previous_ball: tuple[float, float] | None = None
        self.last_type: str | None = None
        self.introduced_players: set[str] = set()

    def consider(self, observation: dict) -> dict | None:
        now = observation["sourcePtsMs"]
        if observation["scene"] == "cut":
            self.previous_ball = None
        ball = observation.get("ball")
        position = ((ball["box"][0] + ball["box"][2])/2, (ball["box"][1] + ball["box"][3])/2) if ball else None
        previous = self.previous_ball
        self.previous_ball = position
        if now-self.last_spoken_ms < 8000:
            return None
        identified = next((p["identity"] for p in observation["players"] if p.get("identity") and p["identity"]["playerId"] not in self.introduced_players), None)
        if identified:
            number, name = identified["number"], identified["name"]
            text = {"en": f"Number {number}, {name}, is in view.", "es": f"El número {number}, {name}, está a la vista.", "fr": f"Le numéro {number}, {name}, est à l'image."}[self.language]
            self.introduced_players.add(identified["playerId"])
            self.last_type, self.last_spoken_ms = "player_identified", now
            return {"id": uuid.uuid4().hex, "sourcePtsMs": now, "observedThroughPtsMs": observation["observedThroughPtsMs"], "type": "player_identified",
                "actorId": identified["playerId"], "team": identified["team"], "text": text,
                "confidence": min(identified["evidence"]["teamScore"], identified["evidence"]["ocrScore"]), "identityEvidence": identified["evidence"]}
        count = len(observation["players"])
        direction = None
        if position and previous and observation["scene"] != "cut":
            delta = position[0]-previous[0]
            if abs(delta) > .06:
                direction = "right" if delta > 0 else "left"
        kind = "ball_movement" if direction else "ball_visible" if ball else "wide_play" if count >= 5 else "camera_view"
        if kind == self.last_type and now-self.last_spoken_ms < 16000:
            return None
        # Screen coordinates are not pitch coordinates or tactical attack direction.
        messages = {
            "en": {
                "ball_movement": f"The ball moves across the picture to the {direction}.",
                "ball_visible": "The ball is visible again. We follow the play.",
                "wide_play": "A wider view of the action. The players are spread across the picture.",
                "camera_view": "A closer view now. We wait for a clear view of the play.",
            },
            "es": {
                "ball_movement": "El balón se mueve hacia la derecha de la imagen." if direction == "right" else "El balón se mueve hacia la izquierda de la imagen.",
                "ball_visible": "El balón vuelve a estar visible. Seguimos la jugada.",
                "wide_play": "Una vista más amplia de la acción. Los jugadores se distribuyen por la imagen.",
                "camera_view": "Un plano más cercano. Esperamos una vista clara de la jugada.",
            },
            "fr": {
                "ball_movement": "Le ballon se déplace vers la droite de l'image." if direction == "right" else "Le ballon se déplace vers la gauche de l'image.",
                "ball_visible": "Le ballon est à nouveau visible. Nous suivons le jeu.",
                "wide_play": "Une vue plus large de l'action. Les joueurs se répartissent dans l'image.",
                "camera_view": "Un plan plus rapproché. Nous attendons une vue claire du jeu.",
            },
        }
        # Remain silent if no useful visual evidence exists; a human-free run must
        # not turn decoder frames with no people into fabricated football action.
        if not count and not ball:
            return None
        self.last_type, self.last_spoken_ms = kind, now
        return {"id": uuid.uuid4().hex, "sourcePtsMs": now, "observedThroughPtsMs": observation["observedThroughPtsMs"],
                "type": kind, "team": None, "actorId": None, "text": messages[self.language][kind],
                "confidence": ball["confidence"] if ball else min((p["confidence"] for p in observation["players"]), default=0.)}
