fx_version 'cerulean'
game 'gta5'
lua54 'yes'
use_experimental_fxv2_oal 'yes'

name 'cobalt_loading'
description 'Cobalt loading screen'
author 'Project Cobalt'
version '1.0.0'

dependency 'ox_lib'

ox_libs { 'locale' }

client_script 'client/init.lua'

server_scripts {
  '@ox_lib/init.lua',
  'server/init.lua',
}

loadscreen '_nui/build/index.html'
loadscreen_cursor 'yes'
loadscreen_manual_shutdown 'yes'

files {
  '_nui/build/index.html',
  '_nui/build/owl.png',
  '_nui/build/cobalt-mark.svg',
  '_nui/build/assets/*',
  '_nui/build/music/*',
}
