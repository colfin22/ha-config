"""Canonical read helpers for the Energy Flow snapshot.

All live power values are published under ``summary()["flows"]``.  These
helpers provide one supported read contract and preserve ``None`` for genuinely
unavailable evidence instead of silently inventing 0 W.
"""
from __future__ import annotations
from typing import Any

FIELD_ALIASES: dict[str, tuple[str, ...]] = {
    "solar_power": ("solar_power_w", "solar_w", "pv_power_w"),
    "wind_power": ("wind_power_w",),
    "generator_power": ("generator_power_w",),
    "house_power": ("house_power_w", "home_power_w", "home_w", "load_power_w"),
    "grid_import_power": ("grid_import_power_w", "grid_import_w", "import_power_w"),
    "grid_export_power": ("grid_export_power_w", "grid_export_w", "export_power_w"),
    "grid_power": ("grid_power_w",),
    "net_grid_power": ("net_grid_power_w",),
    "battery_power": ("battery_power_w",),
    "net_battery_power": ("net_battery_power_w",),
    "battery_charge_power": ("battery_charge_power_w",),
    "battery_discharge_power": ("battery_discharge_power_w",),
    "ev_power": ("ev_power_w",),
    "heat_pump_power": ("heat_pump_power_w",),
    "water_heater_power": ("water_heater_power_w",),
}

def flow_section(summary: Any) -> dict[str, Any]:
    if not isinstance(summary, dict):
        return {}
    flows=summary.get("flows")
    return flows if isinstance(flows,dict) else summary

def _coerce(value: Any) -> float | None:
    if isinstance(value,dict):
        if value.get("w") is not None:
            return _coerce(value.get("w"))
        if value.get("kw") is not None:
            kw=_coerce(value.get("kw"))
            return kw*1000.0 if kw is not None else None
        return _coerce(value.get("value"))
    if value is None or value == "":
        return None
    try:
        number=float(value)
    except (TypeError,ValueError):
        return None
    return number if number == number else None

def flow_w(summary: Any, field: str, default: float | None=None) -> float | None:
    flows=flow_section(summary)
    if not flows:
        return default
    for key in (field,*FIELD_ALIASES.get(field,())):
        value=_coerce(flows.get(key))
        if value is not None:
            return value
    return default

def flow_soc(summary: Any, default: float | None=None) -> float | None:
    flows=flow_section(summary)
    value=_coerce(flows.get("battery_soc_percent"))
    if value is None:
        value=_coerce(flows.get("battery_soc"))
    return value if value is not None else default

def flow_values(summary: Any, default: float | None=None) -> dict[str,float|None]:
    flows=flow_section(summary)
    return {
        "solar_w": flow_w(flows,"solar_power",default),
        "home_w": flow_w(flows,"house_power",default),
        "grid_import_w": flow_w(flows,"grid_import_power",default),
        "grid_export_w": flow_w(flows,"grid_export_power",default),
        "net_grid_w": flow_w(flows,"net_grid_power",default),
        "battery_charge_w": flow_w(flows,"battery_charge_power",default),
        "battery_discharge_w": flow_w(flows,"battery_discharge_power",default),
        "net_battery_w": flow_w(flows,"net_battery_power",default),
        "battery_soc_percent": flow_soc(flows,default),
    }

__all__=["FIELD_ALIASES","flow_section","flow_soc","flow_values","flow_w"]
