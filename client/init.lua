local FADE_OUT_MS <const> = 1000
local GAME_STREAM_COMPONENT <const> = 18

---@type 'open' | 'closing' | 'closed'
local phase = LocalPlayer.state.LoggedIn and 'closed' or 'open'

local function close()
  if phase ~= 'open' then return end

  phase = 'closing'
  SendLoadingScreenMessage(json.encode({ eventName = 'cobalt:shutdown' }))
  Wait(FADE_OUT_MS)

  ShutdownLoadingScreenNui()
  BusyspinnerOff()
  phase = 'closed'
end

if phase == 'open' then
  ShutdownLoadingScreen()

  CreateThread(function()
    while phase ~= 'closed' do
      HideHudComponentThisFrame(GAME_STREAM_COMPONENT)
      BusyspinnerOff()
      Wait(0)
    end
  end)
end

RegisterNetEvent('cobalt_core:Client:OnPlayerLoaded', close)
