"""Adds config flow for Eufy RoboVac 11c."""
import voluptuous as vol
from homeassistant import config_entries
from homeassistant.const import CONF_USERNAME, CONF_PASSWORD, CONF_IP_ADDRESS, CONF_NAME
from homeassistant.core import callback
from homeassistant.helpers.aiohttp_client import async_create_clientsession

from .api import EufyRobovac11cApiClient
from .const import DOMAIN, DEFAULT_NAME
from .const import PLATFORMS


class EufyRobovac11cFlowHandler(config_entries.ConfigFlow, domain=DOMAIN):
    """Config flow for eufy_robovac_11c."""

    VERSION = 1
    CONNECTION_CLASS = config_entries.CONN_CLASS_CLOUD_POLL

    def __init__(self):
        """Initialize."""
        self._errors = {}

    async def async_step_user(self, user_input=None):
        """Handle a flow initialized by the user."""
        self._errors = {}

        if user_input is not None:
            valid = await self._test_credentials(
                user_input[CONF_USERNAME],
                user_input[CONF_PASSWORD]
            )
            if valid:
                return self.async_create_entry(
                    title=user_input[CONF_USERNAME], data=user_input
                )
            else:
                self._errors["base"] = "auth"

            return await self._show_config_form(user_input)

        return await self._show_config_form(user_input)

    @staticmethod
    @callback
    def async_get_options_flow(config_entry):
        return EufyRobovac11cOptionsFlowHandler(config_entry)

    async def _show_config_form(self, user_input):  # pylint: disable=unused-argument
        """Show the configuration form to edit location data."""
        return self.async_show_form(
            step_id="user",
            data_schema=vol.Schema({
                vol.Optional(CONF_NAME, default=DEFAULT_NAME): str,
                vol.Required(CONF_USERNAME): str,
                vol.Required(CONF_PASSWORD): str,
                vol.Required(CONF_IP_ADDRESS): str,
            }),
            errors=self._errors,
        )

    async def _test_credentials(self, username, password):
        """Return true if credentials are valid."""
        try:
            session = async_create_clientsession(self.hass)
            client = EufyRobovac11cApiClient(username, password, session)

            response = await client.api_wrapper('post', 'https://home-api.eufylife.com/v1/user/email/login', {
                'client_id': 'eufyhome-app',
                'client_Secret': 'GQCpr9dSp3uQpsOMgJ4xQ',
                'email': username,
                'password': password
            })

            if 'access_token' in response:
                return True

            return False
        except Exception:  # pylint: disable=broad-except
            pass
        return False


class EufyRobovac11cOptionsFlowHandler(config_entries.OptionsFlow):
    """Config flow options handler for eufy_robovac_11c."""

    def __init__(self, config_entry):
        """Initialize HACS options flow."""
        self.config_entry = config_entry
        self.options = dict(config_entry.options)

    async def async_step_init(self, user_input=None):  # pylint: disable=unused-argument
        """Manage the options."""
        return await self.async_step_user()

    async def async_step_user(self, user_input=None):
        """Handle a flow initialized by the user."""
        if user_input is not None:
            self.options.update(user_input)
            return await self._update_options()

        return self.async_show_form(
            step_id="user",
            data_schema=vol.Schema(
                {
                    vol.Required(x, default=self.options.get(x, True)): bool
                    for x in sorted(PLATFORMS)
                }
            ),
        )

    async def _update_options(self):
        """Update config entry options."""
        return self.async_create_entry(
            title=self.config_entry.data.get(CONF_USERNAME), data=self.options
        )
