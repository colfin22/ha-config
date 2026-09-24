"""Local, recommendation-only root-cause intelligence for AION EMS Zeus."""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from .flow_access import flow_soc, flow_w


@dataclass(frozen=True)
class RootCauseAssessment:
    primary_cause: str
    secondary_causes: tuple[str, ...]
    confidence_percent: int
    evidence: tuple[str, ...]
    recommended_action: str
    expected_duration: str
    severity: str
    summary: str

    def as_dict(self) -> dict[str, Any]:
        return {
            "primary_cause": self.primary_cause,
            "secondary_causes": list(self.secondary_causes),
            "confidence_percent": self.confidence_percent,
            "evidence": list(self.evidence),
            "recommended_action": self.recommended_action,
            "expected_duration": self.expected_duration,
            "severity": self.severity,
            "summary": self.summary,
            "recommendation_only": True,
            "recorder_safe": True,
        }


class RootCauseIntelligenceEngine:
    """Correlate existing Zeus summaries without polling or controlling devices."""

    def __init__(self, event_bus, core) -> None:
        self.event_bus = event_bus
        self.core = core

    @staticmethod
    def _number(*values: Any) -> float | None:
        for value in values:
            try:
                number = float(value)
            except (TypeError, ValueError):
                continue
            if number == number:
                return number
        return None

    @staticmethod
    def _summary(obj: Any) -> dict[str, Any]:
        try:
            data = obj.summary() or {}
        except Exception:  # defensive: diagnostics must never break the core
            return {}
        return data if isinstance(data, dict) else {}

    def summary(self) -> dict[str, Any]:
        flow = self._summary(self.core.energy_flow)
        forecast = self._summary(self.core.forecast)
        weather = self._summary(self.core.weather)
        quality = self._summary(self.core.data_quality)
        qa = self._summary(self.core.qa_diagnostics)
        runtime = self._summary(self.core.runtime_resilience)

        # Use the canonical Energy Flow accessor. The snapshot stores live power
        # under summary()["flows"][field]["w"], so flat top-level reads can
        # silently turn valid measurements into 0 W.
        solar = flow_w(flow, "solar_power", 0.0) or 0.0
        home = flow_w(flow, "house_power", 0.0) or 0.0
        grid_import = flow_w(flow, "grid_import_power", 0.0) or 0.0
        grid_export = flow_w(flow, "grid_export_power", 0.0) or 0.0
        battery_soc = flow_soc(flow)
        battery_discharge = flow_w(flow, "battery_discharge_power", 0.0) or 0.0

        weather_condition = str(weather.get("condition") or weather.get("state") or "").lower()
        forecast_conf = self._number(forecast.get("confidence_percent"), forecast.get("confidence"))
        quality_score = self._number(quality.get("score"), quality.get("quality_score"))
        qa_errors = int(self._number(qa.get("error_count")) or 0)
        qa_warnings = int(self._number(qa.get("warning_count")) or 0)
        runtime_status = str(runtime.get("status") or "Healthy")

        evidence: list[str] = []
        secondary: list[str] = []
        confidence = 68
        severity = "Information"
        duration = "Until the next material system change"

        if grid_import > 500 and solar < max(250, home * 0.25):
            primary = "Low solar contribution is increasing grid dependence"
            evidence.extend([f"Grid import is {grid_import:.0f} W", f"Solar production is {solar:.0f} W"])
            if home > 1000:
                secondary.append("Household demand is elevated")
                evidence.append(f"Home demand is {home:.0f} W")
            if battery_soc is not None and battery_soc < 25:
                secondary.append("Battery reserve is limited")
                evidence.append(f"Battery SOC is {battery_soc:.0f}%")
            if any(token in weather_condition for token in ("rain", "cloud", "storm", "fog")):
                secondary.append("Weather is suppressing PV production")
                evidence.append(f"Weather condition is {weather_condition.replace('-', ' ')}")
                confidence += 12
                duration = "Likely until weather or daylight improves"
            action = "No control action is taken. Review the forecast and defer flexible loads when practical."
            severity = "Important" if grid_import > 2500 else "Information"
        elif grid_export > 500:
            primary = "Solar surplus is driving grid export"
            evidence.extend([f"Grid export is {grid_export:.0f} W", f"Solar production is {solar:.0f} W"])
            if battery_soc is not None and battery_soc > 90:
                secondary.append("Battery is near full")
                evidence.append(f"Battery SOC is {battery_soc:.0f}%")
            action = "Consider shifting a flexible load into the surplus window if convenient."
            duration = "While solar production remains above local demand"
            confidence += 10
        elif battery_discharge > 300 and grid_import < 150:
            primary = "Battery support is covering household demand"
            evidence.extend([f"Battery discharge is {battery_discharge:.0f} W", "Grid import is minimal"])
            action = "No action required; current battery behaviour is consistent with self-consumption support."
            confidence += 10
        elif qa_errors or qa_warnings >= 3 or (quality_score is not None and quality_score < 70):
            primary = "Data or platform quality is limiting system confidence"
            if qa_errors:
                evidence.append(f"QA reports {qa_errors} error(s)")
            if qa_warnings:
                evidence.append(f"QA reports {qa_warnings} warning(s)")
            if quality_score is not None:
                evidence.append(f"Data quality score is {quality_score:.0f}%")
            secondary.append("Some recommendations may use incomplete evidence")
            action = "Review System Health and correct the highest-priority mapping or platform issue."
            severity = "Critical" if qa_errors else "Important"
            confidence = 88
            duration = "Until the affected mapping or platform issue is resolved"
        else:
            primary = "No material system fault is currently indicated"
            evidence.extend(["Live energy flow is internally consistent", f"Runtime resilience is {runtime_status}"])
            if forecast_conf is not None:
                evidence.append(f"Forecast confidence is {forecast_conf:.0f}%")
            action = "No manual action required. Continue normal monitoring."
            confidence = 82 if forecast_conf is None else int(max(70, min(96, forecast_conf)))

        if quality_score is not None and quality_score >= 85:
            evidence.append(f"Data quality is {quality_score:.0f}%")
            confidence += 4
        confidence = int(max(35, min(98, confidence)))
        summary = primary + (f" Contributing factors: {', '.join(secondary)}." if secondary else ".")
        return RootCauseAssessment(
            primary, tuple(secondary[:3]), confidence, tuple(evidence[:6]), action,
            duration, severity, summary,
        ).as_dict()
