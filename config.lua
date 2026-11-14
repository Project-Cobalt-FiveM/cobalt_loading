---@class LoadingTip
---@field id string its text is tips.<id> in locales/en.json
---@field key? string

---@class LoadingConfig
---@field serverName string
---@field tips LoadingTip[]
---@field music { volume: number }

---@type LoadingConfig
return {
  -- Text on the loading screen; the tagline, tip texts and labels are in locales/en.json
  serverName = 'Northside Roleplay', -- server name shown as the title
  tips = { -- rotating tips, in this order; each tip's text is tips.<id> in locales/en.json
    { id = 'inventory', key = 'Tab' }, -- key, when set, is shown as a key cap before the text
    { id = 'phone', key = 'M' },
    { id = 'lock', key = 'L' },
  },

  -- Background music
  music = {
    volume = 0.25, -- 0.0 (silent) to 1.0
  },
}
