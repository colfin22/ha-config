import asyncio
import logging
from typing import Any

import async_timeout
from homeassistant.components.vacuum import StateVacuumEntity, SUPPORT_BATTERY, SUPPORT_RETURN_HOME, SUPPORT_TURN_ON, \
    SUPPORT_LOCATE, SUPPORT_START, SUPPORT_CLEAN_SPOT, SUPPORT_TURN_OFF, SUPPORT_STOP, SUPPORT_STATUS, \
    SUPPORT_FAN_SPEED
from homeassistant.const import CONF_USERNAME, CONF_PASSWORD, CONF_IP_ADDRESS, CONF_NAME
from homeassistant.exceptions import PlatformNotReady
from robovac import Robovac, get_local_code

from . import DOMAIN
from .entity import EufyRobovac11cEntity

LOGGER = logging.getLogger(__name__)

ATTR_ERROR = 'error'

FAN_SPEED_NORMAL = '0'
FAN_SPEED_MAX = '1'
FAN_SPEEDS = [FAN_SPEED_NORMAL, FAN_SPEED_MAX]


async def async_setup_platform(hass, config, async_add_entities, discovery_info=None):
    coordinator = hass.data[DOMAIN][config.entry_id]

    name = config.get(CONF_NAME)
    ip_address = config.get(CONF_IP_ADDRESS)
    eufy_username = config.get(CONF_USERNAME)
    eufy_password = config.get(CONF_PASSWORD)

    LOGGER.debug('Requesting the local code from Eufy for %s', name)
    local_code = get_local_code(eufy_username, eufy_password, ip_address)

    robovac = Robovac(ip=ip_address, local_code=local_code)

    LOGGER.debug('Connecting to the vacuum at %s', ip_address)
    try:
        with async_timeout.timeout(10):
            await hass.async_add_job(robovac.connect)
    except (asyncio.TimeoutError, OSError):
        raise PlatformNotReady

    vacuum = EufyRobovac11cVacuum(robovac, coordinator, config)
    hass.data[DOMAIN][ip_address] = vacuum

    async_add_entities([vacuum], True)



class EufyRobovac11cVacuum(EufyRobovac11cEntity, StateVacuumEntity):
    robovac: Robovac
    _is_on = False
    _error_code = None
    _status = None

    def __init__(self, robovac, coordinator, config_entry):
        super().__init__(coordinator, config_entry)

        self.robovac = robovac
        self._attr_fan_speed_list = FAN_SPEEDS
        self._attr_supported_features = SUPPORT_BATTERY | SUPPORT_RETURN_HOME | SUPPORT_TURN_ON | SUPPORT_STATUS | SUPPORT_STOP | SUPPORT_TURN_OFF | SUPPORT_CLEAN_SPOT | SUPPORT_START | SUPPORT_LOCATE | SUPPORT_FAN_SPEED

    @property
    def state(self) -> str | None:
        return self._status

    @property
    def state_attributes(self) -> dict[str, Any]:
        attrs = super().state_attributes
        attrs[ATTR_ERROR] = self._error_code

        return attrs

    async def async_start(self) -> None:
        await self.hass.async_add_job(self.robovac.start_auto_clean)

    async def async_turn_on(self, **kwargs: Any) -> None:
        await self.hass.async_add_job(self.robovac.start_auto_clean)

    async def async_turn_off(self, **kwargs: Any) -> None:
        await self.async_stop()
        await self.return_to_base()

    async def async_stop(self, **kwargs: Any) -> None:
        await self.hass.async_add_job(self.robovac.stop)

    async def async_return_to_base(self, **kwargs: Any) -> None:
        await self.hass.async_add_job(self.robovac.go_home)

    async def async_locate(self, **kwargs: Any) -> None:
        await self.hass.async_add_job(self.robovac.start_find_me)

    async def async_set_fan_speed(self, fan_speed: str, **kwargs: Any) -> None:
        if fan_speed.capitalize() in FAN_SPEEDS:
            fan_speed = fan_speed.capitalize()
        else:
            LOGGER.error('No such fan speed available: %s', fan_speed)
            return

        LOGGER.debug('Setting fan speed to %s', fan_speed)
        if fan_speed == FAN_SPEED_NORMAL:
            await self.hass.async_add_job(self.robovac.use_normal_speed)

        if fan_speed == FAN_SPEED_MAX:
            await self.hass.async_add_job(self.robovac.use_max_speed)

    async def async_update(self) -> None:
        try:
            state = self.robovac.get_status()
            LOGGER.debug('Got a new state from the vacuum: %s', state)
            self._attr_available = True

            possible_states = {
                0: 'Stopped',
                1: 'Spot cleaning',
                2: 'Cleaning',
                3: 'Returning to charging base',
                4: 'Edge cleaning',
                5: 'Cleaning single room'
            }

            self._attr_battery_level = state.battery_capacity
            self._attr_fan_speed = state.speed

            if state.charger_status == 1:
                self._status = 'Charging'
            else:
                self._status = possible_states[state.mode]

            self._is_on = state.mode in [1, 2, 4, 5]

            if state.error_code != 0:
                self._error_code = state.error_code

        except Exception as e:
            LOGGER.error('Unable to update RoboVac status: ' + str(e))






