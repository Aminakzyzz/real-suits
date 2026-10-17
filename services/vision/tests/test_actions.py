import numpy as np
import pytest

from touchline_vision.actions import BufferedActionProposer


def image(marker=0):
    return np.full((3, 2, 2), marker, np.float32)


class ContextSensitiveModel:
    labels = ("background", "PASS")
    revision = "test-temporal-model"

    def __init__(self):
        self.calls = []

    def predict(self, frames):
        self.calls.append(frames.copy())
        # A genuinely context-sensitive fixture: a future marker would change
        # an offline prediction for the earlier pass. The adapter cannot retract
        # a previously emitted proposal when that marker later arrives.
        scores = np.zeros((len(frames), 2))
        scores[:, 1] = np.where(frames[:, 0, 0, 0] == 2, .95, .05)
        if (frames[:, 0, 0, 0] == 99).any():
            scores[:, 1] = .05
        scores[:, 0] = 1-scores[:, 1]
        return scores


def proposer(model=None, **kwargs):
    return BufferedActionProposer(model or ContextSensitiveModel(), window_frames=8,
        min_frames=5, sample_period_ms=500, update_period_ms=1000,
        confirmation_ms=1000, nms_ms=500, **kwargs)


def test_future_suffix_cannot_change_an_already_emitted_prefix_or_backdate_evidence():
    runs = []
    for suffix in (0, 99):
        engine = proposer()
        returned = []
        for pts in range(0, 2500, 500):
            returned += engine.observe(image(2 if pts == 1000 else 0), pts)
        assert len(returned) == 1
        frozen = returned[0].to_dict()
        for pts in range(2500, 6000, 500):
            returned += engine.observe(image(suffix), pts)
        assert returned[0].to_dict() == frozen
        assert frozen["sourcePtsMs"] == 1000
        assert frozen["observedThroughPtsMs"] == 2000
        assert frozen["confirmationDelayMs"] == 1000
        assert frozen["status"] == "candidate" and frozen["actorId"] is None and frozen["team"] is None
        assert len(returned) == 1
        runs.append(frozen)
    assert runs[0] == runs[1]


def test_cut_gap_and_time_discontinuity_discard_unconfirmed_old_context():
    for reset_kind in ("cut", "gap", "seek"):
        engine = proposer()
        engine.observe(image(2), 0)
        engine.observe(image(), 500)
        pts = {"cut": 1000, "gap": 5000, "seek": 0}[reset_kind]
        assert engine.observe(image(), pts, cut=reset_kind == "cut") == []
        assert len(engine.frames) == 1
        assert engine.frames[0][0] == pts
        for offset in range(500, 3500, 500):
            assert engine.observe(image(), pts+offset) == []


def test_frame_buffer_is_bounded_and_decoder_buffer_reuse_cannot_mutate_history():
    model = ContextSensitiveModel()
    engine = proposer(model)
    reused = image(2)
    engine.observe(reused, 0)
    reused[:] = 0
    for pts in range(500, 20000, 500):
        engine.observe(reused, pts)
        assert len(engine.frames) <= 8
    assert model.calls[0][0, 0, 0, 0] == 2
    assert engine.inference_count < 20


@pytest.mark.parametrize("failure", ["shape", "nan", "negative", "not-normalized"])
def test_invalid_backend_result_fails_explicitly_instead_of_generating_a_claim(failure):
    class Invalid(ContextSensitiveModel):
        def predict(self, frames):
            scores = super().predict(frames)
            if failure == "shape": return scores[:-1]
            if failure == "nan": scores[0, 0] = np.nan
            if failure == "negative": scores[0] = [-.1, 1.1]
            if failure == "not-normalized": scores[0] = [.5, .8]
            return scores
    engine = proposer(Invalid())
    with pytest.raises(ValueError, match="invalid probabilities"):
        for pts in range(0, 2500, 500):
            engine.observe(image(), pts)


def test_unknown_background_and_short_context_do_not_create_actions():
    engine = proposer()
    for pts in range(0, 20000, 500):
        assert engine.observe(image(), pts) == []
    other = proposer()
    for pts in (0, 500, 1000, 1500):
        assert other.observe(image(2), pts) == []
    assert other.inference_count == 0


def test_rejects_invalid_clock_and_unsafe_confirmation_configuration():
    engine = proposer()
    for pts in (-1, .5, True):
        with pytest.raises(ValueError, match="timestamps"):
            engine.observe(image(), pts)
    with pytest.raises(ValueError, match="settings"):
        BufferedActionProposer(ContextSensitiveModel(), confirmation_ms=100, nms_ms=1000)


def test_sampling_clock_does_not_drift_when_video_fps_is_not_divisible_by_sample_rate():
    engine = proposer()
    # A 25 FPS source cannot land exactly on every 500 ms grid point. The first
    # known frame after each due point is valid; accumulating its error is not.
    for pts in range(0, 2001, 40):
        engine.observe(image(), pts)
    assert [pts for pts, _ in engine.frames] == [0, 520, 1000, 1520, 2000]
    assert engine.inference_count == 1
