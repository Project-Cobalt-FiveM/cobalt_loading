local config <const> = require 'config'

AddEventHandler('playerConnecting', function(_, _, deferrals)
  deferrals.handover({
    serverName = config.serverName,
    tips = config.tips,
    music = config.music,
    locales = lib.getLocales(),
  })
end)
